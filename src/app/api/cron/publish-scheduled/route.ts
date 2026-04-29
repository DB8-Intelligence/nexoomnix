// Vercel Cron worker — publica posts agendados cujo scheduled_for venceu.
//
// Fluxo por post:
//   1. Busca scheduled_posts com status='scheduled' e scheduled_for <= now()
//      (e next_attempt_at NULL ou <= now(), pra respeitar backoff de retries).
//   2. Marca como 'publishing' (race-safe: UPDATE ... WHERE status='scheduled').
//   3. Chama publishToMeta. Em sucesso, marca 'published' + platform_post_id.
//   4. Em falha transiente: incrementa attempts, marca next_attempt_at
//      (backoff exponencial 5min → 25min → 2h). Se attempts >= max_attempts,
//      marca como 'failed' definitivo.
//
// Segurança: header Authorization: Bearer {CRON_SECRET}. Vercel Cron envia
// automaticamente quando configurado no vercel.json.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publishToMeta, type MetaConnection } from '@/lib/meta/publish-to-graph'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BACKOFF_MINUTES = [5, 25, 120] as const

interface PostRow {
  id: string
  connection_id: string | null
  caption: string | null
  media_urls: string[] | null
  media_type: string | null
  attempts: number
  max_attempts: number
}

interface ConnectionRow {
  id: string
  platform: string
  account_id: string
  access_token: string
  page_access_token: string | null
  is_active: boolean
}

export async function GET(req: NextRequest) {
  // Vercel Cron envia "Authorization: Bearer <CRON_SECRET>" automaticamente
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const nowIso = new Date().toISOString()

  const { data: due, error: fetchError } = await supabase
    .from('scheduled_posts')
    .select('id, connection_id, caption, media_urls, media_type, attempts, max_attempts')
    .eq('status', 'scheduled')
    .lte('scheduled_for', nowIso)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
    .order('scheduled_for', { ascending: true })
    .limit(20)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const rows = (due ?? []) as PostRow[]
  const results: { id: string; outcome: 'published' | 'retrying' | 'failed' | 'skipped'; message?: string }[] = []

  for (const post of rows) {
    // Claim (race-safe). Se outra instância já pegou, pula.
    const { data: claimed } = await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing', updated_at: nowIso })
      .eq('id', post.id)
      .eq('status', 'scheduled')
      .select('id')
      .maybeSingle()

    if (!claimed) {
      results.push({ id: post.id, outcome: 'skipped', message: 'Already claimed' })
      continue
    }

    if (!post.connection_id || !post.caption || !post.media_urls?.length) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: 'Post sem connection/caption/media' })
        .eq('id', post.id)
      results.push({ id: post.id, outcome: 'failed', message: 'Missing data' })
      continue
    }

    const { data: connection } = await supabase
      .from('social_media_connections')
      .select('id, platform, account_id, access_token, page_access_token, is_active')
      .eq('id', post.connection_id)
      .maybeSingle() as { data: ConnectionRow | null }

    if (!connection || !connection.is_active) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: 'Conexão inativa ou removida' })
        .eq('id', post.id)
      results.push({ id: post.id, outcome: 'failed', message: 'Connection inactive' })
      continue
    }

    const metaConnection: MetaConnection = {
      platform: connection.platform,
      account_id: connection.account_id,
      access_token: connection.access_token,
      page_access_token: connection.page_access_token,
    }

    try {
      const { platformPostId, permalink } = await publishToMeta(metaConnection, {
        caption: post.caption,
        mediaUrls: post.media_urls,
        mediaType: (post.media_type ?? 'image') as 'image' | 'video' | 'carousel' | 'reel',
      })

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          platform_post_id: platformPostId,
          platform_permalink: permalink,
          attempts: post.attempts + 1,
          next_attempt_at: null,
          error_message: null,
        })
        .eq('id', post.id)

      await supabase
        .from('social_media_connections')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', connection.id)

      results.push({ id: post.id, outcome: 'published' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      const nextAttempts = post.attempts + 1
      const isFinal = nextAttempts >= post.max_attempts

      if (isFinal) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            attempts: nextAttempts,
            error_message: message,
            next_attempt_at: null,
          })
          .eq('id', post.id)
        results.push({ id: post.id, outcome: 'failed', message })
      } else {
        const minutes = BACKOFF_MINUTES[Math.min(nextAttempts - 1, BACKOFF_MINUTES.length - 1)]
        const nextAttemptAt = new Date(Date.now() + minutes * 60_000).toISOString()
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'scheduled',
            attempts: nextAttempts,
            next_attempt_at: nextAttemptAt,
            error_message: message,
          })
          .eq('id', post.id)
        results.push({ id: post.id, outcome: 'retrying', message: `next in ${minutes}m: ${message}` })
      }
    }
  }

  return NextResponse.json({
    scanned: rows.length,
    results,
    timestamp: nowIso,
  })
}
