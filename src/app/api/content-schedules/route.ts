import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

type Frequency = 'daily' | '3x_week' | '5x_week' | 'weekly'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('content_schedules')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data ?? [] })
}

export async function POST(req: NextRequest) {
  // Preserva os códigos/mensagens originais: 401 "Unauthorized" e 400 "Profile sem tenant"
  const ctx = await requireTenant({
    unauthorizedMessage: 'Unauthorized',
    tenantMissingStatus: 400,
    tenantMissingMessage: 'Profile sem tenant',
  })
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json() as {
    name?: string
    topic_hint?: string
    frequency?: Frequency
    days_of_week?: number[]
    hour_of_day?: number
    timezone?: string
    format?: 'feed' | 'reel'
    duration_sec?: 15 | 30 | 60
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_schedules')
    .insert({
      tenant_id:    ctx.tenantId,
      user_id:      ctx.user.id,
      name:         body.name.trim(),
      topic_hint:   body.topic_hint?.trim() || null,
      frequency:    body.frequency ?? 'weekly',
      days_of_week: body.days_of_week ?? [1, 3, 5],
      hour_of_day:  body.hour_of_day ?? 9,
      timezone:     body.timezone ?? 'America/Bahia',
      format:       body.format ?? 'feed',
      duration_sec: body.duration_sec ?? 15,
      is_active:    true,
      next_run_at:  new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
