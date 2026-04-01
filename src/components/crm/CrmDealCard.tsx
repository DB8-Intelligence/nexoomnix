'use client'

import { useMemo } from 'react'
import { Phone, Mail, MessageCircle, Clock, DollarSign, Tag, GripVertical, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CrmDeal, CrmChannelType } from '@/types/database'

const CHANNEL_ICONS: Record<CrmChannelType, { icon: string; color: string }> = {
  whatsapp: { icon: '💬', color: 'bg-green-100 text-green-700' },
  instagram: { icon: '📸', color: 'bg-pink-100 text-pink-700' },
  facebook: { icon: '👤', color: 'bg-blue-100 text-blue-700' },
  telegram: { icon: '✈️', color: 'bg-sky-100 text-sky-700' },
  site: { icon: '🌐', color: 'bg-gray-100 text-gray-700' },
  telefone: { icon: '📞', color: 'bg-amber-100 text-amber-700' },
  indicacao: { icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  google: { icon: '🔍', color: 'bg-red-100 text-red-700' },
  outro: { icon: '📌', color: 'bg-gray-100 text-gray-600' },
}

const PRIORITY_COLORS: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-600',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
}

interface CrmDealCardProps {
  deal: CrmDeal
  onClick: (deal: CrmDeal) => void
  onDragStart: (e: React.DragEvent, dealId: string) => void
}

export function CrmDealCard({ deal, onClick, onDragStart }: CrmDealCardProps) {
  const daysInStage = useMemo(() => {
    const entered = new Date(deal.stage_entered_at)
    const now = new Date()
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24))
  }, [deal.stage_entered_at])

  const channelInfo = CHANNEL_ICONS[deal.source_channel] ?? CHANNEL_ICONS.outro

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onClick(deal)}
      className="bg-white rounded-xl border border-gray-200 p-3 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all group"
    >
      {/* Header: grip + title */}
      <div className="flex items-start gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{deal.title}</h4>
          {deal.contact_name && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" />
              {deal.contact_name}
            </p>
          )}
        </div>
      </div>

      {/* Value */}
      {deal.estimated_value > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <DollarSign className="w-3 h-3 text-green-600" />
          <span className="text-sm font-semibold text-green-700">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.estimated_value)}
          </span>
        </div>
      )}

      {/* Contact info row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {deal.contact_whatsapp && (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
            <MessageCircle className="w-3 h-3" />
            WA
          </span>
        )}
        {deal.contact_phone && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
            <Phone className="w-3 h-3" />
            Tel
          </span>
        )}
        {deal.contact_email && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            <Mail className="w-3 h-3" />
            Email
          </span>
        )}
      </div>

      {/* Bottom row: channel + priority + days */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Source channel */}
        <span className={cn('inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded', channelInfo.color)}>
          {channelInfo.icon}
        </span>

        {/* Priority */}
        {deal.priority !== 'media' && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', PRIORITY_COLORS[deal.priority])}>
            {deal.priority}
          </span>
        )}

        {/* Tags (max 2) */}
        {deal.tags.slice(0, 2).map(tag => (
          <span key={tag} className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
        {deal.tags.length > 2 && (
          <span className="text-xs text-gray-400">+{deal.tags.length - 2}</span>
        )}

        {/* Days in stage */}
        <span className="ml-auto inline-flex items-center gap-0.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {daysInStage}d
        </span>
      </div>
    </div>
  )
}
