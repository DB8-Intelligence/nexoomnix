// Retorna access_token Canva válido pro tenant. Se access_token está
// expirado mas refresh_token está disponível, faz refresh transparente
// e atualiza canva_connections. Se refresh também falha, desativa a
// conexão e retorna null — UI deve pedir reconexão.

import type { SupabaseClient } from '@supabase/supabase-js'
import { refreshAccessToken } from './client'

const EXPIRY_BUFFER_MS = 60_000 // refresh 1min antes de expirar

export interface CanvaConnection {
  id:            string
  tenant_id:     string
  access_token:  string
  refresh_token: string | null
  expires_at:    string | null
  is_active:     boolean
}

export async function getActiveCanvaToken(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ accessToken: string; connectionId: string } | null> {
  const { data: conn } = await supabase
    .from('canva_connections')
    .select('id, tenant_id, access_token, refresh_token, expires_at, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle() as { data: CanvaConnection | null }

  if (!conn) return null

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : Infinity
  const expiringSoon = Date.now() + EXPIRY_BUFFER_MS >= expiresAt

  if (!expiringSoon) {
    return { accessToken: conn.access_token, connectionId: conn.id }
  }

  if (!conn.refresh_token) {
    await supabase.from('canva_connections').update({ is_active: false }).eq('id', conn.id)
    return null
  }

  try {
    const token = await refreshAccessToken(conn.refresh_token)
    const newExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString()
    await supabase
      .from('canva_connections')
      .update({
        access_token:  token.access_token,
        refresh_token: token.refresh_token,
        expires_at:    newExpiresAt,
        scope:         token.scope,
      })
      .eq('id', conn.id)
    return { accessToken: token.access_token, connectionId: conn.id }
  } catch {
    await supabase.from('canva_connections').update({ is_active: false }).eq('id', conn.id)
    return null
  }
}
