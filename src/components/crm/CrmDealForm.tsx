'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, MessageCircle, DollarSign, Tag, Calendar } from 'lucide-react'
import type { CrmChannelType, DealPriority, CrmType, Client } from '@/types/database'
import type { DealFormData } from '@/hooks/useCrm'

const CHANNELS: { value: CrmChannelType; label: string; icon: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'facebook', label: 'Facebook', icon: '👤' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'site', label: 'Site', icon: '🌐' },
  { value: 'telefone', label: 'Telefone', icon: '📞' },
  { value: 'indicacao', label: 'Indicacao', icon: '🤝' },
  { value: 'google', label: 'Google/Ads', icon: '🔍' },
  { value: 'outro', label: 'Outro', icon: '📌' },
]

const PRIORITIES: { value: DealPriority; label: string; color: string }[] = [
  { value: 'baixa', label: 'Baixa', color: 'text-gray-600' },
  { value: 'media', label: 'Media', color: 'text-blue-600' },
  { value: 'alta', label: 'Alta', color: 'text-orange-600' },
  { value: 'urgente', label: 'Urgente', color: 'text-red-600' },
]

interface CrmDealFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: DealFormData) => Promise<void>
  crmType: CrmType
  clients: Client[]
  initialData?: Partial<DealFormData>
  isEditing?: boolean
}

export function CrmDealForm({
  isOpen, onClose, onSubmit, crmType, clients, initialData, isEditing,
}: CrmDealFormProps) {
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState<DealFormData>({
    title: '',
    contact_name: null,
    contact_phone: null,
    contact_email: null,
    contact_whatsapp: null,
    estimated_value: 0,
    source_channel: 'whatsapp',
    source_detail: null,
    priority: 'media',
    assigned_to: null,
    expected_close_at: null,
    client_id: null,
    tags: [],
    notes: null,
    property_id: null,
    interest_type: null,
    price_min: null,
    price_max: null,
    preferred_areas: [],
  })

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({ ...prev, ...initialData }))
    } else {
      setForm({
        title: '', contact_name: null, contact_phone: null,
        contact_email: null, contact_whatsapp: null, estimated_value: 0,
        source_channel: 'whatsapp', source_detail: null, priority: 'media',
        assigned_to: null, expected_close_at: null, client_id: null,
        tags: [], notes: null, property_id: null, interest_type: null,
        price_min: null, price_max: null, preferred_areas: [],
      })
    }
  }, [initialData, isOpen])

  // When client selected, auto-fill contact info
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setForm(prev => ({
        ...prev,
        client_id: clientId,
        contact_name: client.full_name,
        contact_phone: client.phone,
        contact_email: client.email,
        contact_whatsapp: client.whatsapp,
      }))
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSubmit(form)
    setSaving(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Editar Deal' : 'Novo Deal'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Lead via Instagram - Maria Silva"
            />
          </div>

          {/* Select existing client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a cliente existente</label>
            <select
              value={form.client_id ?? ''}
              onChange={e => e.target.value ? handleClientSelect(e.target.value) : setForm(prev => ({ ...prev, client_id: null }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Novo contato (sem vincular)</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>

          {/* Contact info (2x2 grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do contato</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={form.contact_name ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, contact_name: e.target.value || null }))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="Nome"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
              <div className="relative">
                <MessageCircle className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={form.contact_whatsapp ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, contact_whatsapp: e.target.value || null }))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={form.contact_phone ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, contact_phone: e.target.value || null }))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="(11) 3333-4444"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="email"
                  value={form.contact_email ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, contact_email: e.target.value || null }))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>

          {/* Value + Channel + Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor estimado</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.estimated_value || ''}
                  onChange={e => setForm(prev => ({ ...prev, estimated_value: parseFloat(e.target.value) || 0 }))}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Canal de origem</label>
              <select
                value={form.source_channel}
                onChange={e => setForm(prev => ({ ...prev, source_channel: e.target.value as CrmChannelType }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                {CHANNELS.map(ch => (
                  <option key={ch.value} value={ch.value}>{ch.icon} {ch.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridade</label>
              <select
                value={form.priority}
                onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as DealPriority }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Imobiliario-specific fields */}
          {crmType === 'imobiliario' && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados Imobiliarios</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de interesse</label>
                  <select
                    value={form.interest_type ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, interest_type: e.target.value || null }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="">Selecionar</option>
                    <option value="compra">Compra</option>
                    <option value="aluguel">Aluguel</option>
                    <option value="avaliacao">Avaliacao</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Faixa de preco (min)</label>
                  <input
                    type="number" step="1000" min="0"
                    value={form.price_min ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, price_min: parseFloat(e.target.value) || null }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    placeholder="R$ min"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Faixa de preco (max)</label>
                  <input
                    type="number" step="1000" min="0"
                    value={form.price_max ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, price_max: parseFloat(e.target.value) || null }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    placeholder="R$ max"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Expected close date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Previsao de fechamento</label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={form.expected_close_at?.split('T')[0] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, expected_close_at: e.target.value ? `${e.target.value}T00:00:00Z` : null }))}
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                placeholder="Adicionar tag..."
              />
              <button type="button" onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
                +
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md">
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observacoes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value || null }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm resize-none"
              placeholder="Notas sobre este deal..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
