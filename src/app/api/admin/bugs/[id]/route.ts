import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isDb8Staff } from '@/lib/staff'

interface Context { params: Promise<{ id: string }> }

type Status = 'new' | 'triaging' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate'
type Severity = 'low' | 'medium' | 'high' | 'critical'

export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDb8Staff(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    status?: Status
    severity?: Severity
    admin_notes?: string | null
    assigned_to?: string | null
  }

  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) {
    updates.status = body.status
    if (body.status === 'resolved' || body.status === 'wont_fix' || body.status === 'duplicate') {
      updates.resolved_at = new Date().toISOString()
    }
  }
  if (body.severity !== undefined)    updates.severity = body.severity
  if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to

  const service = await createServiceClient()
  const { data, error } = await service
    .from('bug_reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bug: data })
}

export async function DELETE(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDb8Staff(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const service = await createServiceClient()
  const { error } = await service.from('bug_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
