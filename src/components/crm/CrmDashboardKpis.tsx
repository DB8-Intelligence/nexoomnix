'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, DollarSign, Clock, BarChart3, PieChart } from 'lucide-react'
import type { CrmStage, CrmDeal, CrmType } from '@/types/database'

interface CrmDashboardKpisProps {
  stages: CrmStage[]
  deals: CrmDeal[]
  crmType: CrmType
  primaryColor: string
}

export function CrmDashboardKpis({ stages, deals, crmType, primaryColor }: CrmDashboardKpisProps) {
  const stats = useMemo(() => {
    const wonStage = stages.find(s => s.is_won)
    const lostStage = stages.find(s => s.is_lost)

    const wonDeals = wonStage ? deals.filter(d => d.stage_id === wonStage.id) : []
    const lostDeals = lostStage ? deals.filter(d => d.stage_id === lostStage.id) : []
    const activeDeals = deals.filter(d => {
      const stage = stages.find(s => s.id === d.stage_id)
      return stage && !stage.is_won && !stage.is_lost
    })

    const totalPipelineValue = activeDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const conversionRate = deals.length > 0
      ? Math.round((wonDeals.length / deals.length) * 100)
      : 0

    // Average days to close
    const closedDeals = wonDeals.filter(d => d.won_at)
    const avgDaysToClose = closedDeals.length > 0
      ? Math.round(closedDeals.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime()
          const closed = new Date(d.won_at!).getTime()
          return sum + (closed - created) / (1000 * 60 * 60 * 24)
        }, 0) / closedDeals.length)
      : 0

    // Leads by channel
    const byChannel: Record<string, number> = {}
    for (const deal of deals) {
      byChannel[deal.source_channel] = (byChannel[deal.source_channel] || 0) + 1
    }

    // This week's new leads
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newThisWeek = deals.filter(d => new Date(d.created_at) >= weekAgo).length

    // Deals per stage (funnel)
    const funnel = stages
      .filter(s => !s.is_won && !s.is_lost)
      .map(s => ({
        name: s.name,
        color: s.color,
        count: deals.filter(d => d.stage_id === s.id).length,
        value: deals.filter(d => d.stage_id === s.id).reduce((sum, d) => sum + (d.estimated_value || 0), 0),
      }))

    return {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      totalPipelineValue,
      wonValue,
      conversionRate,
      avgDaysToClose,
      byChannel,
      newThisWeek,
      funnel,
    }
  }, [stages, deals])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const CHANNEL_NAMES: Record<string, string> = {
    whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook',
    telegram: 'Telegram', site: 'Site', telefone: 'Telefone',
    indicacao: 'Indicacao', google: 'Google', outro: 'Outro',
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            Leads ativos
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.activeDeals}</p>
          <p className="text-xs text-green-600 mt-1">+{stats.newThisWeek} esta semana</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            Valor do pipeline
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPipelineValue)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            Taxa de conversao
          </div>
          <p className="text-2xl font-bold" style={{ color: primaryColor }}>{stats.conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{stats.wonDeals} ganhos de {stats.totalDeals}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            Tempo medio
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.avgDaysToClose}d</p>
          <p className="text-xs text-gray-500 mt-1">ate fechar</p>
        </div>
      </div>

      {/* Funnel visualization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Funil de {crmType === 'vendas' ? 'Vendas' : crmType === 'imobiliario' ? 'Negocios' : 'Atendimento'}
        </h3>
        <div className="space-y-3">
          {stats.funnel.map((stage, idx) => {
            const maxCount = Math.max(...stats.funnel.map(s => s.count), 1)
            const pct = (stage.count / maxCount) * 100
            return (
              <div key={stage.name} className="flex items-center gap-3">
                <div className="w-32 text-xs font-medium text-gray-700 truncate">{stage.name}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center px-2 transition-all"
                    style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: stage.color }}
                  >
                    <span className="text-xs font-bold text-white">{stage.count}</span>
                  </div>
                </div>
                <div className="w-24 text-xs text-gray-500 text-right">
                  {formatCurrency(stage.value)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leads by channel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PieChart className="w-4 h-4" />
          Leads por canal de origem
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(stats.byChannel)
            .sort(([, a], [, b]) => b - a)
            .map(([channel, count]) => (
              <div key={channel} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{CHANNEL_NAMES[channel] ?? channel}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
