'use client'

// useCurrentTenant — extrai tenant ativo das custom claims já carregadas pelo AuthContext.
//
// Não faz read em Firestore (rules continuam deny-all); confia integralmente
// nas claims `tenants[]` e `roles{}` que o trigger `membershipsOnWrite`
// sincroniza após qualquer write em /memberships.
//
// Para escolher "o tenant atual" entre vários, regra atual: primeiro do array
// `tenants[]` no claim. Quando precisarmos de seleção persistente (UI selector,
// localStorage, ou leitura de users/{uid}.defaultTenantId via callable),
// evoluímos sem alterar consumidores.

import { useAuth } from './auth-context'

export interface CurrentTenantState {
  /** ID do tenant ativo (primeiro de `tenants[]` no claim). null se user sem tenant. */
  tenantId: string | null
  /** Role do user no tenant ativo (ex: 'owner'). null se sem tenant. */
  role: string | null
  /** True se user é membro de ao menos 1 tenant ativo. */
  hasAnyTenant: boolean
  /** Lista completa de tenant IDs do user (para futuro selector de tenant). */
  allTenants: string[]
  /** Mapa completo {tenantId: role} do claim. */
  allRoles: Record<string, string>
  /** True enquanto o AuthContext ainda está carregando o primeiro snapshot. */
  loading: boolean
}

export function useCurrentTenant(): CurrentTenantState {
  const { tenants, roles, loading } = useAuth()
  const tenantId = tenants[0] ?? null
  const role = tenantId ? roles[tenantId] ?? null : null

  return {
    tenantId,
    role,
    hasAnyTenant: tenants.length > 0,
    allTenants: tenants,
    allRoles: roles,
    loading,
  }
}
