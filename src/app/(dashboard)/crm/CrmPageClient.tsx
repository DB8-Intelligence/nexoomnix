'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getNicheConfig } from '@/lib/niche-config'
import { CrmView } from '@/components/crm/CrmView'
import type { Tenant } from '@/types/database'

export function CrmPageClient() {
  const supabase = createClient()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      if (!profile) return
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
      if (tenantData) setTenant(tenantData as Tenant)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    )
  }

  const niche = getNicheConfig(tenant.niche)

  return (
    <div className="p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Omnix CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie seus leads, clientes e oportunidades
          </p>
        </div>
      </div>
      <CrmView niche={tenant.niche} primaryColor={niche.primaryColor} />
    </div>
  )
}
