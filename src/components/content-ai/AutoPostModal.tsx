'use client'

import { useState, useEffect } from 'react'
import { X, Instagram, Facebook, Send, Clock, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react'

interface MetaConnection {
  id: string
  platform: 'instagram' | 'facebook'
  account_name: string | null
  account_username: string | null
}

interface AutoPostModalProps {
  isOpen: boolean
  onClose: () => void
  caption: string
  hashtags: string[]
  mediaUrls: string[]
  mediaType?: 'image' | 'video' | 'carousel' | 'reel'
}

type PostMode = 'now' | 'schedule'
type PostStatus = 'idle' | 'loading' | 'success' | 'error'

export function AutoPostModal({
  isOpen,
  onClose,
  caption,
  hashtags,
  mediaUrls,
  mediaType = 'image',
}: AutoPostModalProps) {
  const [connections, setConnections] = useState<MetaConnection[]>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [postMode, setPostMode] = useState<PostMode>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [status, setStatus] = useState<PostStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [permalink, setPermalink] = useState<string | null>(null)
  const [loadingConnections, setLoadingConnections] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadConnections()
      // Default: amanhã ao meio-dia
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      setScheduledDate(tomorrow.toISOString().split('T')[0])
      setScheduledTime('12:00')
    }
  }, [isOpen])

  async function loadConnections() {
    setLoadingConnections(true)
    try {
      const res = await fetch('/api/meta/accounts')
      if (res.ok) {
        const data = await res.json() as { connections: MetaConnection[] }
        setConnections(data.connections ?? [])
        if (data.connections?.length) {
          // Preferir Instagram
          const ig = data.connections.find(c => c.platform === 'instagram')
          setSelectedConnectionId(ig?.id ?? data.connections[0].id)
        }
      }
    } finally {
      setLoadingConnections(false)
    }
  }

  async function handlePost() {
    if (!selectedConnectionId) return

    setStatus('loading')
    setStatusMessage(postMode === 'now' ? 'Publicando...' : 'Agendando...')

    try {
      if (postMode === 'now') {
        const res = await fetch('/api/meta/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: selectedConnectionId,
            caption,
            mediaUrls,
            mediaType,
            hashtags,
          }),
        })
        const data = await res.json() as { success?: boolean; permalink?: string; error?: string }

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? 'Erro ao publicar')
        }

        setPermalink(data.permalink ?? null)
        setStatus('success')
        setStatusMessage('Publicado com sucesso!')
      } else {
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

        const res = await fetch('/api/meta/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionId: selectedConnectionId,
            caption,
            mediaUrls,
            mediaType,
            hashtags,
            scheduledFor,
          }),
        })
        const data = await res.json() as { success?: boolean; error?: string }

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? 'Erro ao agendar')
        }

        setStatus('success')
        setStatusMessage(`Post agendado para ${scheduledDate} às ${scheduledTime}`)
      }
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  if (!isOpen) return null

  const selectedConn = connections.find(c => c.id === selectedConnectionId)
  const isInstagram = selectedConn?.platform === 'instagram'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5" />
            <span className="font-semibold">Auto-publicar</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">PRO MAX</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {status === 'success' ? (
            /* Success State */
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{statusMessage}</p>
                {permalink && (
                  <a
                    href={permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:underline mt-1 inline-block"
                  >
                    Ver post →
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          ) : status === 'error' ? (
            /* Error State */
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">Erro na publicação</p>
                  <p className="text-sm text-red-600 mt-1">{statusMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setStatus('idle')}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl font-medium transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Preview da legenda */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 max-h-24 overflow-y-auto">
                <p className="whitespace-pre-line line-clamp-4">{caption}</p>
                {hashtags.length > 0 && (
                  <p className="text-purple-600 text-xs mt-1">{hashtags.slice(0, 5).join(' ')}...</p>
                )}
              </div>

              {/* Seleção de conta */}
              {loadingConnections ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando contas...
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-gray-500">Nenhuma conta conectada.</p>
                  <a
                    href="/api/meta/connect"
                    className="inline-flex items-center gap-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="w-4 h-4" />
                    Conectar Instagram
                  </a>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Publicar em
                  </label>
                  <div className="space-y-2">
                    {connections.map(conn => (
                      <button
                        key={conn.id}
                        onClick={() => setSelectedConnectionId(conn.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          selectedConnectionId === conn.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          conn.platform === 'instagram'
                            ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400'
                            : 'bg-blue-600'
                        }`}>
                          {conn.platform === 'instagram'
                            ? <Instagram className="w-4 h-4 text-white" />
                            : <Facebook className="w-4 h-4 text-white" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {conn.account_username ? `@${conn.account_username}` : conn.account_name ?? 'Conta'}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">{conn.platform}</p>
                        </div>
                        {selectedConnectionId === conn.id && (
                          <CheckCircle className="w-4 h-4 text-purple-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modo: agora ou agendar */}
              {connections.length > 0 && (
                <>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
                      Quando publicar
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPostMode('now')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          postMode === 'now'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Send className="w-4 h-4" />
                        Agora
                      </button>
                      <button
                        onClick={() => setPostMode('schedule')}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          postMode === 'schedule'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        Agendar
                      </button>
                    </div>
                  </div>

                  {postMode === 'schedule' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Data</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={e => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Horário</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={e => setScheduledTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Aviso de Reel sem vídeo */}
                  {mediaType === 'reel' && mediaUrls.length === 0 && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>
                        Para publicar um Reel no Instagram é necessário o <strong>arquivo de vídeo</strong>.
                        Você pode publicar a imagem de capa como post enquanto edita o vídeo.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handlePost}
                    disabled={status === 'loading' || !selectedConnectionId}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {statusMessage}
                      </>
                    ) : (
                      <>
                        {postMode === 'now'
                          ? <><Send className="w-4 h-4" /> Publicar agora</>
                          : <><Clock className="w-4 h-4" /> Agendar post</>
                        }
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    {isInstagram
                      ? 'Requer conta Business ou Creator com Página do Facebook vinculada'
                      : 'Publicando na Página do Facebook selecionada'}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
