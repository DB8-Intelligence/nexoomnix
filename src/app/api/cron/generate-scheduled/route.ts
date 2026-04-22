// Vercel Cron worker — autopilot end-to-end.
//
// Roda diariamente. Pra cada content_schedule ativo com next_run_at <= now(),
// gera UM post completo (texto + imagem composta) e, se o tenant tiver
// template no pool + Meta connection ativa, já cria o scheduled_post pronto
// pra ser publicado pelo /api/cron/publish-scheduled no slot calculado.
//
// Quando falta template OU Meta connection, o fluxo cai pra rascunho —
// content_project status='draft', tenant recebe notificação, completa
// manualmente.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAutopilotPostPrompt } from '@/lib/content-ai/prompts'
import { loadBrandingContext } from '@/lib/content-ai/branding-context'
import { composePostUrl } from '@/lib/content-ai/compose-url'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FREQUENCY_HOURS: Record<string, number> = {
  daily:    24,
  '5x_week': 33, // ~5 vezes em 7 dias
  '3x_week': 56, // ~3 vezes em 7 dias
  weekly:   168,
}

interface ScheduleRow {
  id: string
  tenant_id: string
  user_id: string
  name: string
  topic_hint: string | null
  frequency: string
  template_ids: string[] | null
  hour_of_day: number
  timezone: string
}

// Calcula o próximo timestamp UTC correspondente a `hour:00` no `timezone`.
// Se o horário já passou hoje, pula pra amanhã.
function nextSlotUtc(hour: number, timezone: string): Date {
  const nowUtc = new Date()
  const nowLocal = toZonedTime(nowUtc, timezone)
  const slotLocal = new Date(nowLocal)
  slotLocal.setHours(hour, 0, 0, 0)
  if (slotLocal.getTime() <= nowLocal.getTime()) {
    slotLocal.setDate(slotLocal.getDate() + 1)
  }
  return fromZonedTime(slotLocal, timezone)
}

interface GeneratedPost {
  title: string
  post_text: string
  caption: string
  hashtags: string[]
  ctas: { text: string; type: string; value: string }[]
  image_concept: string
}

async function getUsageCount(supabase: SupabaseClient, id: string): Promise<number> {
  const { data } = await supabase
    .from('content_templates')
    .select('usage_count')
    .eq('id', id)
    .maybeSingle()
  return (data?.usage_count as number | undefined) ?? 0
}

async function generateOneDraft(
  supabase: SupabaseClient,
  anthropic: Anthropic,
  schedule: ScheduleRow,
): Promise<{ ok: boolean; message?: string; projectId?: string; scheduledPostId?: string | null }> {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, niche')
    .eq('id', schedule.tenant_id)
    .single()

  if (!tenant) return { ok: false, message: 'Tenant não encontrado' }

  const branding = await loadBrandingContext(supabase, schedule.tenant_id)
  const prompt = buildAutopilotPostPrompt(
    tenant.niche ?? 'negócio',
    tenant.name ?? 'Negócio',
    schedule.topic_hint,
    branding,
  )

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  let generated: GeneratedPost
  try {
    generated = JSON.parse(text) as GeneratedPost
  } catch {
    return { ok: false, message: 'Resposta da IA não é JSON válido' }
  }

  // Seleciona template do pool do schedule (aleatório) se houver.
  let pickedTemplateUrl: string | null = null
  let pickedTemplateId: string | null = null
  if (schedule.template_ids && schedule.template_ids.length > 0) {
    const pick = schedule.template_ids[Math.floor(Math.random() * schedule.template_ids.length)]
    const { data: tpl } = await supabase
      .from('content_templates')
      .select('id, image_url')
      .eq('id', pick)
      .eq('is_active', true)
      .maybeSingle()
    if (tpl) {
      pickedTemplateUrl = tpl.image_url
      pickedTemplateId = tpl.id
      // Incremento best-effort — não bloqueia o fluxo em caso de falha.
      await supabase
        .from('content_templates')
        .update({ usage_count: (await getUsageCount(supabase, tpl.id)) + 1 })
        .eq('id', tpl.id)
    }
  }

  const { data: project, error: projError } = await supabase
    .from('content_projects')
    .insert({
      tenant_id:           schedule.tenant_id,
      user_id:             schedule.user_id,
      schedule_id:         schedule.id,
      title:               generated.title,
      nicho:               tenant.niche,
      formato:             'post',
      status:              'draft',
      generated_post_text: generated.post_text,
      generated_caption:   generated.caption,
      generated_hashtags:  generated.hashtags,
      generated_ctas:      generated.ctas,
      generated_images:    pickedTemplateUrl ? [{ url: pickedTemplateUrl, template_id: pickedTemplateId }] : null,
      source_description:  schedule.topic_hint ?? null,
      analysis: {
        title: generated.title,
        hook: generated.post_text,
        cta: generated.ctas[0]?.text ?? '',
        key_messages: [generated.post_text],
        tone: branding?.tone ?? 'casual',
        suggested_format: 'post',
        target_audience: branding?.audience ?? '',
        scenes: [
          { id: 1, description: generated.image_concept, duration_sec: 3, image_prompt: generated.image_concept },
        ],
      },
    })
    .select('id')
    .single()

  if (projError || !project) {
    return { ok: false, message: projError?.message ?? 'Falha ao criar content_project' }
  }

  // Tentar fechar o loop autopilot: se tem template + Meta connection ativa,
  // cria o scheduled_post já agendado pro próximo slot.
  let scheduledPostId: string | null = null
  if (pickedTemplateUrl) {
    const { data: connection } = await supabase
      .from('social_media_connections')
      .select('id')
      .eq('tenant_id', schedule.tenant_id)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()

    if (connection) {
      const slot = nextSlotUtc(schedule.hour_of_day, schedule.timezone)
      const composedUrl = composePostUrl({
        bg:     pickedTemplateUrl,
        text:   generated.post_text,
        cta:    generated.ctas[0]?.text,
        brand:  tenant.name,
        color:  null,
        format: 'feed',
      })

      const fullCaption = generated.hashtags.length
        ? `${generated.caption}\n\n${generated.hashtags.join(' ')}`
        : generated.caption

      const { data: scheduledPost } = await supabase
        .from('scheduled_posts')
        .insert({
          tenant_id:     schedule.tenant_id,
          user_id:       schedule.user_id,
          connection_id: connection.id,
          caption:       fullCaption,
          media_urls:    [composedUrl],
          media_type:    'image',
          hashtags:      generated.hashtags,
          status:        'scheduled',
          scheduled_for: slot.toISOString(),
        })
        .select('id')
        .single()

      if (scheduledPost) {
        scheduledPostId = scheduledPost.id
        await supabase
          .from('content_projects')
          .update({ status: 'scheduled' })
          .eq('id', project.id)
      }
    }
  }

  // Notifica o tenant
  const notificationTitle = scheduledPostId
    ? 'Post agendado automaticamente'
    : 'Novo rascunho de post pronto'
  const notificationMsg = scheduledPostId
    ? `"${generated.title}" — será publicado automaticamente. Cancele/edite se precisar.`
    : `"${generated.title}" — do schedule "${schedule.name}". Revise e publique.`

  await supabase.from('notifications').insert({
    tenant_id:  schedule.tenant_id,
    profile_id: schedule.user_id,
    title:      notificationTitle,
    message:    notificationMsg,
    type:       'ia',
    link:       `/conteudo/${project.id}`,
  })

  return { ok: true, projectId: project.id, scheduledPostId }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY missing' }, { status: 500 })
  }

  const supabase = await createServiceClient()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const nowIso = new Date().toISOString()

  const { data: due, error } = await supabase
    .from('content_schedules')
    .select('id, tenant_id, user_id, name, topic_hint, frequency, template_ids, hour_of_day, timezone')
    .eq('is_active', true)
    .lte('next_run_at', nowIso)
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schedules = (due ?? []) as ScheduleRow[]
  const results: { id: string; ok: boolean; message?: string; projectId?: string; scheduledPostId?: string | null }[] = []

  for (const schedule of schedules) {
    try {
      const result = await generateOneDraft(supabase, anthropic, schedule)
      results.push({ id: schedule.id, ...result })

      const hours = FREQUENCY_HOURS[schedule.frequency] ?? 168
      const nextRunAt = new Date(Date.now() + hours * 3600_000).toISOString()
      await supabase
        .from('content_schedules')
        .update({ last_run_at: nowIso, next_run_at: nextRunAt })
        .eq('id', schedule.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      results.push({ id: schedule.id, ok: false, message })
    }
  }

  return NextResponse.json({ scanned: schedules.length, results, timestamp: nowIso })
}
