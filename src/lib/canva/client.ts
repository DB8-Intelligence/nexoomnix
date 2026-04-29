// Cliente Canva Connect API v1.
// Docs: https://www.canva.dev/docs/connect/
//
// Credenciais: CANVA_CLIENT_ID + CANVA_CLIENT_SECRET vêm do app criado em
// https://www.canva.com/developers/apps. Redirect URI configurado lá precisa
// bater exatamente com NEXT_PUBLIC_APP_URL + /api/canva/callback.

import { randomBytes, createHash } from 'crypto'

const CANVA_AUTH_URL  = 'https://www.canva.com/api/oauth/authorize'
const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token'
const CANVA_API_BASE  = 'https://api.canva.com/rest/v1'

// Scopes mínimos pra listar e exportar designs do user.
export const CANVA_SCOPES = [
  'design:meta:read',
  'design:content:read',
  'asset:read',
  'profile:read',
].join(' ')

export function canvaRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://nexoomnix.com'
  return `${base}/api/canva/callback`
}

// PKCE: code_verifier (43-128 chars) + code_challenge = base64url(sha256(verifier))
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier  = randomBytes(48).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthorizeUrl(params: { state: string; codeChallenge: string }): string {
  const clientId = process.env.CANVA_CLIENT_ID
  if (!clientId) throw new Error('CANVA_CLIENT_ID não configurado')

  const qs = new URLSearchParams({
    response_type:         'code',
    client_id:             clientId,
    redirect_uri:          canvaRedirectUri(),
    scope:                 CANVA_SCOPES,
    state:                 params.state,
    code_challenge:        params.codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${CANVA_AUTH_URL}?${qs.toString()}`
}

interface TokenResponse {
  access_token:  string
  refresh_token: string
  expires_in:    number
  scope:         string
  token_type:    string
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenResponse> {
  const clientId     = process.env.CANVA_CLIENT_ID!
  const clientSecret = process.env.CANVA_CLIENT_SECRET!
  if (!clientId || !clientSecret) throw new Error('Canva credentials missing')

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  canvaRedirectUri(),
    code_verifier: codeVerifier,
  })

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basic}`,
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva token exchange failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<TokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId     = process.env.CANVA_CLIENT_ID!
  const clientSecret = process.env.CANVA_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
  })

  const res = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basic}`,
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva refresh failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<TokenResponse>
}

export interface CanvaDesign {
  id:        string
  title?:    string
  thumbnail?: { url: string; width: number; height: number }
  urls?:     { edit_url: string; view_url: string }
  created_at?: number
  updated_at?: number
}

export async function listDesigns(accessToken: string, opts: { limit?: number; continuation?: string } = {}): Promise<{
  items: CanvaDesign[]
  continuation?: string
}> {
  const params = new URLSearchParams()
  params.set('limit', String(opts.limit ?? 20))
  if (opts.continuation) params.set('continuation', opts.continuation)

  const res = await fetch(`${CANVA_API_BASE}/designs?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva list designs failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<{ items: CanvaDesign[]; continuation?: string }>
}

export interface CanvaExportJob {
  id:     string
  status: 'in_progress' | 'success' | 'failed'
  urls?:  string[]
  error?: { message: string; code: string }
}

export async function createExport(accessToken: string, designId: string, format: 'png' | 'jpg' = 'png'): Promise<CanvaExportJob> {
  const res = await fetch(`${CANVA_API_BASE}/exports`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ design_id: designId, format: { type: format } }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva export create failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { job: CanvaExportJob }
  return data.job
}

export async function getExport(accessToken: string, jobId: string): Promise<CanvaExportJob> {
  const res = await fetch(`${CANVA_API_BASE}/exports/${jobId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canva get export failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { job: CanvaExportJob }
  return data.job
}

// Aguarda o export terminar (polling). Timeout default 60s.
export async function waitForExport(accessToken: string, jobId: string, timeoutMs = 60_000): Promise<CanvaExportJob> {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const job = await getExport(accessToken, jobId)
    if (job.status === 'success' || job.status === 'failed') return job
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Canva export polling timeout')
}
