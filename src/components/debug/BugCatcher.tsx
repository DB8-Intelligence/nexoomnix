'use client'

// Bug-catcher — Nível 1 + Nível 2.
//
// Nível 1 (já existia):
//  - URL, user-agent, viewport
//  - Ring buffer de console.log/warn/error/info
//  - window.onerror + unhandledrejection
//
// Nível 2 (novo):
//  - Interceptor de window.fetch: method, url, status, duração, erro
//  - Screenshot via html2canvas com upload pro Storage
//  - Modo inspetor: Alt+click em elemento captura selector + outerHTML
//  - Triggered externally via window.__openBugCatcher() pra ErrorBoundary
//
// Tudo fica atrás do flag `enabled` (staff DB8) por ora.

import { useEffect, useRef, useState } from 'react'
import { Bug, Loader2, X, CheckCircle2, Camera, Target, Image as ImageIcon, Video } from 'lucide-react'

type Severity = 'low' | 'medium' | 'high' | 'critical'

interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

interface FetchTrace {
  method: string
  url: string
  status?: number
  durationMs?: number
  timestamp: number
  error?: string
}

interface ElementSnapshot {
  selector: string
  outerHtml: string
}

const LOG_BUFFER_LIMIT = 30
const FETCH_BUFFER_LIMIT = 20
const FETCH_URL_MAX = 300
const REPLAY_WINDOW_MS = 60_000 // mantém últimos 60s de session replay

// Gera um seletor CSS razoavelmente único pro elemento.
function cssPath(el: Element): string {
  const parts: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && node.nodeType === Node.ELEMENT_NODE && depth < 5) {
    let segment = node.nodeName.toLowerCase()
    if (node.id) {
      segment += `#${node.id}`
      parts.unshift(segment)
      break
    }
    const classes = (node.className && typeof node.className === 'string')
      ? node.className.trim().split(/\s+/).slice(0, 2).join('.')
      : ''
    if (classes) segment += `.${classes}`
    const parent = node.parentElement
    if (parent) {
      const idx = Array.from(parent.children).filter(c => c.nodeName === node!.nodeName).indexOf(node)
      if (idx > 0) segment += `:nth-of-type(${idx + 1})`
    }
    parts.unshift(segment)
    node = node.parentElement
    depth++
  }
  return parts.join(' > ')
}

declare global {
  interface Window {
    __openBugCatcher?: (prefill?: { description?: string; severity?: Severity }) => void
  }
}

export function BugCatcher({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [screenshotting, setScreenshotting] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [inspecting, setInspecting] = useState(false)
  const [element, setElement] = useState<ElementSnapshot | null>(null)
  const [replayAttaching, setReplayAttaching] = useState(false)
  const [replayUrl, setReplayUrl] = useState<string | null>(null)

  const consoleBufferRef = useRef<ConsoleEntry[]>([])
  const fetchBufferRef   = useRef<FetchTrace[]>([])
  const replayEventsRef  = useRef<Array<{ type: number; data: unknown; timestamp: number }>>([])
  const replayStopRef    = useRef<(() => void) | null>(null)

  // Hooks globais — console + onerror + fetch interceptor.
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const methods = ['log', 'warn', 'error', 'info', 'debug'] as const
    const originals: Partial<Record<typeof methods[number], (...args: unknown[]) => void>> = {}

    for (const level of methods) {
      const original = console[level].bind(console)
      originals[level] = original
      console[level] = (...args: unknown[]) => {
        try {
          const message = args
            .map(a => {
              if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack ?? ''}`
              if (typeof a === 'object') {
                try { return JSON.stringify(a) } catch { return String(a) }
              }
              return String(a)
            })
            .join(' ')
            .slice(0, 1000)
          consoleBufferRef.current.push({ level, message, timestamp: Date.now() })
          if (consoleBufferRef.current.length > LOG_BUFFER_LIMIT) consoleBufferRef.current.shift()
        } catch { /* never break console */ }
        original(...args)
      }
    }

    const errorHandler = (e: ErrorEvent) => {
      consoleBufferRef.current.push({
        level: 'error',
        message: `[onerror] ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`,
        timestamp: Date.now(),
      })
      if (consoleBufferRef.current.length > LOG_BUFFER_LIMIT) consoleBufferRef.current.shift()
    }
    const rejectHandler = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? `${e.reason.message}\n${e.reason.stack}` : String(e.reason)
      consoleBufferRef.current.push({
        level: 'error',
        message: `[unhandledrejection] ${reason}`.slice(0, 1000),
        timestamp: Date.now(),
      })
      if (consoleBufferRef.current.length > LOG_BUFFER_LIMIT) consoleBufferRef.current.shift()
    }
    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', rejectHandler)

    // Fetch interceptor.
    const originalFetch = window.fetch.bind(window)
    window.fetch = async (...args) => {
      const start = Date.now()
      const input  = args[0]
      const init   = args[1]
      const method = init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')
      const url    = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url)
      const urlShort = url.length > FETCH_URL_MAX ? url.slice(0, FETCH_URL_MAX) + '…' : url
      try {
        const res = await originalFetch(...args)
        fetchBufferRef.current.push({
          method, url: urlShort, status: res.status,
          durationMs: Date.now() - start, timestamp: start,
        })
        if (fetchBufferRef.current.length > FETCH_BUFFER_LIMIT) fetchBufferRef.current.shift()
        return res
      } catch (err) {
        fetchBufferRef.current.push({
          method, url: urlShort,
          durationMs: Date.now() - start, timestamp: start,
          error: err instanceof Error ? err.message : String(err),
        })
        if (fetchBufferRef.current.length > FETCH_BUFFER_LIMIT) fetchBufferRef.current.shift()
        throw err
      }
    }

    // Exposto pro ErrorBoundary pré-preencher.
    window.__openBugCatcher = (prefill) => {
      if (prefill?.description) setDescription(prefill.description)
      if (prefill?.severity)    setSeverity(prefill.severity)
      setOpen(true)
    }

    // Session replay via rrweb (dynamic import pra não pesar bundle inicial).
    // Buffer rolling de 60s — eventos mais antigos são descartados.
    let replayActive = true
    import('rrweb').then(mod => {
      if (!replayActive) return
      const stop = mod.record({
        emit(event) {
          const e = event as { type: number; data: unknown; timestamp: number }
          replayEventsRef.current.push(e)
          const cutoff = Date.now() - REPLAY_WINDOW_MS
          while (replayEventsRef.current.length > 0 && replayEventsRef.current[0].timestamp < cutoff) {
            replayEventsRef.current.shift()
          }
        },
        // Defaults: captura DOM + mutations + user input. Não grava texto dos inputs por default
        // em maskTextClass='rr-mask' — aplicamos quando necessário.
        sampling: { scroll: 150, media: 800 },
      })
      if (stop) replayStopRef.current = stop
    }).catch(() => { /* rrweb falhou a carregar: ignora */ })

    return () => {
      replayActive = false
      if (replayStopRef.current) { try { replayStopRef.current() } catch { /* noop */ } }
      for (const level of methods) {
        const fn = originals[level]
        if (fn) console[level] = fn
      }
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', rejectHandler)
      window.fetch = originalFetch
      delete window.__openBugCatcher
    }
  }, [enabled])

  // Modo inspetor: captura Alt+click em elementos.
  useEffect(() => {
    if (!inspecting) return
    function onClick(e: MouseEvent) {
      if (!e.altKey) return
      const target = e.target as Element | null
      if (!target || target.closest('[data-bug-catcher-ui]')) return
      e.preventDefault()
      e.stopPropagation()
      const selector = cssPath(target)
      const outerHtml = (target as HTMLElement).outerHTML.slice(0, 4000)
      setElement({ selector, outerHtml })
      setInspecting(false)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [inspecting])

  async function attachReplay() {
    if (replayEventsRef.current.length === 0) {
      alert('Nenhum evento de replay gravado ainda. Interaja com a tela e tente de novo.')
      return
    }
    setReplayAttaching(true)
    try {
      // Copia snapshot dos eventos atuais (limita tamanho)
      const events = replayEventsRef.current.slice()
      const res = await fetch('/api/bugs/upload-replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(events),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Upload do replay falhou')
      }
      const data = await res.json() as { url: string; events: number }
      setReplayUrl(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao anexar replay')
    } finally {
      setReplayAttaching(false)
    }
  }

  async function captureScreenshot() {
    setScreenshotting(true)
    try {
      // Fecha o modal temporariamente pra não aparecer no screenshot
      const modalWasOpen = open
      setOpen(false)
      await new Promise(r => setTimeout(r, 100))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio, 2),
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      })

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9))
      if (!blob) throw new Error('Falha ao gerar blob do canvas')

      const fd = new FormData()
      fd.append('file', blob, 'screenshot.png')
      const res = await fetch('/api/bugs/upload-screenshot', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Upload falhou')
      }
      const data = await res.json() as { url: string }
      setScreenshotUrl(data.url)
      if (modalWasOpen) setOpen(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha no screenshot')
    } finally {
      setScreenshotting(false)
    }
  }

  async function submit() {
    if (!description.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          severity,
          url:          window.location.href,
          user_agent:   navigator.userAgent,
          viewport_w:   window.innerWidth,
          viewport_h:   window.innerHeight,
          console_logs: consoleBufferRef.current,
          fetch_traces: fetchBufferRef.current,
          selector:     element?.selector ?? null,
          element_html: element?.outerHtml ?? null,
          screenshot_url: screenshotUrl,
          replay_url:   replayUrl,
        }),
      })
      if (res.ok) {
        const data = await res.json() as { id: string }
        setSubmittedId(data.id)
        setDescription('')
        setElement(null)
        setScreenshotUrl(null)
        setReplayUrl(null)
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error ?? 'Falha ao enviar report')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function close() {
    setOpen(false)
    setSubmittedId(null)
    setDescription('')
    setElement(null)
    setScreenshotUrl(null)
    setReplayUrl(null)
  }

  if (!enabled) return null

  return (
    <div data-bug-catcher-ui>
      {inspecting && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-amber-500 text-white rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4" /> Segure Alt e clique em um elemento
          <button type="button" onClick={() => setInspecting(false)} className="ml-2 hover:bg-amber-600 rounded-full p-1" aria-label="Cancelar inspeção">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-all"
        title="Reportar bug (staff)"
        aria-label="Reportar bug"
      >
        <Bug className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={close}>
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {submittedId ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 text-lg mb-1">Bug reportado</h3>
                <p className="text-sm text-gray-600 mb-4">
                  ID: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{submittedId.slice(0, 8)}</code>
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => { setSubmittedId(null); setOpen(false) }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedId(null)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
                  >
                    Reportar outro
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Bug className="w-5 h-5 text-red-600" /> Reportar bug
                  </h3>
                  <button type="button" onClick={close} className="p-1 hover:bg-gray-100 rounded-lg" aria-label="Fechar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="O que aconteceu? O que você esperava?"
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    autoFocus
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-500">Severidade:</label>
                    <select
                      title="Severidade"
                      value={severity}
                      onChange={e => setSeverity(e.target.value as Severity)}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={captureScreenshot}
                      disabled={screenshotting}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {screenshotting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                      {screenshotUrl ? 'Screenshot anexado' : 'Anexar screenshot'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); setInspecting(true) }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Target className="w-3 h-3" />
                      {element ? 'Elemento selecionado' : 'Marcar elemento'}
                    </button>
                    <button
                      type="button"
                      onClick={attachReplay}
                      disabled={replayAttaching}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {replayAttaching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                      {replayUrl ? 'Replay anexado' : 'Anexar últimos 60s'}
                    </button>
                  </div>

                  {screenshotUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                      <ImageIcon className="w-3 h-3" /> Screenshot carregado
                      <button type="button" onClick={() => setScreenshotUrl(null)} className="ml-auto text-red-500">remover</button>
                    </div>
                  )}

                  {replayUrl && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                      <Video className="w-3 h-3" /> Replay carregado ({replayEventsRef.current.length} eventos)
                      <button type="button" onClick={() => setReplayUrl(null)} className="ml-auto text-red-500">remover</button>
                    </div>
                  )}

                  {element && (
                    <div className="text-xs bg-amber-50 border border-amber-200 p-2 rounded font-mono">
                      <div className="text-amber-900 mb-1">Elemento: {element.selector}</div>
                      <div className="text-amber-700 truncate">{element.outerHtml.slice(0, 140)}</div>
                      <button type="button" onClick={() => setElement(null)} className="mt-1 text-red-500">remover</button>
                    </div>
                  )}

                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">
                      Contexto incluído ({consoleBufferRef.current.length} logs · {fetchBufferRef.current.length} fetches)
                    </summary>
                    <div className="mt-2 space-y-1 font-mono text-[10px] max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                      <div>URL: {typeof window !== 'undefined' ? window.location.pathname : ''}</div>
                      <div>Viewport: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''}</div>
                      {consoleBufferRef.current.slice(-5).map((log, i) => (
                        <div key={`c${i}`} className={log.level === 'error' ? 'text-red-600' : 'text-gray-600'}>
                          [{log.level}] {log.message.slice(0, 100)}
                        </div>
                      ))}
                      {fetchBufferRef.current.slice(-5).map((f, i) => (
                        <div key={`f${i}`} className={f.error || (f.status && f.status >= 400) ? 'text-red-600' : 'text-blue-600'}>
                          {f.method} {f.url.split('?')[0].split('/').slice(-2).join('/')} → {f.status ?? f.error}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="flex justify-end gap-2 p-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={close}
                    className="px-3 py-2 text-gray-600 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || !description.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-red-700"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
