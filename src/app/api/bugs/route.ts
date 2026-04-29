// Endpoint público (user autenticado) pra reportar bug.
// Qualquer user pode criar. Leitura/edição é via /api/admin/bugs (staff-only).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyBugWebhook } from '@/lib/debug/webhook'

type Severity = 'low' | 'medium' | 'high' | 'critical'

interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

interface FetchTrace {
  method: string
  url: string
  status?: number
  durationMs?: number
  timestamp: number
  error?: string
}

const MAX_DESCRIPTION = 5000
const MAX_LOGS = 30
const MAX_TRACES = 20

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    description?: string
    url?: string
    user_agent?: string
    viewport_w?: number
    viewport_h?: number
    console_logs?: ConsoleLog[]
    fetch_traces?: FetchTrace[]
    selector?: string
    element_html?: string
    screenshot_url?: string
    replay_url?: string
    severity?: Severity
  }

  if (!body.description?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: 'description e url são obrigatórios' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('bug_reports')
    .insert({
      tenant_id:      profile?.tenant_id ?? null,
      user_id:        user.id,
      reporter_email: user.email ?? null,
      description:    body.description.trim().slice(0, MAX_DESCRIPTION),
      url:            body.url.trim().slice(0, 2000),
      user_agent:     body.user_agent?.slice(0, 500) ?? null,
      viewport_w:     body.viewport_w ?? null,
      viewport_h:     body.viewport_h ?? null,
      console_logs:   Array.isArray(body.console_logs) ? body.console_logs.slice(-MAX_LOGS) : [],
      fetch_traces:   Array.isArray(body.fetch_traces) ? body.fetch_traces.slice(-MAX_TRACES) : [],
      selector:       body.selector?.slice(0, 500) ?? null,
      element_html:   body.element_html?.slice(0, 5000) ?? null,
      screenshot_url: body.screenshot_url ?? null,
      replay_url:     body.replay_url ?? null,
      severity:       body.severity ?? 'medium',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Webhook opcional (Slack/Discord/generic) — best-effort, não bloqueia o cliente.
  notifyBugWebhook({
    id:          data.id,
    description: body.description!.trim(),
    severity:    body.severity ?? 'medium',
    url:         body.url!.trim(),
    reporter:    user.email ?? null,
  }).catch(err => console.warn('[bugs] webhook failed:', err))

  return NextResponse.json({ id: data.id })
}
