// Lista designs do user conectado no Canva. Proxy da Canva Connect API
// com refresh automático de token. Aceita ?continuation=xxx pra paginação.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveCanvaToken } from '@/lib/canva/token'
import { listDesigns } from '@/lib/canva/client'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Profile sem tenant' }, { status: 400 })
  }

  const tokenInfo = await getActiveCanvaToken(supabase, profile.tenant_id)
  if (!tokenInfo) {
    return NextResponse.json({ error: 'Canva não conectado', needsReconnect: true }, { status: 401 })
  }

  const continuation = req.nextUrl.searchParams.get('continuation') ?? undefined
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20), 50)

  try {
    const result = await listDesigns(tokenInfo.accessToken, { limit, continuation })
    await supabase
      .from('canva_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenInfo.connectionId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar designs'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
