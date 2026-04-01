'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getNicheConfig } from '@/lib/niche-config'
import { useCrm } from '@/hooks/useCrm'
import { CrmPipelineConfig } from '@/components/crm/CrmPipelineConfig'
import type { Tenant } from '@/types/database'

export function CrmConfigClient() {
  const supabase = createClient()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    pipeline, stages,
    updatePipelineName, createStage, updateStage, deleteStage, reorderStages,
  } = useCrm()

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

  if (loading || !tenant || !pipeline) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
      </div>
    )
  }

  const niche = getNicheConfig(tenant.niche)

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/crm"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Pipeline</h1>
          <p className="text-sm text-gray-500">Personalize as etapas do seu funil CRM</p>
        </div>
      </div>

      <CrmPipelineConfig
        stages={stages}
        pipelineName={pipeline.name}
        onUpdatePipelineName={updatePipelineName}
        onCreateStage={createStage}
        onUpdateStage={updateStage}
        onDeleteStage={deleteStage}
        onReorderStages={reorderStages}
        primaryColor={niche.primaryColor}
      />
    </div>
  )
}
