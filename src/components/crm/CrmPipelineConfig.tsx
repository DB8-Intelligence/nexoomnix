'use client'

import { useState } from 'react'
import { GripVertical, Plus, Trash2, Save, Palette, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CrmStage } from '@/types/database'
import type { StageFormData } from '@/hooks/useCrm'

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#eab308', '#f97316', '#8b5cf6',
  '#1d4ed8', '#22c55e', '#ef4444', '#ec4899', '#06b6d4',
  '#059669', '#f59e0b',
]

interface CrmPipelineConfigProps {
  stages: CrmStage[]
  pipelineName: string
  onUpdatePipelineName: (name: string) => Promise<boolean>
  onCreateStage: (data: StageFormData) => Promise<CrmStage | null>
  onUpdateStage: (id: string, data: Partial<StageFormData>) => Promise<boolean>
  onDeleteStage: (id: string) => Promise<boolean>
  onReorderStages: (stageIds: string[]) => Promise<boolean>
  primaryColor: string
}

export function CrmPipelineConfig({
  stages, pipelineName,
  onUpdatePipelineName, onCreateStage, onUpdateStage, onDeleteStage, onReorderStages,
  primaryColor,
}: CrmPipelineConfigProps) {
  const [editName, setEditName] = useState(pipelineName)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6b7280')
  const [saving, setSaving] = useState(false)

  const handleSaveName = async () => {
    if (editName.trim() && editName !== pipelineName) {
      setSaving(true)
      await onUpdatePipelineName(editName.trim())
      setSaving(false)
    }
  }

  const handleAddStage = async () => {
    if (!newStageName.trim()) return
    const maxPos = Math.max(...stages.map(s => s.position), -1) + 1
    await onCreateStage({
      name: newStageName.trim(),
      color: newStageColor,
      position: maxPos,
      is_won: false,
      is_lost: false,
      auto_days_alert: null,
    })
    setNewStageName('')
  }

  const handleDeleteStage = async (id: string) => {
    const stage = stages.find(s => s.id === id)
    if (stage?.is_won || stage?.is_lost) return // Can't delete won/lost stages
    await onDeleteStage(id)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Pipeline name */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Nome do Pipeline</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={saving || editName === pipelineName}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>

      {/* Stages list */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Etapas do Funil</h3>

        <div className="space-y-2 mb-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
            >
              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <span className="flex-1 text-sm font-medium text-gray-800">{stage.name}</span>
              {stage.is_won && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ganho</span>
              )}
              {stage.is_lost && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Perdido</span>
              )}
              {stage.auto_days_alert !== null && (
                <span className="text-xs text-gray-400">{stage.auto_days_alert}d alerta</span>
              )}
              {!stage.is_won && !stage.is_lost && (
                <button
                  type="button"
                  onClick={() => handleDeleteStage(stage.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new stage */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <div className="relative">
            <input
              type="color"
              value={newStageColor}
              onChange={e => setNewStageColor(e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
            />
          </div>
          <input
            type="text"
            value={newStageName}
            onChange={e => setNewStageName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddStage() }}
            placeholder="Nome da nova etapa..."
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <button
            type="button"
            onClick={handleAddStage}
            disabled={!newStageName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-xl">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          As etapas &ldquo;Ganho&rdquo; e &ldquo;Perdido&rdquo; nao podem ser removidas pois sao necessarias para calcular a taxa de conversao do funil.
          Voce pode renomea-las editando diretamente.
        </p>
      </div>
    </div>
  )
}
