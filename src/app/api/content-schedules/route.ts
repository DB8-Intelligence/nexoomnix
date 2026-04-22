import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?: string
    topic_hint?: string
    frequency?: Frequency
    days_of_week?: number[]
    hour_of_day?: number
    timezone?: string
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 })
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
    .from('content_schedules')
    .insert({
      tenant_id:    profile.tenant_id,
      user_id:      user.id,
      name:         body.name.trim(),
      topic_hint:   body.topic_hint?.trim() || null,
      frequency:    body.frequency ?? 'weekly',
      days_of_week: body.days_of_week ?? [1, 3, 5],
      hour_of_day:  body.hour_of_day ?? 9,
      timezone:     body.timezone ?? 'America/Bahia',
      is_active:    true,
      next_run_at:  new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}
