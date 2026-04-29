'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Tenant, Profile, NicheType, PlanType } from '@/types/database'
import { slugify } from '@/lib/utils'

interface AuthState {
  user: User | null
  profile: Profile | null
  tenant: Tenant | null
  loading: boolean
}

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    tenant: null,
    loading: true,
  })

  useEffect(() => {
    // Buscar sessão atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchProfile(user.id)
      } else {
        setState({ user: null, profile: null, tenant: null, loading: false })
      }
    })

    // Listener de mudança de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setState({ user: null, profile: null, tenant: null, loading: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*, tenants(*)')
      .eq('id', userId)
      .single()

    const user = (await supabase.auth.getUser()).data.user

    if (data) {
      const tenant = Array.isArray(data.tenants) ? data.tenants[0] : data.tenants
      setState({
        user,
        profile: data,
        tenant: tenant ?? null,
        loading: false,
      })
    } else {
      setState({ user, profile: null, tenant: null, loading: false })
    }
  }

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  /** Verifica se o tenant tem o plano mínimo necessário */
  const isPlanAtLeast = useCallback(
    (minPlan: PlanType): boolean => {
      if (!state.tenant) return false
      const order: PlanType[] = ['trial', 'starter', 'pro', 'pro_plus', 'pro_max', 'enterprise']
      const tenantIndex = order.indexOf(state.tenant.plan)
      const minIndex = order.indexOf(minPlan)
      return tenantIndex >= minIndex
    },
    [state.tenant]
  )

  /** Verifica se um módulo está ativo para o tenant */
  const hasModule = useCallback(
    async (moduleId: string): Promise<boolean> => {
      if (!state.tenant) return false
      const { data } = await supabase
        .from('tenant_modules')
        .select('is_enabled')
        .eq('tenant_id', state.tenant.id)
        .eq('module_id', moduleId)
        .single()
      return data?.is_enabled ?? false
    },
    [supabase, state.tenant]
  )

  /** Cria tenant + profile + settings + módulos (chamado no onboarding) */
  const setupTenant = useCallback(
    async (params: {
      name: string
      niche: NicheType
      plan: PlanType
      fullName: string
      email: string
      phone?: string
      whatsapp?: string
    }) => {
      const user = state.user
      if (!user) throw new Error('Usuário não autenticado')

      const slug = slugify(params.name)

      const { data, error } = await supabase.rpc('setup_tenant', {
        p_user_id:   user.id,
        p_name:      params.name,
        p_slug:      slug,
        p_niche:     params.niche,
        p_plan:      params.plan,
        p_full_name: params.fullName,
        p_email:     params.email,
        p_phone:     params.phone ?? null,
        p_whatsapp:  params.whatsapp ?? null,
      })

      if (error) throw new Error(error.message)

      await fetchProfile(user.id)
      return data as string
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase, state.user]
  )

  return {
    ...state,
    signOut,
    isPlanAtLeast,
    hasModule,
    setupTenant,
  }
}
