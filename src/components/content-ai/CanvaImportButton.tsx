'use client'

import { useEffect, useState } from 'react'
import { Loader2, Link as LinkIcon, Plug, Zap, X } from 'lucide-react'

interface Design {
  id: string
  title?: string
  thumbnail?: { url: string; width: number; height: number }
  urls?: { edit_url: string; view_url: string }
}

interface Status {
  connected: boolean
  configured: boolean
  expired?: boolean
}

export function CanvaImportButton({ onImported }: { onImported?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [designs, setDesigns] = useState<Design[]>([])
  const [continuation, setContinuation] = useState<string | undefined>()
  const [loadingDesigns, setLoadingDesigns] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [format, setFormat] = useState<'feed' | 'story' | 'reel_cover'>('feed')

  async function loadStatus() {
    const res = await fetch('/api/canva/status')
    const data = await res.json() as Status
    setStatus(data)
  }

  useEffect(() => {
    loadStatus()
    // Detecta redirect bem-sucedido do callback
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('canva') === 'connected') {
        url.searchParams.delete('canva')
        window.history.replaceState({}, '', url.toString())
        loadStatus()
      }
      const err = url.searchParams.get('canva_error')
      if (err) {
        alert(`Falha ao conectar Canva: ${err}`)
        url.searchParams.delete('canva_error')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [])

  async function openModal() {
    setModalOpen(true)
    setLoadingDesigns(true)
    try {
      const res = await fetch('/api/canva/designs?limit=20')
      if (res.status === 401) {
        const data = await res.json() as { needsReconnect?: boolean }
        if (data.needsReconnect) {
          alert('Sessão Canva expirou. Reconecte sua conta.')
          setModalOpen(false)
          setStatus(s => s ? { ...s, connected: false } : null)
          return
        }
      }
      const data = await res.json() as { items: Design[]; continuation?: string }
      setDesigns(data.items ?? [])
      setContinuation(data.continuation)
    } finally {
      setLoadingDesigns(false)
    }
  }

  async function loadMore() {
    if (!continuation) return
    setLoadingDesigns(true)
    try {
      const res = await fetch(`/api/canva/designs?limit=20&continuation=${encodeURIComponent(continuation)}`)
      const data = await res.json() as { items: Design[]; continuation?: string }
      setDesigns(prev => [...prev, ...(data.items ?? [])])
      setContinuation(data.continuation)
    } finally {
      setLoadingDesigns(false)
    }
  }

  async function importDesign(d: Design) {
    setImportingId(d.id)
    try {
      const res = await fetch('/api/canva/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_id:      d.id,
          design_title:   d.title,
          canva_edit_url: d.urls?.edit_url,
          format,
        }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        alert(data.error ?? 'Falha ao importar')
        return
      }
      onImported?.()
      // Mantém modal aberto pra permitir importar vários.
    } finally {
      setImportingId(null)
    }
  }

  async function disconnect() {
    if (!confirm('Desconectar sua conta Canva?')) return
    await fetch('/api/canva/status', { method: 'DELETE' })
    setStatus(s => s ? { ...s, connected: false } : null)
  }

  if (!status) {
    return (
      <button type="button" disabled className="px-3 py-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    )
  }

  if (!status.configured) {
    return (
      <span className="text-xs text-gray-400 px-2">Canva OAuth não configurado</span>
    )
  }

  if (!status.connected) {
    return (
      <a
        href="/api/canva/connect"
        className="inline-flex items-center gap-2 px-3 py-2 border border-violet-300 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50"
      >
        <Plug className="w-4 h-4" /> Conectar Canva
      </a>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
        >
          <Zap className="w-4 h-4" /> Importar do Canva
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="text-xs text-gray-400 hover:text-gray-600"
          title="Desconectar conta Canva"
        >
          desconectar
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Seus designs no Canva</h3>
                <p className="text-sm text-gray-500">Clique em um design pra importar pra biblioteca</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  title="Formato de importação"
                  value={format}
                  onChange={e => setFormat(e.target.value as 'feed' | 'story' | 'reel_cover')}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="feed">Feed (1:1)</option>
                  <option value="story">Story (9:16)</option>
                  <option value="reel_cover">Capa de Reel</option>
                </select>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingDesigns && designs.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : designs.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  Nenhum design encontrado na sua conta Canva.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {designs.map(d => {
                    const isImporting = importingId === d.id
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => importDesign(d)}
                        disabled={isImporting}
                        className="group relative aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200 hover:border-violet-400 transition-all disabled:opacity-60"
                      >
                        {d.thumbnail?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.thumbnail.url} alt={d.title ?? d.id} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <LinkIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                          <div className="text-xs text-white font-medium truncate">{d.title ?? 'Sem título'}</div>
                        </div>
                        {isImporting && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                          </div>
                        )}
                        {!isImporting && (
                          <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/20 transition-colors" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {continuation && !loadingDesigns && (
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    className="px-4 py-2 text-sm text-violet-700 hover:bg-violet-50 rounded-lg"
                  >
                    Carregar mais
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
