// Callback do OAuth Canva. Canva redireciona pra cá com ?code&state.
// Trocamos code por access/refresh tokens, gravamos em canva_connections,
// apagamos o state e redirecionamos o user de volta pra /conteudo/templates.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exchangeCodeForToken } from '@/lib/canva/client'

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutos

function errorRedirect(req: NextRequest, reason: string): NextResponse {
  const url = new URL('/conteudo/templates', req.url)
  url.searchParams.set('canva_error', reason)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) return errorRedirect(req, error)
  if (!code || !state) return errorRedirect(req, 'missing_code_or_state')

  const service = await createServiceClient()

  const { data: stateRow } = await service
    .from('canva_oauth_states')
    .select('*')
    .eq('state', state)
    .maybeSingle()

  if (!stateRow) return errorRedirect(req, 'invalid_state')

  const createdAt = new Date(stateRow.created_at).getTime()
  if (Date.now() - createdAt > STATE_TTL_MS) {
    await service.from('canva_oauth_states').delete().eq('state', state)
    return errorRedirect(req, 'state_expired')
  }

  let token
  try {
    token = await exchangeCodeForToken(code, stateRow.code_verifier)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'token_exchange_failed'
    console.error('[canva/callback]', msg)
    return errorRedirect(req, 'token_exchange_failed')
  }

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()

  // Upsert pra permitir reconexão sobre conexão existente.
  await service
    .from('canva_connections')
    .upsert({
      tenant_id:     stateRow.tenant_id,
      user_id:       stateRow.user_id,
      access_token:  token.access_token,
      refresh_token: token.refresh_token,
      expires_at:    expiresAt,
      scope:         token.scope,
      is_active:     true,
    }, { onConflict: 'tenant_id' })

  // Limpa state consumido.
  await service.from('canva_oauth_states').delete().eq('state', state)

  const successUrl = new URL('/conteudo/templates', req.url)
  successUrl.searchParams.set('canva', 'connected')
  return NextResponse.redirect(successUrl)
}
