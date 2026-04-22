'use client'

import { useState } from 'react'
import { Bug, ExternalLink, Monitor, Smartphone, User, Clock, AlertCircle } from 'lucide-react'

type Status = 'new' | 'triaging' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate'
type Severity = 'low' | 'medium' | 'high' | 'critical'

interface BugReport {
  id: string
  tenant_id: string | null
  user_id: string | null
  reporter_email: string | null
  description: string
  url: string
  user_agent: string | null
  viewport_w: number | null
  viewport_h: number | null
  console_logs: Array<{ level: string; message: string; timestamp: number }>
  fetch_traces: Array<{ method: string; url: string; status?: number; error?: string }>
  selector: string | null
  element_html: string | null
  screenshot_url: string | null
  replay_url: string | null
  severity: Severity
  status: Status
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
}

const STATUS_LABELS: Record<Status, string> = {
  new:         'Novo',
  triaging:    'Triando',
  in_progress: 'Em análise',
  resolved:    'Resolvido',
  wont_fix:    'Won\'t fix',
  duplicate:   'Duplicado',
}

const STATUS_COLORS: Record<Status, string> = {
  new:         'bg-red-50 text-red-700 border-red-200',
  triaging:    'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  wont_fix:    'bg-gray-100 text-gray-600 border-gray-200',
  duplicate:   'bg-gray-100 text-gray-600 border-gray-200',
}

const SEVERITY_COLORS: Record<Severity, string> = {
  low:      'bg-gray-100 text-gray-700',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export function BugsAdminClient({ initialBugs }: { initialBugs: BugReport[] }) {
  const [bugs, setBugs] = useState<BugReport[]>(initialBugs)
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [selected, setSelected] = useState<BugReport | null>(null)
  const [notes, setNotes] = useState('')

  const filtered = bugs.filter(b =>
    (filterStatus === 'all' || b.status === filterStatus) &&
    (filterSeverity === 'all' || b.severity === filterSeverity),
  )

  async function update(bug: BugReport, patch: Partial<Pick<BugReport, 'status' | 'severity' | 'admin_notes'>>) {
    const res = await fetch(`/api/admin/bugs/${bug.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      alert('Falha ao atualizar')
      return
    }
    const data = await res.json() as { bug: BugReport }
    setBugs(prev => prev.map(b => b.id === bug.id ? data.bug : b))
    if (selected?.id === bug.id) setSelected(data.bug)
  }

  async function remove(bug: BugReport) {
    if (!confirm('Excluir esse bug report permanentemente?')) return
    const res = await fetch(`/api/admin/bugs/${bug.id}`, { method: 'DELETE' })
    if (!res.ok) { alert('Falha ao excluir'); return }
    setBugs(prev => prev.filter(b => b.id !== bug.id))
    if (selected?.id === bug.id) setSelected(null)
  }

  function openDetail(b: BugReport) {
    setSelected(b)
    setNotes(b.admin_notes ?? '')
  }

  const counts = {
    new:         bugs.filter(b => b.status === 'new').length,
    in_progress: bugs.filter(b => b.status === 'in_progress').length,
    total:       bugs.length,
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bug className="w-6 h-6 text-red-600" /> Bug Reports
        </h1>
        <p className="text-sm text-gray-500">
          {counts.new} novos · {counts.in_progress} em análise · {counts.total} totais
        </p>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          title="Filtro de status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as Status | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          title="Filtro de severidade"
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value as Severity | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">Todas severidades</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nenhum bug com os filtros atuais.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(b => (
            <button
              type="button"
              key={b.id}
              onClick={() => openDetail(b)}
              className={`text-left bg-white border rounded-xl p-4 hover:border-indigo-400 transition-all ${selected?.id === b.id ? 'border-indigo-500 shadow' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[b.status]}`}>
                  {STATUS_LABELS[b.status]}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[b.severity]}`}>
                  {b.severity}
                </span>
              </div>
              <div className="text-sm text-gray-900 line-clamp-3 mb-2">
                {b.description}
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div className="truncate">{new URL(b.url).pathname}</div>
                <div>{new Date(b.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={() => setSelected(null)}>
          <div
            className="bg-white h-full w-full max-w-2xl overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-gray-900">Detalhes do bug</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
              >
                Fechar
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  title="Status"
                  value={selected.status}
                  onChange={e => update(selected, { status: e.target.value as Status })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <select
                  title="Severidade"
                  value={selected.severity}
                  onChange={e => update(selected, { severity: e.target.value as Severity })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
                <button
                  type="button"
                  onClick={() => remove(selected)}
                  className="ml-auto text-xs text-red-600 hover:underline"
                >
                  Excluir
                </button>
              </div>

              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Descrição</h3>
                <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {selected.description}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><User className="w-3 h-3" /> Reporter</div>
                  <div className="text-gray-900">{selected.reporter_email ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Data</div>
                  <div className="text-gray-900">{new Date(selected.created_at).toLocaleString('pt-BR')}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><ExternalLink className="w-3 h-3" /> URL</div>
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs break-all">
                    {selected.url}
                  </a>
                </div>
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    {(selected.viewport_w ?? 0) < 768 ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                    Viewport
                  </div>
                  <div className="text-gray-900">{selected.viewport_w}x{selected.viewport_h}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">User Agent</div>
                  <div className="text-gray-900 text-xs truncate" title={selected.user_agent ?? ''}>{selected.user_agent ?? '—'}</div>
                </div>
              </section>

              {selected.screenshot_url && (
                <section>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Screenshot</h3>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.screenshot_url} alt="Screenshot" className="w-full border border-gray-200 rounded-lg" />
                </section>
              )}

              {selected.console_logs.length > 0 && (
                <section>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Console ({selected.console_logs.length})
                  </h3>
                  <div className="bg-gray-900 text-gray-100 text-xs font-mono p-3 rounded-lg max-h-80 overflow-y-auto space-y-1">
                    {selected.console_logs.map((log, i) => (
                      <div key={i} className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-300' : 'text-gray-300'}>
                        [{log.level}] {log.message}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selected.fetch_traces.length > 0 && (
                <section>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Fetch traces ({selected.fetch_traces.length})</h3>
                  <div className="bg-gray-50 text-xs font-mono p-3 rounded-lg max-h-60 overflow-y-auto space-y-1">
                    {selected.fetch_traces.map((f, i) => (
                      <div key={i} className={f.error || (f.status && f.status >= 400) ? 'text-red-600' : 'text-gray-700'}>
                        {f.method} {f.url} → {f.status ?? '???'} {f.error ? `(${f.error})` : ''}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {selected.element_html && (
                <section>
                  <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Elemento inspecionado</h3>
                  {selected.selector && (
                    <div className="text-xs text-gray-600 mb-1 font-mono">{selected.selector}</div>
                  )}
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">{selected.element_html}</pre>
                </section>
              )}

              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Notas admin</h3>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes !== (selected.admin_notes ?? '')) {
                      update(selected, { admin_notes: notes })
                    }
                  }}
                  rows={4}
                  placeholder="Anotações internas, link pra PR, contexto..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
