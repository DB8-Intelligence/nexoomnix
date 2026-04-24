import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'

interface ScheduleRequest {
  connectionId: string
  caption: string
  mediaUrls: string[]
  mediaType: 'image' | 'video' | 'carousel' | 'reel'
  hashtags?: string[]
  scheduledFor: string    // ISO timestamp
  reelCreatorContent?: Record<string, unknown>
}

// POST — agendar post para publicação futura
export async function POST(req: Request) {
  // Preserva mensagem original em inglês no 401
  const ctx = await requireTenantWithRow({ unauthorizedMessage: 'Unauthorized' })
  if (ctx instanceof NextResponse) return ctx

  // Gate de plano específico desta rota
  if (!['pro_max', 'enterprise'].includes(ctx.tenant.plan)) {
    return NextResponse.json(
      { error: 'Esta funcionalidade requer o plano PRO MAX ou superior.' },
      { status: 403 }
    )
  }

  const body: ScheduleRequest = await req.json()
  const { connectionId, caption, mediaUrls, mediaType, hashtags = [], scheduledFor, reelCreatorContent } = body

  if (!connectionId || !caption || !mediaUrls?.length || !scheduledFor) {
    return NextResponse.json(
      { error: 'connectionId, caption, mediaUrls e scheduledFor são obrigatórios' },
      { status: 400 }
    )
  }

  // Validar que a data é futura (mínimo 10 minutos)
  const scheduleDate = new Date(scheduledFor)
  if (scheduleDate.getTime() < Date.now() + 10 * 60 * 1000) {
    return NextResponse.json(
      { error: 'O agendamento deve ser pelo menos 10 minutos no futuro.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Verificar conexão
  const { data: connection } = await supabase
    .from('social_media_connections')
    .select('id')
    .eq('id', connectionId)
    .eq('is_active', true)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Conexão não encontrada ou inativa' }, { status: 404 })
  }

  const fullCaption = hashtags.length
    ? `${caption}\n\n${hashtags.join(' ')}`
    : caption

  const { data: post, error: postError } = await supabase
    .from('scheduled_posts')
    .insert({
      tenant_id: ctx.tenantId,
      user_id: ctx.user.id,
      connection_id: connectionId,
      caption: fullCaption,
      media_urls: mediaUrls,
      media_type: mediaType,
      hashtags,
      status: 'scheduled',
      scheduled_for: scheduleDate.toISOString(),
      reel_creator_content: reelCreatorContent ?? null,
    })
    .select()
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Erro ao agendar post' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    postId: post.id,
    scheduledFor: post.scheduled_for,
  })
}

// GET — listar posts agendados do tenant
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: posts, error: dbError } = await supabase
    .from('scheduled_posts')
    .select(`
      id, caption, media_type, status, scheduled_for, published_at,
      platform_permalink, error_message, created_at,
      social_media_connections(platform, account_name, account_username)
    `)
    .in('status', ['scheduled', 'publishing', 'published', 'failed'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ posts: posts ?? [] })
}
