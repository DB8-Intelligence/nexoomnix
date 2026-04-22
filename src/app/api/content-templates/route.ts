import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const format = req.nextUrl.searchParams.get('format')
  const activeOnly = req.nextUrl.searchParams.get('active') !== 'false'

  let query = supabase
    .from('content_templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (format) query = query.eq('format', format)
  if (activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?: string
    description?: string
    image_url?: string
    format?: 'feed' | 'story' | 'reel_cover'
    source?: 'upload' | 'canva' | 'external'
    canva_url?: string
    niche?: string
  }

  if (!body.name?.trim() || !body.image_url?.trim()) {
    return NextResponse.json({ error: 'name e image_url são obrigatórios' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Profile sem tenant' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_templates')
    .insert({
      tenant_id:   profile.tenant_id,
      name:        body.name.trim(),
      description: body.description?.trim() || null,
      image_url:   body.image_url.trim(),
      format:      body.format ?? 'feed',
      source:      body.source ?? 'upload',
      canva_url:   body.canva_url?.trim() || null,
      niche:       body.niche || null,
      is_active:   true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}
