'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Filter, SlidersHorizontal, Plus, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CrmStageColumn } from './CrmStageColumn'
import { CrmDealForm } from './CrmDealForm'
import { CrmDealDetail } from './CrmDealDetail'
import { CrmDashboardKpis } from './CrmDashboardKpis'
import type { CrmStage, CrmDeal, CrmType, CrmChannelType, CrmActivityType, Client } from '@/types/database'
import type { DealFormData } from '@/hooks/useCrm'

interface CrmKanbanBoardProps {
  stages: CrmStage[]
  deals: CrmDeal[]
  crmType: CrmType
  pipelineName: string
  clients: Client[]
  loading: boolean
  onCreateDeal: (stageId: string, data: DealFormData) => Promise<CrmDeal | null>
  onUpdateDeal: (id: string, data: Partial<DealFormData>) => Promise<boolean>
  onMoveDeal: (dealId: string, toStageId: string) => Promise<boolean>
  onDeleteDeal: (id: string) => Promise<boolean>
  onCloseDealLost: (dealId: string, reason: string) => Promise<boolean>
  onAddActivity: (dealId: string, type: CrmActivityType, title: string, description?: string) => Promise<boolean>
  onSendMessage: (dealId: string | null, clientId: string | null, channel: CrmChannelType, content: string) => Promise<boolean>
  onFetchActivities: (dealId: string) => Promise<unknown[]>
  onFetchMessages: (dealId: string) => Promise<unknown[]>
  primaryColor: string
}

export function CrmKanbanBoard({
  stages, deals, crmType, pipelineName, clients, loading,
  onCreateDeal, onUpdateDeal, onMoveDeal, onDeleteDeal, onCloseDealLost,
  onAddActivity, onSendMessage, onFetchActivities, onFetchMessages,
  primaryColor,
}: CrmKanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterChannel, setFilterChannel] = useState<CrmChannelType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [formStageId, setFormStageId] = useState<string | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)

  // Filter deals
  const filteredDeals = useMemo(() => {
    let result = deals
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.contact_name?.toLowerCase().includes(q) ||
        d.contact_email?.toLowerCase().includes(q) ||
        d.contact_whatsapp?.includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    if (filterChannel !== 'all') {
      result = result.filter(d => d.source_channel === filterChannel)
    }
    return result
  }, [deals, searchQuery, filterChannel])

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map: Record<string, CrmDeal[]> = {}
    for (const stage of stages) {
      map[stage.id] = filteredDeals.filter(d => d.stage_id === stage.id)
    }
    return map
  }, [stages, filteredDeals])

  // Drag & Drop
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    if (draggedDealId) {
      await onMoveDeal(draggedDealId, stageId)
      setDraggedDealId(null)
    }
  }, [draggedDealId, onMoveDeal])

  const handleAddDeal = (stageId: string) => {
    setFormStageId(stageId)
    setShowForm(true)
  }

  const handleFormSubmit = async (data: DealFormData) => {
    if (formStageId) {
      await onCreateDeal(formStageId, data)
    }
  }

  const handleDealClick = (deal: CrmDeal) => {
    setSelectedDeal(deal)
  }

  if (showDashboard) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Dashboard CRM</h2>
          <button
            type="button"
            onClick={() => setShowDashboard(false)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            Voltar ao Kanban
          </button>
        </div>
        <CrmDashboardKpis stages={stages} deals={deals} crmType={crmType} primaryColor={primaryColor} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, email, telefone..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value as CrmChannelType | 'all')}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
        >
          <option value="all">Todos os canais</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="telegram">Telegram</option>
          <option value="telefone">Telefone</option>
          <option value="site">Site</option>
          <option value="indicacao">Indicacao</option>
          <option value="google">Google</option>
        </select>

        <button
          type="button"
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <BarChart3 className="w-4 h-4" />
          KPIs
        </button>

        <button
          type="button"
          onClick={() => handleAddDeal(stages[0]?.id ?? '')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="w-4 h-4" />
          Novo Deal
        </button>
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {stages.map(stage => (
            <CrmStageColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] ?? []}
              onDealClick={handleDealClick}
              onAddDeal={handleAddDeal}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      )}

      {/* Deal form modal */}
      <CrmDealForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        crmType={crmType}
        clients={clients}
      />

      {/* Deal detail modal */}
      {selectedDeal && (
        <CrmDealDetail
          deal={selectedDeal}
          stages={stages}
          crmType={crmType}
          onClose={() => setSelectedDeal(null)}
          onUpdate={async (data) => { await onUpdateDeal(selectedDeal.id, data); setSelectedDeal(null) }}
          onMove={async (stageId) => { await onMoveDeal(selectedDeal.id, stageId) }}
          onDelete={async () => { await onDeleteDeal(selectedDeal.id); setSelectedDeal(null) }}
          onCloseLost={async (reason) => { await onCloseDealLost(selectedDeal.id, reason); setSelectedDeal(null) }}
          onAddActivity={onAddActivity}
          onSendMessage={onSendMessage}
          onFetchActivities={onFetchActivities}
          onFetchMessages={onFetchMessages}
          primaryColor={primaryColor}
        />
      )}
    </div>
  )
}
