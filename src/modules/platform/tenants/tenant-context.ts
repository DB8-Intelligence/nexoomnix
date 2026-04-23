/**
 * Tenant context helper — centraliza o padrão auth + tenant_id fetch
 * repetido em ~19 route handlers.
 *
 * Expõe duas formas de uso:
 *
 *   1) getTenantContext() — throws tipado, deixa o chamador decidir como
 *      mapear o erro. Use quando a rota precisa customizar status/payload
 *      de erro além dos defaults (ex: preservar "Profile sem tenant" / 400).
 *
 *   2) requireTenant(options?) — retorna TenantContext OU NextResponse já
 *      montada. Use quando os defaults de status/mensagem atendem. Os
 *      defaults podem ser sobrescritos via options para preservar mensagens
 *      específicas sem precisar re-montar NextResponse manualmente.
 *
 * O helper é intencionalmente mínimo: retorna apenas o necessário para
 * isolamento por tenant (user + tenant_id + profile enxuto). Rotas que
 * precisam da row de `tenants` (plano, niche, name) continuam fazendo
 * a query adicional — isso será tratado em Sprint futura (ex:
 * `getTenantWithRow()` ou um helper específico por necessidade).
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

export interface TenantContext {
  user: User
  tenantId: string
  profile: {
    id: string
    tenant_id: string
    role: string | null
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class TenantMissingError extends Error {
  constructor(message = 'tenant-missing') {
    super(message)
    this.name = 'TenantMissingError'
  }
}

/**
 * Lê o usuário autenticado do cookie + o profile com tenant_id.
 * Throws tipado em caso de falha.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.tenant_id) throw new TenantMissingError()

  return {
    user,
    tenantId: profile.tenant_id,
    profile: {
      id: profile.id,
      tenant_id: profile.tenant_id,
      role: profile.role ?? null,
    },
  }
}

export interface RequireTenantOptions {
  /** Default: 401 */
  unauthorizedStatus?: number
  /** Default: 'Não autorizado' */
  unauthorizedMessage?: string
  /** Default: 404 */
  tenantMissingStatus?: number
  /** Default: 'Tenant não encontrado' */
  tenantMissingMessage?: string
}

/**
 * Variante "pronta pra consumir em route handler": retorna o contexto
 * em caso de sucesso ou uma NextResponse já formatada em caso de erro.
 *
 * Uso típico:
 *
 *   const ctx = await requireTenant()
 *   if (ctx instanceof NextResponse) return ctx
 *   // ... use ctx.tenantId, ctx.user, ctx.profile
 */
export async function requireTenant(
  options: RequireTenantOptions = {},
): Promise<TenantContext | NextResponse> {
  try {
    return await getTenantContext()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: options.unauthorizedMessage ?? 'Não autorizado' },
        { status: options.unauthorizedStatus ?? 401 },
      )
    }
    if (error instanceof TenantMissingError) {
      return NextResponse.json(
        { error: options.tenantMissingMessage ?? 'Tenant não encontrado' },
        { status: options.tenantMissingStatus ?? 404 },
      )
    }
    throw error
  }
}
