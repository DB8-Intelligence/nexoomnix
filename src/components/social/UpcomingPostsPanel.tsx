'use client'

import { useEffect, useState } from 'react'
import { Loader2, Clock, X, Edit2, CheckCircle2, AlertCircle, Send } from 'lucide-react'

type Status = 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'

interface ScheduledPost {
  id: string
  caption: string
  media_urls: string[] | null
  media_type: string | null
  hashtags: string[] | null
  status: Status
  scheduled_for: string | null
  published_at: string | null
  platform_permalink: string | null
  error_message: string | null
  attempts: number
}

const STATUS_BADGES: Record<Status, { label: string; className: string; Icon: typeof Clock }> = {
  scheduled:  { label: 'Agendado',     className: 'bg-blue-50 text-blue-700',       Icon: Clock },
  publishing: { label: 'Publicando…',  className: 'bg-amber-50 text-amber-700',     Icon: Send },
  published:  { label: 'Publicado',    className: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  failed:     { label: 'Falhou',       className: 'bg-red-50 text-red-700',         Icon: AlertCircle },
  cancelled:  { label: 'Cancelado',    className: 'bg-gray-100 text-gray-600',      Icon: X },
}

export function UpcomingPostsPanel() {
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/scheduled-posts?upcoming=true')
      const data = await res.json() as { posts: ScheduledPost[] }
      setPosts(data.posts ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function cancel(p: ScheduledPost) {
    if (!confirm(`Cancelar o post agendado pra ${new Date(p.scheduled_for ?? '').toLocaleString('pt-BR')}?`)) return
    const res = await fetch(`/api/scheduled-posts/${p.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      alert(data.error ?? 'Falha ao cancelar')
    }
    await load()
  }

  function startEdit(p: ScheduledPost) {
    setEditing(p.id)
    setEditCaption(p.caption)
  }

  async function saveEdit(p: ScheduledPost) {
    const res = await fetch(`/api/scheduled-posts/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: editCaption }),
    })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      alert(data.error ?? 'Falha ao salvar')
      return
    }
    setEditing(null)
    await load()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Próximas publicações
        </h2>
        <p className="text-sm text-gray-500">
          Posts agendados pelo autopilot ou manualmente. Cancele ou edite antes do horário.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nada na fila. Crie um schedule em /conteudo/autopilot pra começar.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => {
            const badge = STATUS_BADGES[p.status]
            const BadgeIcon = badge.Icon
            const preview = p.media_urls?.[0]
            const canEdit = p.status === 'scheduled'
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4">
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="w-24 h-24 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                      <BadgeIcon className="w-3 h-3" /> {badge.label}
                    </span>
                    {p.scheduled_for && (
                      <span className="text-xs text-gray-500">
                        {new Date(p.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                    {p.attempts > 0 && (
                      <span className="text-xs text-amber-600">{p.attempts} tentativa{p.attempts > 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {editing === p.id ? (
                    <textarea
                      value={editCaption}
                      onChange={e => setEditCaption(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">
                      {p.caption}
                    </div>
                  )}

                  {p.error_message && (
                    <div className="text-xs text-red-600 mt-1">⚠ {p.error_message}</div>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-2 mt-2">
                      {editing === p.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(p)}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="px-3 py-1 text-gray-500 text-xs"
                          >
                            Cancelar edição
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded border border-gray-200"
                          >
                            <Edit2 className="w-3 h-3" /> Editar legenda
                          </button>
                          <button
                            type="button"
                            onClick={() => cancel(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                          >
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {p.platform_permalink && (
                    <a
                      href={p.platform_permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-indigo-600 hover:underline"
                    >
                      Ver publicação →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
