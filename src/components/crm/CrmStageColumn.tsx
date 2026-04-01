'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CrmDealCard } from './CrmDealCard'
import type { CrmStage, CrmDeal } from '@/types/database'

interface CrmStageColumnProps {
  stage: CrmStage
  deals: CrmDeal[]
  onDealClick: (deal: CrmDeal) => void
  onAddDeal: (stageId: string) => void
  onDragStart: (e: React.DragEvent, dealId: string) => void
  onDrop: (e: React.DragEvent, stageId: string) => void
  onDragOver: (e: React.DragEvent) => void
}

export function CrmStageColumn({
  stage, deals, onDealClick, onAddDeal,
  onDragStart, onDrop, onDragOver,
}: CrmStageColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const totalValue = deals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  return (
    <div
      className={cn(
        'flex flex-col bg-gray-50 rounded-xl min-w-[280px] max-w-[320px] w-[300px] flex-shrink-0 transition-colors',
        isDragOver && 'bg-blue-50 ring-2 ring-blue-200'
      )}
      onDragOver={(e) => { e.preventDefault(); onDragOver(e); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { onDrop(e, stage.id); setIsDragOver(false) }}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold text-gray-900 flex-1 truncate">{stage.name}</h3>
          <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded-md font-medium">
            {deals.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-gray-500 ml-5">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-[100px] max-h-[calc(100vh-280px)]">
        {deals.map(deal => (
          <CrmDealCard
            key={deal.id}
            deal={deal}
            onClick={onDealClick}
            onDragStart={onDragStart}
          />
        ))}

        {deals.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">
            Arraste cards aqui
          </div>
        )}
      </div>

      {/* Add button */}
      {!stage.is_won && !stage.is_lost && (
        <div className="px-2 py-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => onAddDeal(stage.id)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        </div>
      )}
    </div>
  )
}
