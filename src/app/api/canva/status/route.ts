import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('canva_connections')
    .select('id, is_active, expires_at, last_used_at, created_at')
    .eq('is_active', true)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ connected: false, configured: Boolean(process.env.CANVA_CLIENT_ID) })
  }

  const expired = data.expires_at ? new Date(data.expires_at).getTime() < Date.now() : false

  return NextResponse.json({
    connected:     true,
    connectionId:  data.id,
    expired,
    lastUsedAt:    data.last_used_at,
    connectedAt:   data.created_at,
    configured:    Boolean(process.env.CANVA_CLIENT_ID),
  })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('canva_connections')
    .update({ is_active: false })
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
