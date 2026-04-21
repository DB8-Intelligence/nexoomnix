// Staff-only — lista todos os bug_reports, com filtros.
// RLS de bug_reports só permite SELECT nos próprios do user,
// então aqui usamos service client + gate isDb8Staff.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isDb8Staff } from '@/lib/staff'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDb8Staff(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const status   = req.nextUrl.searchParams.get('status')
  const severity = req.nextUrl.searchParams.get('severity')
  const limit    = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 200)

  const service = await createServiceClient()
  let query = service
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status)   query = query.eq('status', status)
  if (severity) query = query.eq('severity', severity)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bugs: data ?? [] })
}
