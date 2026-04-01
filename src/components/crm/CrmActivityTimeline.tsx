'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight, MessageCircle, Phone, Mail, Calendar,
  DollarSign, FileText, MapPin, Trophy, XCircle, StickyNote, Zap
} from 'lucide-react'
import type { CrmActivity, CrmActivityType } from '@/types/database'

const ACTIVITY_CONFIG: Record<CrmActivityType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  stage_change: { icon: <ArrowRight className="w-3.5 h-3.5" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  note: { icon: <StickyNote className="w-3.5 h-3.5" />, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  call: { icon: <Phone className="w-3.5 h-3.5" />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  email_sent: { icon: <Mail className="w-3.5 h-3.5" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  whatsapp_sent: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  instagram_dm: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  facebook_msg: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  appointment_created: { icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  appointment_confirmed: { icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  transaction_created: { icon: <DollarSign className="w-3.5 h-3.5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  proposal_sent: { icon: <FileText className="w-3.5 h-3.5" />, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  visit_scheduled: { icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  visit_done: { icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  deal_won: { icon: <Trophy className="w-3.5 h-3.5" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  deal_lost: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  system: { icon: <Zap className="w-3.5 h-3.5" />, color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atras`
  if (hours < 24) return `${hours}h atras`
  if (days < 7) return `${days}d atras`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface CrmActivityTimelineProps {
  activities: CrmActivity[]
  loading?: boolean
}

export function CrmActivityTimeline({ activities, loading }: CrmActivityTimelineProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        Nenhuma atividade registrada ainda
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gray-200" />

      <div className="space-y-4">
        {activities.map((activity) => {
          const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.system
          return (
            <div key={activity.id} className="flex gap-3 relative">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${config.bgColor} ${config.color} z-10`}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                {activity.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{activity.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(activity.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
