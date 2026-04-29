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
    description?: string | null
    image_url?: string
    format?: 'feed' | 'story' | 'reel_cover'
    niche?: string | null
    is_active?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)        updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.image_url !== undefined)   updates.image_url = body.image_url
  if (body.format !== undefined)      updates.format = body.format
  if (body.niche !== undefined)       updates.niche = body.niche
  if (body.is_active !== undefined)   updates.is_active = body.is_active

  const { data, error } = await supabase
    .from('content_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('content_templates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
