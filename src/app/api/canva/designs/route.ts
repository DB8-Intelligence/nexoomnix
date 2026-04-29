// Lista designs do user conectado no Canva. Proxy da Canva Connect API
// com refresh automático de token. Aceita ?continuation=xxx pra paginação.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getActiveCanvaToken } from '@/lib/canva/token'
import { listDesigns } from '@/lib/canva/client'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

export async function GET(req: NextRequest) {
  // Preserva os códigos/mensagens originais: 401 "Unauthorized" e 400 "Profile sem tenant"
  const ctx = await requireTenant({
    unauthorizedMessage: 'Unauthorized',
    tenantMissingStatus: 400,
    tenantMissingMessage: 'Profile sem tenant',
  })
  if (ctx instanceof NextResponse) return ctx

  const supabase = await createClient()
  const tokenInfo = await getActiveCanvaToken(supabase, ctx.tenantId)
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
