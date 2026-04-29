'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Play, Pause, Trash2, Plus } from 'lucide-react'

type Frequency = 'daily' | '3x_week' | '5x_week' | 'weekly'
type Format = 'feed' | 'reel'
type Duration = 15 | 30 | 60

interface Schedule {
  id: string
  name: string
  topic_hint: string | null
  frequency: Frequency
  hour_of_day: number
  timezone: string
  format: Format
  duration_sec: Duration
  is_active: boolean
  last_run_at: string | null
  next_run_at: string
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily:    'Diário',
  '5x_week': '5x por semana',
  '3x_week': '3x por semana',
  weekly:   'Semanal',
}

export function AutopilotSchedulesPanel() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    topic_hint: '',
    frequency: 'weekly' as Frequency,
    hour_of_day: 9,
    format: 'feed' as Format,
    duration_sec: 15 as Duration,
  })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/content-schedules')
      const data = await res.json() as { schedules: Schedule[] }
      setSchedules(data.schedules ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/content-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ name: '', topic_hint: '', frequency: 'weekly', hour_of_day: 9, format: 'feed', duration_sec: 15 })
        setShowForm(false)
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggle(s: Schedule) {
    await fetch(`/api/content-schedules/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    })
    await load()
  }

  async function remove(s: Schedule) {
    if (!confirm(`Excluir o schedule "${s.name}"?`)) return
    await fetch(`/api/content-schedules/${s.id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            Autopilot de conteúdo
          </h2>
          <p className="text-sm text-gray-500">
            A IA gera rascunhos de post automaticamente na cadência que você definir.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" /> Novo schedule
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder='Nome do schedule (ex: "Posts semanais de autocuidado")'
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <textarea
            value={form.topic_hint}
            onChange={e => setForm({ ...form, topic_hint: e.target.value })}
            placeholder="Tópico/ângulo (opcional). Ex: dicas semanais para pacientes pediátricos"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              title="Frequência"
              value={form.frequency}
              onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              <option value="daily">Diário</option>
              <option value="5x_week">5x por semana</option>
              <option value="3x_week">3x por semana</option>
              <option value="weekly">Semanal</option>
            </select>
            <select
              title="Horário"
              value={form.hour_of_day}
              onChange={e => setForm({ ...form, hour_of_day: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ name: '', topic_hint: '', frequency: 'weekly', hour_of_day: 9, format: 'feed' as Format, duration_sec: 15 as Duration }) }}
              className="px-3 py-2 text-gray-600 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={create}
              disabled={saving || !form.name.trim()}
              className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar schedule'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum schedule ativo. Crie um pra começar.
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map(s => (
            <div
              key={s.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <span className="font-medium text-gray-900 truncate">{s.name}</span>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${s.format === 'reel' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                    {s.format === 'reel' ? `Reel ${s.duration_sec}s` : 'Feed'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {FREQUENCY_LABELS[s.frequency]} · {String(s.hour_of_day).padStart(2, '0')}:00
                  {s.topic_hint && ` · ${s.topic_hint}`}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Próximo: {new Date(s.next_run_at).toLocaleString('pt-BR')}
                  {s.last_run_at && ` · Último: ${new Date(s.last_run_at).toLocaleString('pt-BR')}`}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => toggle(s)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg"
                  title={s.is_active ? 'Pausar' : 'Ativar'}
                >
                  {s.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
