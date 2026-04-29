// Inicia o fluxo OAuth do Canva. Gera state + PKCE, persiste em
// canva_oauth_states (service role bypassa RLS), redireciona o user
// pra Canva authorize URL.

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, generatePkcePair } from '@/lib/canva/client'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

export async function GET() {
  const ctx = await requireTenant({
    unauthorizedMessage: 'Unauthorized',
    tenantMissingStatus: 400,
    tenantMissingMessage: 'Profile sem tenant',
  })
  if (ctx instanceof NextResponse) return ctx

  if (!process.env.CANVA_CLIENT_ID || !process.env.CANVA_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Canva OAuth não configurado. Configure CANVA_CLIENT_ID e CANVA_CLIENT_SECRET.' },
      { status: 500 },
    )
  }

  const state = randomBytes(24).toString('base64url')
  const { verifier, challenge } = generatePkcePair()

  // Grava state via service role — o callback não tem sessão do user
  // no momento da troca de code.
  const service = await createServiceClient()
  await service.from('canva_oauth_states').insert({
    state,
    tenant_id:     ctx.tenantId,
    user_id:       ctx.user.id,
    code_verifier: verifier,
  })

  const authUrl = buildAuthorizeUrl({ state, codeChallenge: challenge })
  return NextResponse.redirect(authUrl)
}
