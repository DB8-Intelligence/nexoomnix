'use client'

import { useEffect, useState } from 'react'
import { useCrm } from '@/hooks/useCrm'
import { useClients } from '@/hooks/useClients'
import { CrmKanbanBoard } from './CrmKanbanBoard'
import { CrmTypeSelector } from './CrmTypeSelector'
import { AlertCircle } from 'lucide-react'
import type { CrmType } from '@/types/database'
import { CRM_TYPE_BY_NICHE } from '@/types/database'

interface CrmViewProps {
  niche: string
  primaryColor: string
}

export function CrmView({ niche, primaryColor }: CrmViewProps) {
  const {
    pipeline, stages, deals, loading, error,
    initializePipeline, fetchPipeline,
    createDeal, updateDeal, moveDeal, deleteDeal, closeDealLost,
    addActivity, sendMessage, fetchActivities, fetchMessages,
    fetchTemplates,
  } = useCrm()

  const { clients } = useClients()
  const [initialized, setInitialized] = useState(false)

  const suggestedType: CrmType = CRM_TYPE_BY_NICHE[niche] ?? 'vendas'

  useEffect(() => {
    if (!loading && pipeline === null && !initialized) {
      // Pipeline not created yet — show selector
      setInitialized(true)
    }
    if (pipeline) {
      fetchTemplates()
      setInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pipeline])

  const handleSelectType = async (crmType: CrmType) => {
    await initializePipeline(crmType)
  }

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  // No pipeline yet — show type selector
  if (!pipeline) {
    return (
      <CrmTypeSelector
        suggestedType={suggestedType}
        onSelect={handleSelectType}
        primaryColor={primaryColor}
      />
    )
  }

  // Pipeline exists — show Kanban board
  return (
    <CrmKanbanBoard
      stages={stages}
      deals={deals}
      crmType={pipeline.crm_type}
      pipelineName={pipeline.name}
      clients={clients}
      loading={loading}
      onCreateDeal={createDeal}
      onUpdateDeal={updateDeal}
      onMoveDeal={moveDeal}
      onDeleteDeal={deleteDeal}
      onCloseDealLost={closeDealLost}
      onAddActivity={addActivity}
      onSendMessage={sendMessage}
      onFetchActivities={fetchActivities}
      onFetchMessages={fetchMessages}
      primaryColor={primaryColor}
    />
  )
}
