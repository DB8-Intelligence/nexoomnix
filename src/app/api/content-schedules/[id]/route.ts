import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    name?: string
    topic_hint?: string | null
    frequency?: 'daily' | '3x_week' | '5x_week' | 'weekly'
    days_of_week?: number[]
    hour_of_day?: number
    timezone?: string
    is_active?: boolean
    format?: 'feed' | 'reel'
    duration_sec?: 15 | 30 | 60
    template_ids?: string[]
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)         updates.name = body.name
  if (body.topic_hint !== undefined)   updates.topic_hint = body.topic_hint
  if (body.frequency !== undefined)    updates.frequency = body.frequency
  if (body.days_of_week !== undefined) updates.days_of_week = body.days_of_week
  if (body.hour_of_day !== undefined)  updates.hour_of_day = body.hour_of_day
  if (body.timezone !== undefined)     updates.timezone = body.timezone
  if (body.is_active !== undefined)    updates.is_active = body.is_active
  if (body.format !== undefined)       updates.format = body.format
  if (body.duration_sec !== undefined) updates.duration_sec = body.duration_sec
  if (body.template_ids !== undefined) updates.template_ids = body.template_ids

  const { data, error } = await supabase
    .from('content_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedule: data })
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('content_schedules')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
