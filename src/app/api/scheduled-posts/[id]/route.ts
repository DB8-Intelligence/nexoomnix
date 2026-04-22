import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    caption?: string
    scheduled_for?: string
    status?: 'scheduled' | 'cancelled'
  }

  // Guard: só permite mudar post ainda agendado (race com o publisher).
  const { data: current } = await supabase
    .from('scheduled_posts')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (!current) return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })
  if (current.status !== 'scheduled') {
    return NextResponse.json({ error: `Post já ${current.status}, não pode ser editado` }, { status: 409 })
  }

  const updates: Record<string, unknown> = {}
  if (body.caption !== undefined)       updates.caption = body.caption
  if (body.scheduled_for !== undefined) updates.scheduled_for = body.scheduled_for
  if (body.status !== undefined)        updates.status = body.status

  const { data, error } = await supabase
    .from('scheduled_posts')
    .update(updates)
    .eq('id', id)
    .eq('status', 'scheduled')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mesma guard: só cancela se ainda scheduled. Race-safe contra publisher.
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id, status')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Post não pode ser cancelado (já publicado ou em publicação)' }, { status: 409 })
  return NextResponse.json({ ok: true })
}
