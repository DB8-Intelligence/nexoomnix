'use client'

import { useState, useEffect } from 'react'
import {
  X, User, Phone, Mail, MessageCircle, DollarSign,
  Clock, Tag, ArrowRight, Trash2, XCircle, ChevronDown,
  MapPin, Home, Calendar, StickyNote
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CrmActivityTimeline } from './CrmActivityTimeline'
import { CrmMessageComposer } from './CrmMessageComposer'
import type {
  CrmDeal, CrmStage, CrmType, CrmActivity,
  CrmMessage, CrmChannelType, CrmActivityType, CrmMessageTemplate
} from '@/types/database'
import type { DealFormData } from '@/hooks/useCrm'

const CHANNEL_LABELS: Record<CrmChannelType, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook',
  telegram: 'Telegram', site: 'Site', telefone: 'Telefone',
  indicacao: 'Indicacao', google: 'Google', outro: 'Outro',
}

interface CrmDealDetailProps {
  deal: CrmDeal
  stages: CrmStage[]
  crmType: CrmType
  onClose: () => void
  onUpdate: (data: Partial<DealFormData>) => Promise<void>
  onMove: (stageId: string) => Promise<void>
  onDelete: () => Promise<void>
  onCloseLost: (reason: string) => Promise<void>
  onAddActivity: (dealId: string, type: CrmActivityType, title: string, description?: string) => Promise<boolean>
  onSendMessage: (dealId: string | null, clientId: string | null, channel: CrmChannelType, content: string) => Promise<boolean>
  onFetchActivities: (dealId: string) => Promise<unknown[]>
  onFetchMessages: (dealId: string) => Promise<unknown[]>
  primaryColor: string
}

type TabType = 'timeline' | 'messages' | 'details'

export function CrmDealDetail({
  deal, stages, crmType, onClose, onUpdate, onMove, onDelete,
  onCloseLost, onAddActivity, onSendMessage, onFetchActivities, onFetchMessages,
  primaryColor,
}: CrmDealDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>('timeline')
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [messages, setMessages] = useState<CrmMessage[]>([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [templates, setTemplates] = useState<CrmMessageTemplate[]>([])

  const currentStage = stages.find(s => s.id === deal.stage_id)

  useEffect(() => {
    const loadData = async () => {
      setLoadingActivities(true)
      const acts = await onFetchActivities(deal.id)
      setActivities(acts as CrmActivity[])
      setLoadingActivities(false)
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id])

  useEffect(() => {
    if (activeTab === 'messages') {
      onFetchMessages(deal.id).then(msgs => setMessages(msgs as CrmMessage[]))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, deal.id])

  const handleAddNote = async () => {
    if (!noteInput.trim()) return
    await onAddActivity(deal.id, 'note', 'Nota adicionada', noteInput)
    const acts = await onFetchActivities(deal.id)
    setActivities(acts as CrmActivity[])
    setNoteInput('')
  }

  const handleSendMessage = async (channel: CrmChannelType, content: string) => {
    const success = await onSendMessage(deal.id, deal.client_id, channel, content)
    if (success) {
      const acts = await onFetchActivities(deal.id)
      setActivities(acts as CrmActivity[])
    }
    return success
  }

  const handleCloseLost = async () => {
    if (!lostReason.trim()) return
    await onCloseLost(lostReason)
    setShowLostModal(false)
  }

  const daysInStage = Math.floor(
    (new Date().getTime() - new Date(deal.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{deal.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: currentStage?.color ?? '#6b7280' }}
                >
                  {currentStage?.name}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {daysInStage}d nesta etapa
                </span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
            {/* Move stage */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ArrowRight className="w-3 h-3" />
                Mover
                <ChevronDown className="w-3 h-3" />
              </button>
              {showMoveMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[180px]">
                  {stages.filter(s => s.id !== deal.stage_id).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { onMove(s.id); setShowMoveMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* WhatsApp direct */}
            {deal.contact_whatsapp && (
              <a
                href={`https://wa.me/55${deal.contact_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </a>
            )}

            {/* Mark lost */}
            {!currentStage?.is_won && !currentStage?.is_lost && (
              <button
                type="button"
                onClick={() => setShowLostModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
              >
                <XCircle className="w-3 h-3" />
                Perdido
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Contact info card */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            {deal.contact_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{deal.contact_name}</span>
              </div>
            )}
            {deal.contact_whatsapp && (
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">{deal.contact_whatsapp}</span>
              </div>
            )}
            {deal.contact_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{deal.contact_phone}</span>
              </div>
            )}
            {deal.contact_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700">{deal.contact_email}</span>
              </div>
            )}
            {deal.estimated_value > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.estimated_value)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Tag className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{CHANNEL_LABELS[deal.source_channel]}</span>
            </div>
          </div>

          {/* Imobiliário details */}
          {crmType === 'imobiliario' && deal.interest_type && (
            <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">
                  Interesse: {deal.interest_type}
                </span>
                {deal.price_min !== null && deal.price_max !== null && (
                  <span className="text-emerald-600 text-xs">
                    R$ {deal.price_min?.toLocaleString('pt-BR')} - R$ {deal.price_max?.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
              {deal.preferred_areas && deal.preferred_areas.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                  <MapPin className="w-3 h-3" />
                  {deal.preferred_areas.join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {deal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {deal.tags.map(tag => (
                <span key={tag} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {([
            { id: 'timeline' as const, label: 'Timeline' },
            { id: 'messages' as const, label: 'Mensagens' },
            { id: 'details' as const, label: 'Detalhes' },
          ]).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-4">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Add note input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
                  placeholder="Adicionar nota..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!noteInput.trim()}
                  className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  <StickyNote className="w-4 h-4" />
                </button>
              </div>

              <CrmActivityTimeline activities={activities} loading={loadingActivities} />
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-4">
              <CrmMessageComposer
                contactName={deal.contact_name}
                contactWhatsapp={deal.contact_whatsapp}
                templates={templates}
                onSend={handleSendMessage}
              />

              {/* Message history */}
              {messages.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">Historico</h4>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        'p-3 rounded-lg text-sm',
                        msg.direction === 'outbound'
                          ? 'bg-blue-50 text-blue-900 ml-8'
                          : 'bg-gray-50 text-gray-900 mr-8'
                      )}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {msg.direction === 'outbound' ? 'Enviada' : 'Recebida'} via {msg.channel}
                        {' - '}
                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Criado em</span>
                <span className="text-gray-900">{new Date(deal.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Canal de origem</span>
                <span className="text-gray-900">{CHANNEL_LABELS[deal.source_channel]}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Prioridade</span>
                <span className="text-gray-900 capitalize">{deal.priority}</span>
              </div>
              {deal.expected_close_at && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Previsao de fechamento</span>
                  <span className="text-gray-900">{new Date(deal.expected_close_at).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {deal.notes && (
                <div className="py-2">
                  <span className="text-gray-500 block mb-1">Observacoes</span>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{deal.notes}</p>
                </div>
              )}
              {deal.lost_reason && (
                <div className="py-2">
                  <span className="text-red-500 block mb-1">Motivo da perda</span>
                  <p className="text-red-700 bg-red-50 p-3 rounded-lg">{deal.lost_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lost reason modal */}
        {showLostModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Motivo da perda</h3>
              <textarea
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                rows={3}
                placeholder="Por que este deal foi perdido?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm mb-4 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowLostModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="button" onClick={handleCloseLost}
                  disabled={!lostReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg disabled:opacity-50">
                  Marcar como perdido
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir deal?</h3>
              <p className="text-sm text-gray-500 mb-4">Esta acao nao pode ser desfeita.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
                  Cancelar
                </button>
                <button type="button" onClick={onDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
