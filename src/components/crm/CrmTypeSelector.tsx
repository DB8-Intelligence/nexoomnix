'use client'

import { useState } from 'react'
import { ShoppingCart, Home, CalendarCheck, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CrmType } from '@/types/database'

const CRM_OPTIONS: {
  type: CrmType
  title: string
  description: string
  icon: React.ReactNode
  stages: string[]
  features: string[]
  color: string
}[] = [
  {
    type: 'vendas',
    title: 'CRM Vendas',
    description: 'Pipeline de vendas com funil completo. Ideal para servicos tecnicos, engenharia, fotografia e consultorias.',
    icon: <ShoppingCart className="w-6 h-6" />,
    stages: ['Novo Lead', 'Primeiro Contato', 'Qualificado', 'Proposta Enviada', 'Negociacao', 'Fechado Ganho', 'Perdido'],
    features: ['Funil Kanban drag & drop', 'Valor estimado por deal', 'Taxa de conversao', 'Motivo de perda obrigatorio'],
    color: '#3b82f6',
  },
  {
    type: 'imobiliario',
    title: 'CRM Imobiliario',
    description: 'Pipeline especializado para corretores de imoveis. Controle de visitas, tipo de interesse e match de imoveis.',
    icon: <Home className="w-6 h-6" />,
    stages: ['Lead Captado', 'Contato Inicial', 'Visita Agendada', 'Visita Realizada', 'Proposta', 'Documentacao', 'Fechado', 'Desistencia'],
    features: ['Tipo de interesse (Compra/Aluguel)', 'Faixa de preco do cliente', 'Areas de preferencia', 'Vinculo com imoveis'],
    color: '#059669',
  },
  {
    type: 'atendimento',
    title: 'CRM Atendimento',
    description: 'Pipeline focado em agendamentos e fidelizacao. Ideal para saude, beleza, pet, educacao e gastronomia.',
    icon: <CalendarCheck className="w-6 h-6" />,
    stages: ['Novo Contato', 'Agendamento Pendente', 'Agendado', 'Atendido', 'Retorno Pendente', 'Fidelizado', 'Inativo'],
    features: ['Integracao com Agenda', 'Alerta de clientes inativos', 'Contagem de visitas', 'Terminologia adaptada por nicho'],
    color: '#8b5cf6',
  },
]

interface CrmTypeSelectorProps {
  suggestedType: CrmType
  onSelect: (type: CrmType) => Promise<void>
  primaryColor: string
}

export function CrmTypeSelector({ suggestedType, onSelect, primaryColor }: CrmTypeSelectorProps) {
  const [selected, setSelected] = useState<CrmType>(suggestedType)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onSelect(selected)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Escolha seu tipo de CRM</h1>
        <p className="text-gray-500">Selecione o modelo que melhor se adapta ao seu negocio. Voce pode trocar depois nas configuracoes.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {CRM_OPTIONS.map(option => (
          <button
            key={option.type}
            type="button"
            onClick={() => setSelected(option.type)}
            className={cn(
              'text-left p-5 rounded-2xl border-2 transition-all',
              selected === option.type
                ? 'border-gray-900 bg-gray-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            )}
          >
            {/* Badge: sugerido */}
            {option.type === suggestedType && (
              <span className="inline-block text-xs font-semibold text-white px-2 py-0.5 rounded-full mb-3"
                style={{ backgroundColor: option.color }}>
                Sugerido para seu nicho
              </span>
            )}

            {/* Icon + Title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${option.color}15`, color: option.color }}>
                {option.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{option.title}</h3>
            </div>

            <p className="text-sm text-gray-500 mb-4">{option.description}</p>

            {/* Stages preview */}
            <div className="mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Etapas do funil</span>
              <div className="flex flex-wrap gap-1">
                {option.stages.map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-1">
              {option.features.map(f => (
                <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          {loading ? 'Criando pipeline...' : 'Ativar CRM'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
