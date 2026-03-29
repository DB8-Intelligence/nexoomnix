'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Film, Link2, FileText, Sparkles, Copy, Check, RefreshCw, ToggleLeft, ToggleRight, ChevronDown, ImageIcon, Download, Loader2, Zap, Mic, Volume2, Play, Square, Video, Wand2, Clapperboard, BarChart2, Upload, Camera, Star, Wand, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PersonaSelector } from '@/components/content-ai/PersonaSelector'
import { CONTENT_PERSONAS } from '@/lib/content-ai/content-personas'
import type { PersonaId } from '@/lib/content-ai/content-personas'
import { AutoPostModal } from '@/components/content-ai/AutoPostModal'
import { BrandingWizard } from '@/components/content-ai/BrandingWizard'
import { getTalkingObjectsForNiche } from '@/lib/content-ai/talking-objects'
import type { TalkingObject } from '@/lib/content-ai/talking-objects'

// ─── Types ───────────────────────────────────────────────────
type Format = 'reel' | 'carrossel' | 'story' | 'post'

const FORMATS: { id: Format; label: string; icon: string }[] = [
  { id: 'reel',      label: 'Reel',      icon: '🎬' },
  { id: 'carrossel', label: 'Carrossel', icon: '🖼️' },
  { id: 'story',     label: 'Story',     icon: '⭕' },
  { id: 'post',      label: 'Post',      icon: '📸' },
]

const DURATIONS = [15, 30, 45, 60]

const NICHE_LABELS: Record<string, string> = {
  beleza:     'Salão de Beleza',
  tecnico:    'Serviços Técnicos',
  saude:      'Saúde / Clínica',
  juridico:   'Advocacia',
  imoveis:    'Imóveis',
  pet:         'Pet / Veterinária',
  educacao:    'Escola / Cursos',
  nutricao:    'Nutrição',
  engenharia:  'Engenharia',
  fotografia:  'Fotografia',
  gastronomia: 'Gastronomia',
  fitness:     'Fitness / Academia',
  financas:    'Contabilidade / Finanças',
}

// Section headings to split output into copyable cards
const SECTION_MARKERS = [
  '## 🎬 ROTEIRO DE CENAS',
  '## 🎙️ ROTEIRO DE VOZ',
  '## 📝 LEGENDAS EM TELA',
  '## 📱 TEXTO DO POST',
  '## 🎯 3 OPÇÕES DE CTA',
  '## 🎭 OBJETO FALANTE VIRAL',
]

function splitSections(text: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  let remaining = text

  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const idx = remaining.indexOf(marker)
    if (idx === -1) continue

    const nextMarkers = SECTION_MARKERS.slice(i + 1)
    let end = remaining.length
    for (const nm of nextMarkers) {
      const ni = remaining.indexOf(nm, idx + marker.length)
      if (ni !== -1 && ni < end) end = ni
    }

    sections.push({
      title: marker.replace('## ', ''),
      body: remaining.slice(idx + marker.length, end).trim(),
    })
  }

  return sections
}

// ─── Copy button ─────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  )
}

// ─── Section card ────────────────────────────────────────────
function SectionCard({ title, body }: { title: string; body: string }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-900"
        >
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          {title}
        </button>
        <CopyBtn text={body} />
      </div>
      {!collapsed && (
        <div className="px-4 py-3">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{body}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Scene image panel ───────────────────────────────────────

function parseScenePrompts(output: string): string[] {
  const startIdx = output.indexOf('## 🎬 ROTEIRO DE CENAS')
  if (startIdx === -1) return []
  const nextSection = output.indexOf('\n## ', startIdx + 10)
  const block = nextSection > -1 ? output.slice(startIdx, nextSection) : output.slice(startIdx)
  // Extract text between backtick-quoted strings: `"..."`
  const results: string[] = []
  const re = /`"([^`]{20,})"`/g
  let m: RegExpExecArray | null
  while ((m = re.exec(block)) !== null) results.push(m[1].trim())
  return results
}

interface SceneImg { url: string | null; loading: boolean; error: string | null }

function SceneImagePanel({ output, onImagesUpdate, characterDna }: {
  output: string
  onImagesUpdate?: (urls: (string | null)[]) => void
  characterDna?: string
}) {
  const prompts = useMemo(() => parseScenePrompts(output), [output])
  const [imgs, setImgs] = useState<SceneImg[]>([])
  const [genAll, setGenAll] = useState(false)

  useEffect(() => {
    setImgs(prompts.map(() => ({ url: null, loading: false, error: null })))
  }, [prompts])

  useEffect(() => {
    onImagesUpdate?.(imgs.map(img => img.url))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs])

  async function generateOne(idx: number) {
    setImgs(prev => prev.map((s, i) => i === idx ? { ...s, loading: true, error: null } : s))
    try {
      const res = await fetch('/api/reel-creator/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[idx], scene: idx + 1, characterDna }),
      })
      const data = await res.json() as { url?: string; error?: string }
      setImgs(prev => prev.map((s, i) =>
        i === idx ? { url: data.url ?? null, loading: false, error: data.error ?? null } : s
      ))
    } catch {
      setImgs(prev => prev.map((s, i) =>
        i === idx ? { ...s, loading: false, error: 'Falha na conexão' } : s
      ))
    }
  }

  async function generateAll() {
    setGenAll(true)
    for (let i = 0; i < prompts.length; i++) {
      if (!imgs[i]?.url) await generateOne(i)
    }
    setGenAll(false)
  }

  if (prompts.length === 0) return null

  const allDone = imgs.length > 0 && imgs.every(s => s.url)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          🖼️ Imagens das Cenas
          <span className="text-xs font-normal text-gray-400">
            ({imgs.filter(s => s.url).length}/{prompts.length} geradas · ~$0.003/img)
          </span>
        </p>
        <button
          type="button"
          onClick={generateAll}
          disabled={genAll || allDone}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {genAll
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
            : <><Zap className="w-3.5 h-3.5" /> Gerar Todas</>
          }
        </button>
      </div>

      <div className="p-4 grid grid-cols-3 sm:grid-cols-5 gap-3">
        {prompts.map((_, idx) => {
          const img = imgs[idx]
          return (
            <div key={idx} className="flex flex-col gap-1.5">
              {/* 9:16 frame */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-[9/16]">
                {img?.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Cena ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={img.url}
                      download={`cena-${idx + 1}.jpg`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-1.5 right-1.5 p-1 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                      title="Download"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </a>
                  </>
                ) : img?.loading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <p className="text-[10px] text-gray-400">Gerando...</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => generateOne(idx)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-gray-400" />
                    <p className="text-[10px] text-gray-500">Gerar</p>
                  </button>
                )}
                {img?.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <p className="text-[9px] text-red-500 text-center px-2">{img.error}</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-center text-gray-400 font-medium">Cena {idx + 1}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Voice panel ─────────────────────────────────────────────

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

const TTS_VOICES: { id: TTSVoice; label: string; icon: string }[] = [
  { id: 'nova',    label: 'Nova',    icon: '👩' },
  { id: 'shimmer', label: 'Shimmer', icon: '✨' },
  { id: 'alloy',   label: 'Alloy',   icon: '🤖' },
  { id: 'echo',    label: 'Echo',    icon: '👨' },
  { id: 'onyx',    label: 'Onyx',    icon: '🎙️' },
  { id: 'fable',   label: 'Fable',   icon: '📖' },
]

function parseVoiceScript(output: string): string {
  const startIdx = output.indexOf('## 🎙️ ROTEIRO DE VOZ')
  if (startIdx === -1) return ''
  const nextSection = output.indexOf('\n## ', startIdx + 10)
  const block = nextSection > -1 ? output.slice(startIdx, nextSection) : output.slice(startIdx)
  // Strip markdown symbols to get clean TTS text
  return block
    .replace(/## 🎙️ ROTEIRO DE VOZ\n?/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[pausa longa\]/gi, '...')
    .replace(/\[pausa\]/gi, '.')
    .replace(/\[ÊNFASE\]/gi, '')
    .replace(/^#+\s*/gm, '')
    .trim()
}

function VoicePanel({ output, onAudioReady }: { output: string; onAudioReady?: (url: string) => void }) {
  const script = useMemo(() => parseVoiceScript(output), [output])
  const [voice, setVoice] = useState<TTSVoice>('nova')
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setAudioUrl(null)
    try {
      const res = await fetch('/api/reel-creator/generate-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, voice }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? 'Erro na geração')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      onAudioReady?.(url)
    } catch {
      setError('Falha na conexão')
    } finally {
      setLoading(false)
    }
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  if (!script) return null

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Mic className="w-4 h-4 text-gray-400" />
          🎙️ Narração em Voz
          <span className="text-xs font-normal text-gray-400">(~$0.008 · OpenAI TTS)</span>
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Voice selector */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Voz</p>
          <div className="flex flex-wrap gap-2">
            {TTS_VOICES.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => { setVoice(v.id); setAudioUrl(null) }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  voice === v.id
                    ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Script preview */}
        <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{script.slice(0, 400)}{script.length > 400 ? '…' : ''}</p>
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando narração...</>
            : <><Volume2 className="w-3.5 h-3.5" /> Gerar Narração</>
          }
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Audio player */}
        {audioUrl && (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl p-3">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
            <button
              type="button"
              onClick={togglePlay}
              className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex-shrink-0"
            >
              {playing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-purple-800">Narração gerada · Voz: {voice}</p>
              <p className="text-[10px] text-purple-500 mt-0.5">Clique no play para ouvir</p>
            </div>
            <a
              href={audioUrl}
              download="narration.mp3"
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-purple-200 text-purple-700 text-xs rounded-lg hover:bg-purple-50 transition-colors"
            >
              <Download className="w-3 h-3" /> MP3
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Lip-sync panel ──────────────────────────────────────────

const LIPSYNC_STATUS_LABELS: Record<string, string> = {
  starting:   'Iniciando...',
  processing: 'Animando...',
  succeeded:  'Concluído ✓',
  failed:     'Falhou',
}

async function blobUrlToDataUri(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function LipSyncPanel({ audioBlobUrl, defaultImageUrl }: { audioBlobUrl: string | null; defaultImageUrl?: string }) {
  const [imageUrl, setImageUrl] = useState(defaultImageUrl ?? '')
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Sync when character is chosen after panel mounts
  useEffect(() => {
    if (defaultImageUrl) setImageUrl(defaultImageUrl)
  }, [defaultImageUrl])
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function pollPrediction(id: string) {
    if (!mountedRef.current) return
    try {
      const res = await fetch(`/api/reel-creator/generate-lipsync?id=${id}`)
      const data = await res.json() as { status: string; videoUrl?: string; error?: string }
      if (!mountedRef.current) return
      setStatus(data.status)
      if (data.status === 'succeeded' && data.videoUrl) {
        setVideoUrl(data.videoUrl)
        setLoading(false)
      } else if (data.status === 'failed') {
        setError(data.error ?? 'Falhou no processamento')
        setLoading(false)
      } else {
        setTimeout(() => pollPrediction(id), 3000)
      }
    } catch {
      if (mountedRef.current) { setError('Falha ao verificar status'); setLoading(false) }
    }
  }

  async function generate() {
    if (!audioBlobUrl || !imageUrl.trim()) return
    setLoading(true)
    setError(null)
    setVideoUrl(null)
    setPredictionId(null)
    setStatus('Preparando...')

    try {
      const audioDataUri = await blobUrlToDataUri(audioBlobUrl)
      const res = await fetch('/api/reel-creator/generate-lipsync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: imageUrl.trim(), audioDataUri }),
      })
      const data = await res.json() as {
        predictionId?: string
        status?: string
        videoUrl?: string
        error?: string
      }
      if (data.error) { setError(data.error); setLoading(false); return }
      if (data.videoUrl) { setVideoUrl(data.videoUrl); setStatus('succeeded'); setLoading(false); return }
      if (data.predictionId) {
        setPredictionId(data.predictionId)
        setStatus(data.status ?? 'starting')
        setTimeout(() => pollPrediction(data.predictionId!), 3000)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Video className="w-4 h-4 text-gray-400" />
          🎭 Lip-sync do Objeto Falante
          <span className="text-xs font-normal text-gray-400">(~$0.015 · Replicate SadTalker)</span>
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Image URL input */}
        <div>
          <label className="text-xs text-gray-500 block mb-1.5">
            URL da imagem gerada (copie o link de uma imagem acima)
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://v3.fal.media/files/..."
            className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder-gray-300"
          />
        </div>

        {/* Audio status indicator */}
        <div className={`flex items-center gap-2 text-xs rounded-xl px-3 py-2 ${
          audioBlobUrl ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-500'
        }`}>
          <Mic className="w-3.5 h-3.5 flex-shrink-0" />
          {audioBlobUrl
            ? 'Narração pronta ✓ — será sincronizada com a imagem'
            : 'Gere a narração primeiro no painel acima'}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={generate}
          disabled={loading || !audioBlobUrl || !imageUrl.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {LIPSYNC_STATUS_LABELS[status] ?? 'Processando...'}</>
            : <><Wand2 className="w-3.5 h-3.5" /> Gerar Lip-sync</>
          }
        </button>

        {predictionId && loading && (
          <p className="text-[10px] text-gray-400">ID: {predictionId} · verificando a cada 3s...</p>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Video result */}
        {videoUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full max-w-[180px] mx-auto rounded-xl aspect-[9/16] object-cover border border-gray-200"
            />
            <div className="flex justify-center">
              <a
                href={videoUrl}
                download="talking-object.mp4"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Download className="w-3 h-3" /> Baixar Vídeo MP4
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Video assembly panel (FFmpeg.wasm) ──────────────────────

interface FFmpegInstance {
  load: (opts: { coreURL: string; wasmURL: string }) => Promise<void>
  writeFile: (name: string, data: Uint8Array) => Promise<void>
  readFile: (name: string) => Promise<Uint8Array>
  deleteFile: (name: string) => Promise<void>
  exec: (args: string[]) => Promise<number>
  on: (event: string, cb: (data: { progress: number }) => void) => void
  off: (event: string, cb: (data: { progress: number }) => void) => void
}

async function loadFFmpegLib(): Promise<{
  ffmpeg: FFmpegInstance
  fetchFile: (src: string | Blob | File) => Promise<Uint8Array>
  toBlobURL: (url: string, mimeType: string) => Promise<string>
}> {
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
    import('@ffmpeg/ffmpeg'),
    import('@ffmpeg/util'),
  ])
  const ffmpeg = new FFmpeg() as unknown as FFmpegInstance
  const BASE = 'https://unpkg.com/@ffmpeg/core-st@0.12.9/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return { ffmpeg, fetchFile, toBlobURL }
}

function VideoAssemblyPanel({
  imageUrls,
  audioBlobUrl,
  duration,
}: {
  imageUrls: (string | null)[]
  audioBlobUrl: string | null
  duration: number
}) {
  const validImages = imageUrls.filter((u): u is string => !!u)
  const [stage, setStage] = useState<'idle' | 'loading-wasm' | 'downloading' | 'encoding' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function assemble() {
    if (validImages.length === 0) return
    setStage('loading-wasm')
    setProgress(0)
    setVideoUrl(null)
    setErrorMsg(null)

    try {
      const { ffmpeg, fetchFile } = await loadFFmpegLib()
      if (!mountedRef.current) return

      const onProgress = ({ progress: p }: { progress: number }) => {
        if (mountedRef.current) setProgress(Math.round(p * 100))
      }
      ffmpeg.on('progress', onProgress)

      // Download images via proxy
      setStage('downloading')
      for (let i = 0; i < validImages.length; i++) {
        const proxyUrl = `/api/reel-creator/proxy-asset?url=${encodeURIComponent(validImages[i])}`
        const res = await fetch(proxyUrl)
        const buf = await res.arrayBuffer()
        await ffmpeg.writeFile(`img${i}.jpg`, new Uint8Array(buf))
        if (mountedRef.current) setProgress(Math.round(((i + 1) / validImages.length) * 40))
      }

      // Write audio if available
      let hasAudio = false
      if (audioBlobUrl) {
        const audioData = await fetchFile(audioBlobUrl)
        await ffmpeg.writeFile('audio.mp3', audioData)
        hasAudio = true
      }

      // Build concat file
      const perDuration = Math.max(Math.round(duration / validImages.length), 3)
      let concatTxt = ''
      for (let i = 0; i < validImages.length; i++) {
        concatTxt += `file 'img${i}.jpg'\nduration ${perDuration}\n`
      }
      // Repeat last frame (concat demuxer quirk)
      concatTxt += `file 'img${validImages.length - 1}.jpg'\n`
      const encoder = new TextEncoder()
      await ffmpeg.writeFile('concat.txt', encoder.encode(concatTxt))

      // Encode
      setStage('encoding')
      const args = [
        '-f', 'concat', '-safe', '0', '-i', 'concat.txt',
        ...(hasAudio ? ['-i', 'audio.mp3'] : []),
        '-vf', 'scale=576:1024:force_original_aspect_ratio=decrease,pad=576:1024:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
        ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-shortest'] : []),
        '-movflags', '+faststart',
        'output.mp4',
      ]
      await ffmpeg.exec(args)

      ffmpeg.off('progress', onProgress)

      // Read result
      const raw = await ffmpeg.readFile('output.mp4')
      const blob = new Blob([raw as unknown as Uint8Array<ArrayBuffer>], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)
      if (mountedRef.current) { setVideoUrl(url); setStage('done'); setProgress(100) }
    } catch (e) {
      if (mountedRef.current) {
        setErrorMsg(e instanceof Error ? e.message : 'Erro na montagem')
        setStage('error')
      }
    }
  }

  const STAGE_LABELS: Record<string, string> = {
    'loading-wasm': 'Carregando FFmpeg...',
    'downloading':  'Baixando cenas...',
    'encoding':     `Codificando vídeo... ${progress}%`,
    'done':         'Vídeo pronto ✓',
    'error':        'Erro',
  }

  const isProcessing = ['loading-wasm', 'downloading', 'encoding'].includes(stage)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-gray-400" />
          🎬 Montar Reel Final
          <span className="text-xs font-normal text-gray-400">(MP4 · FFmpeg local)</span>
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Status summary */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            { label: 'Cenas', value: `${validImages.length} imagens`, ok: validImages.length > 0 },
            { label: 'Narração', value: audioBlobUrl ? 'pronta' : 'sem áudio', ok: !!audioBlobUrl },
            { label: 'Duração', value: `${duration}s (~${Math.max(Math.round(duration / Math.max(validImages.length, 1)), 3)}s/cena)`, ok: true },
          ].map(item => (
            <div key={item.label} className={`rounded-xl px-3 py-2 border ${item.ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              <p className="font-semibold">{item.label}</p>
              <p className="mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {validImages.length === 0 && (
          <p className="text-xs text-gray-400">Gere ao menos uma imagem de cena acima para montar o vídeo.</p>
        )}

        {/* Assemble button */}
        <button
          type="button"
          onClick={assemble}
          disabled={isProcessing || validImages.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {STAGE_LABELS[stage]}</>
            : <><Clapperboard className="w-3.5 h-3.5" /> Montar Reel MP4</>
          }
        </button>

        {/* Progress bar during encoding */}
        {stage === 'encoding' && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            {/* eslint-disable-next-line react/forbid-component-props */}
            <div
              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {stage === 'loading-wasm' && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <BarChart2 className="w-3 h-3 animate-pulse" />
            Baixando FFmpeg (~20MB, apenas na primeira vez)
          </p>
        )}

        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

        {/* Video result */}
        {videoUrl && (
          <div className="space-y-2">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full max-w-[200px] mx-auto rounded-xl aspect-[9/16] object-cover border border-gray-200"
            />
            <div className="flex justify-center">
              <a
                href={videoUrl}
                download={`reel-${Date.now()}.mp4`}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Baixar Reel MP4
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Photo Object Mode ───────────────────────────────────────

interface CharacterConcept {
  id: string
  name: string
  style?: 'fotorrealista' | 'miniatura-acao' | 'pixar-3d' | 'pixar-acao' | 'pixar-antagonista' | 'pixar-humano'
  personality: string
  colorPalette: string
  prompt: string
}

const STYLE_LABELS: Record<string, { label: string; color: string }> = {
  'fotorrealista':  { label: '📸 Fotorrealista', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'miniatura-acao': { label: '💪 Miniatura Ação', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'pixar-3d':       { label: '✨ Pixar 3D',       color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'pixar-acao':        { label: '🎬 Pixar em Ação',   color: 'bg-green-50 text-green-700 border-green-200' },
  'pixar-antagonista': { label: '😡 Pixar Vilão',    color: 'bg-red-50 text-red-700 border-red-200' },
  'pixar-humano':      { label: '👨‍👩‍👧 Pixar + Pessoa', color: 'bg-orange-50 text-orange-700 border-orange-200' },
}

interface CharacterAnalysis {
  object: string
  niche: string
  concepts: CharacterConcept[]
}

interface GeneratedChar {
  concept: CharacterConcept
  url: string | null
  loading: boolean
  error: string | null
}

export interface SelectedCharacter {
  imageUrl: string
  dna: string
  name: string
  object: string
}

type PhotoStep = 'upload' | 'analyzing' | 'selecting'

function PhotoObjectMode({
  niche,
  onCharacterSelected,
}: {
  niche: string
  onCharacterSelected: (c: SelectedCharacter) => void
}) {
  const [step, setStep] = useState<PhotoStep>('upload')
  const [analysis, setAnalysis] = useState<CharacterAnalysis | null>(null)
  const [chars, setChars] = useState<GeneratedChar[]>([])
  const [extracting, setExtracting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Envie apenas imagens (JPG, PNG ou WEBP)')
      return
    }
    setStep('analyzing')
    setError(null)

    // Step 1 — Claude Vision: identify object + 3 concepts
    const fd = new FormData()
    fd.append('image', file)
    if (niche) fd.append('niche', niche)

    try {
      const res = await fetch('/api/reel-creator/analyze-object', { method: 'POST', body: fd })
      const data = await res.json() as CharacterAnalysis & { error?: string }
      if (data.error || !data.concepts?.length) {
        setError(data.error ?? 'Análise falhou. Tente novamente.')
        setStep('upload')
        return
      }

      setAnalysis(data)
      setChars(data.concepts.map(c => ({ concept: c, url: null, loading: true, error: null })))
      setStep('selecting')

      // Step 2 — Fal.ai: generate 3 character images in parallel
      const res2 = await fetch('/api/reel-creator/generate-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: data.concepts.map(c => c.prompt) }),
      })
      const data2 = await res2.json() as { images: Array<{ url: string | null; error?: string | null }> }

      setChars(data.concepts.map((c, i) => ({
        concept: c,
        url: data2.images[i]?.url ?? null,
        loading: false,
        error: data2.images[i]?.error ?? null,
      })))
    } catch {
      setError('Falha na análise. Verifique sua conexão.')
      setStep('upload')
    }
  }

  async function pickCharacter(char: GeneratedChar) {
    if (!char.url || extracting) return
    setExtracting(char.concept.id)

    try {
      const res = await fetch('/api/reel-creator/extract-character-dna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: char.url }),
      })
      const data = await res.json() as { dna?: string; error?: string }
      // Use extracted DNA or fallback to original prompt
      onCharacterSelected({
        imageUrl: char.url,
        dna: data.dna?.trim() || char.concept.prompt,
        name: char.concept.name,
        object: analysis?.object ?? char.concept.name,
      })
    } catch {
      onCharacterSelected({
        imageUrl: char.url,
        dna: char.concept.prompt,
        name: char.concept.name,
        object: analysis?.object ?? char.concept.name,
      })
    } finally {
      setExtracting(null)
    }
  }

  if (step === 'upload') return (
    <div className="space-y-3">
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Camera className="w-7 h-7 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Envie a foto do seu produto</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — arraste ou clique para selecionar</p>
          </div>
          <p className="text-xs text-purple-600 font-medium bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
            ✨ A IA converte em personagem Pixar/Disney 3D
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Selecionar imagem do produto"
          title="Selecionar imagem do produto"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )

  if (step === 'analyzing') return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">Analisando produto...</p>
        <p className="text-xs text-gray-400 mt-1">Claude Vision identifica o objeto e cria 3 conceitos Pixar/Disney 3D</p>
      </div>
    </div>
  )

  // step === 'selecting'
  return (
    <div className="space-y-4">
      {analysis && (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
          <span className="text-gray-500">Objeto identificado:</span>
          <span className="font-semibold text-gray-800">{analysis.object}</span>
        </div>
      )}

      <p className="text-sm font-semibold text-gray-800">
        Escolha o personagem do seu produto:
      </p>

      <div className="grid grid-cols-3 gap-3">
        {chars.map(char => (
          <div key={char.concept.id} className="flex flex-col gap-2">
            <div
              onClick={() => !extracting && char.url && pickCharacter(char)}
              className={`relative rounded-xl overflow-hidden border-2 aspect-[9/16] transition-all group
                ${char.url && !extracting ? 'cursor-pointer hover:border-purple-400 hover:shadow-lg' : 'cursor-default'}
                ${extracting === char.concept.id ? 'border-purple-400' : 'border-transparent'}
              `}
            >
              {char.loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-pink-50">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  <p className="text-[10px] text-purple-400 font-medium">Gerando...</p>
                </div>
              ) : char.url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={char.url} alt={char.concept.name} className="w-full h-full object-cover" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-purple-900/30 transition-all flex items-end justify-center pb-3">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-purple-700 text-[11px] font-bold px-3 py-1.5 rounded-full shadow">
                      {extracting === char.concept.id
                        ? <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Preparando...</span>
                        : <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Escolher</span>
                      }
                    </span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <p className="text-[10px] text-red-400 text-center px-2">{char.error ?? 'Falha'}</p>
                </div>
              )}
            </div>

            {/* Concept info */}
            <div className="text-center px-0.5">
              {char.concept.style && STYLE_LABELS[char.concept.style] && (
                <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full border mb-1 ${STYLE_LABELS[char.concept.style].color}`}>
                  {STYLE_LABELS[char.concept.style].label}
                </span>
              )}
              <p className="text-[11px] font-bold text-gray-800 truncate">{char.concept.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-tight">{char.concept.personality}</p>
              <p className="text-[10px] text-purple-500 font-medium mt-0.5">{char.concept.colorPalette}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        O personagem escolhido será o protagonista de todas as cenas do reel
      </p>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────
export default function ReelCreatorPage() {
  const supabase = createClient()

  // Niche + persona + plan + branding detection
  const [niche, setNiche] = useState<string>('')
  const [tenantPlan, setTenantPlan] = useState<string>('')
  const [tenantName, setTenantName] = useState<string>('')
  const [showBrandingWizard, setShowBrandingWizard] = useState(false)
  const [simpleMode, setSimpleMode] = useState(true)

  useEffect(() => {
    async function loadTenantData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('tenant:tenants(name, niche, plan, tenant_settings(content_persona_id, branding_completed))')
        .eq('id', user.id)
        .single()
      const tenant = data?.tenant as {
        name?: string
        niche?: string
        plan?: string
        tenant_settings?: { content_persona_id?: string; branding_completed?: boolean }[]
      } | null
      setNiche(tenant?.niche ?? '')
      setTenantPlan(tenant?.plan ?? '')
      setTenantName(tenant?.name ?? '')
      const settings = tenant?.tenant_settings?.[0]
      if (settings?.content_persona_id) setPersonaId(settings.content_persona_id as PersonaId)
      // Show branding wizard if not completed
      if (!settings?.branding_completed) setShowBrandingWizard(true)
    }
    loadTenantData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Input mode
  const [inputMode, setInputMode] = useState<'text' | 'photo'>('text')
  const [character, setCharacter] = useState<SelectedCharacter | null>(null)

  // Persona
  const [personaId, setPersonaId] = useState<PersonaId | null>(null)
  const [showPersonaPanel, setShowPersonaPanel] = useState(false)

  // Form state
  const [topic, setTopic] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<Format>('reel')
  const [duration, setDuration] = useState(30)
  const [talkingObject, setTalkingObject] = useState(false)
  const [selectedTalkingObject, setSelectedTalkingObject] = useState<TalkingObject | null>(null)

  // Style reference
  const [styleReference, setStyleReference] = useState<string | null>(null)
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [styleAnalysis, setStyleAnalysis] = useState<{
    stylePrompt: string; colorPalette: string; mood: string; composition: string
  } | null>(null)
  const [styleAnalyzing, setStyleAnalyzing] = useState(false)
  const [styleError, setStyleError] = useState<string | null>(null)
  const styleFileRef = useRef<HTMLInputElement>(null)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)
  const [ttsAudioBlobUrl, setTtsAudioBlobUrl] = useState<string | null>(null)
  const [sceneImageUrls, setSceneImageUrls] = useState<(string | null)[]>([])
  const outputRef = useRef<HTMLDivElement>(null)

  // Auto-post modal
  const [showAutoPost, setShowAutoPost] = useState(false)
  const isProMax = ['pro_max', 'enterprise'].includes(tenantPlan)

  // Extract post caption + hashtags from generated output
  const extractPostContent = useMemo(() => {
    if (!output) return { caption: '', hashtags: [] }
    const postSection = output.match(/## 📱 TEXTO DO POST\n([\s\S]*?)(?=\n## |$)/)
    const rawCaption = postSection?.[1]?.trim() ?? ''
    // Extract hashtags from end of caption
    const hashtagMatch = rawCaption.match(/(#\w[\w\u00C0-\u017F]*(?:\s+#\w[\w\u00C0-\u017F]*)*)\s*$/)
    const hashtags = hashtagMatch ? hashtagMatch[1].split(/\s+/) : []
    const caption = hashtagMatch ? rawCaption.slice(0, hashtagMatch.index).trim() : rawCaption
    return { caption, hashtags }
  }, [output])

  function handleCharacterSelected(c: SelectedCharacter) {
    setCharacter(c)
    // Pre-fill topic with object name and force talking object mode
    setTopic(c.object)
    setTalkingObject(true)
  }

  async function handleStyleFile(file: File) {
    if (styleAnalyzing) return
    setStyleAnalyzing(true)
    setStyleError(null)
    setStyleAnalysis(null)
    setStyleReference(null)
    const fd = new FormData()
    fd.append('image', file)
    try {
      const res = await fetch('/api/reel-creator/analyze-style', { method: 'POST', body: fd })
      const data = await res.json() as {
        stylePrompt?: string; colorPalette?: string; mood?: string; composition?: string; error?: string
      }
      if (!res.ok || data.error) { setStyleError(data.error ?? 'Falha na análise'); return }
      const analysis = {
        stylePrompt: data.stylePrompt!,
        colorPalette: data.colorPalette!,
        mood: data.mood!,
        composition: data.composition!,
      }
      setStyleAnalysis(analysis)
      setStyleReference(analysis.stylePrompt)
    } catch {
      setStyleError('Falha na conexão. Tente novamente.')
    } finally {
      setStyleAnalyzing(false)
    }
  }

  const sections = done ? splitSections(output) : []

  const generate = useCallback(async () => {
    if (!topic.trim() || generating) return
    setGenerating(true)
    setOutput('')
    setDone(false)

    try {
      const res = await fetch('/api/reel-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          format,
          duration,
          talkingObject,
          talkingObjectName: selectedTalkingObject?.name || undefined,
          talkingObjectGancho: selectedTalkingObject?.gancho || undefined,
          talkingObjectPersonalidade: selectedTalkingObject?.personalidade || undefined,
          characterDna: character?.dna || undefined,
          characterObject: character?.object || undefined,
          personaId: personaId || undefined,
          styleReference: styleReference || undefined,
        }),
      })

      if (!res.ok || !res.body) {
        setOutput('Erro ao gerar conteúdo. Tente novamente.')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        const chunk = decoder.decode(value, { stream: true })
        setOutput(prev => prev + chunk)
        // Auto-scroll
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
      }

      setDone(true)
    } catch {
      setOutput('Erro de conexão. Verifique sua rede e tente novamente.')
    } finally {
      setGenerating(false)
    }
  }, [topic, url, description, format, duration, talkingObject, selectedTalkingObject, generating, character, personaId, styleReference])

  const nicheLabel = NICHE_LABELS[niche] ?? niche

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Branding Wizard — shown on first access */}
      {showBrandingWizard && niche && (
        <BrandingWizard
          businessName={tenantName || 'seu negócio'}
          niche={niche}
          onComplete={() => setShowBrandingWizard(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Film className="w-6 h-6 text-gray-600" />
            ReelCreator AI
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pacote completo de produção — roteiro, prompts, voz, post e CTAs
            {nicheLabel && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                {nicheLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/reel-creator/analisar"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors font-medium"
          >
            <Zap className="w-4 h-4" />
            Analisar por Link
          </Link>
          {done && (
            <button
              type="button"
              onClick={() => { setOutput(''); setDone(false) }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Novo reel
            </button>
          )}
        </div>
      </div>

      {/* ── Modo Simples ── */}
      {!done && simpleMode && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">✨ Sobre o que é o reel de hoje?</p>
              <p className="text-xs text-gray-400 mt-0.5">Escreva o tema e o sistema cuida do resto</p>
            </div>
            <button
              type="button"
              onClick={() => setSimpleMode(false)}
              className="text-xs text-blue-600 hover:underline"
            >
              Modo avançado →
            </button>
          </div>
          <textarea
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={
              niche === 'beleza'      ? 'Ex: promoção de coloração, dicas de cabelo, antes e depois...' :
              niche === 'tecnico'     ? 'Ex: conserto de celular, troca de tela, diagnóstico grátis...' :
              niche === 'saude'       ? 'Ex: prevenção de doenças, dica de saúde, importância do check-up...' :
              niche === 'juridico'    ? 'Ex: direitos do trabalhador, como funciona a rescisão, dica jurídica...' :
              niche === 'imoveis'     ? 'Ex: financiamento facilitado, dica para comprar imóvel, novo lançamento...' :
              niche === 'pet'         ? 'Ex: dica de alimentação, vacinas do pet, banho e tosa em promoção...' :
              niche === 'educacao'    ? 'Ex: dica de estudo, como passar no vestibular, curso em promoção...' :
              niche === 'nutricao'    ? 'Ex: dica de alimentação, cardápio semanal, como emagrecer sem dieta...' :
              niche === 'engenharia'  ? 'Ex: dica de reforma, erro comum na construção, orçamento gratuito...' :
              niche === 'fotografia'  ? 'Ex: dica de foto, promoção de ensaio, bastidores de casamento...' :
              niche === 'gastronomia' ? 'Ex: prato do dia, receita especial, promoção do almoço...' :
              niche === 'fitness'     ? 'Ex: dica de treino, erro na academia, como ganhar músculo...' :
              niche === 'financas'    ? 'Ex: como pagar menos imposto, dica para MEI, declaração do IR...' :
              'Ex: promoção, dica, produto novo, depoimento de cliente...'
            }
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={generate}
            disabled={!topic.trim() || generating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Criando seu reel...</>
              : <><Sparkles className="w-4 h-4" /> Criar Reel</>
            }
          </button>
        </div>
      )}

      {/* Form — Modo Avançado */}
      {!done && !simpleMode && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-gray-700">⚙️ Modo Avançado</p>
            <button
              type="button"
              onClick={() => setSimpleMode(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              ← Modo simples
            </button>
          </div>

          {/* ── Mode selector ── */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'text'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Escrever ideia
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('photo'); setCharacter(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'photo'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Foto do produto
            </button>
          </div>

          {/* ── Persona de conteúdo ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPersonaPanel(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Wand className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-800">Persona de Conteúdo</span>
                {personaId ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-xs font-medium text-purple-700">
                    {CONTENT_PERSONAS[personaId].emoji} {CONTENT_PERSONAS[personaId].name}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Nenhuma selecionada</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPersonaPanel ? 'rotate-180' : ''}`} />
            </button>

            {showPersonaPanel && (
              <div className="border-t border-gray-100 p-4">
                <PersonaSelector
                  selected={personaId}
                  onSelect={id => { setPersonaId(id); setShowPersonaPanel(false) }}
                  hideFooter
                />
              </div>
            )}
          </div>

          {/* ── Photo mode: character selection ── */}
          {inputMode === 'photo' && !character && (
            <PhotoObjectMode
              niche={NICHE_LABELS[niche] ?? niche}
              onCharacterSelected={handleCharacterSelected}
            />
          )}

          {/* ── Photo mode: character locked card ── */}
          {inputMode === 'photo' && character && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.imageUrl}
                alt={character.name}
                className="w-14 h-16 aspect-[9/16] rounded-lg object-cover border border-purple-200 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-purple-800">{character.name}</p>
                <p className="text-[11px] text-purple-600 truncate">{character.object}</p>
                <p className="text-[10px] text-purple-400 mt-0.5">DNA extraído · protagonista de todas as cenas</p>
              </div>
              <button
                type="button"
                onClick={() => setCharacter(null)}
                className="text-[10px] text-purple-400 hover:text-purple-600 flex-shrink-0 underline"
              >
                Trocar
              </button>
            </div>
          )}

          {/* ── Text inputs (shown in text mode OR after character selected) ── */}
          {(inputMode === 'text' || character) && (
          <>
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tema do reel *
            </label>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder={nicheLabel ? `Ex: Como atrair mais clientes para ${nicheLabel}` : 'Descreva o tema do seu reel...'}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Link2 className="w-3.5 h-3.5 inline mr-1" />
              Link de referência
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/... ou qualquer URL"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <p className="text-xs text-gray-400 mt-1">
              Instagram bloqueia scraping direto — use para referência de tema, não de conteúdo literal
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              Briefing adicional
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tom desejado, público-alvo, diferenciais, produto/serviço específico..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          {/* Format + Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Formato</label>
              <div className="grid grid-cols-2 gap-1.5">
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                      format === f.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duração
                {format !== 'reel' && <span className="text-gray-400 font-normal ml-1">(para reel)</span>}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      duration === d
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Talking Object toggle + selector */}
          <div className={`border rounded-xl overflow-hidden transition-colors ${talkingObject ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50' : 'border-gray-200 bg-gray-50'}`}>
            {/* Toggle row */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <p className="text-sm font-medium text-gray-800">🎭 Objeto Falante Viral</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {talkingObject && selectedTalkingObject
                    ? <span className="text-purple-600 font-medium">{selectedTalkingObject.emoji} {selectedTalkingObject.name} selecionado</span>
                    : 'Escolha um objeto animado para narrar o reel'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = !talkingObject
                  setTalkingObject(next)
                  if (!next) setSelectedTalkingObject(null)
                }}
                className="flex-shrink-0"
              >
                {talkingObject
                  ? <ToggleRight className="w-8 h-8 text-purple-600" />
                  : <ToggleLeft className="w-8 h-8 text-gray-300" />
                }
              </button>
            </div>

            {/* Object picker — shown when toggle ON */}
            {talkingObject && (() => {
              const objects = getTalkingObjectsForNiche(niche)
              return (
                <div className="px-3.5 pb-3.5 space-y-2">
                  <p className="text-xs text-purple-700 font-medium">Escolha o personagem (ou deixe em branco para o Claude sugerir 5 opções):</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {objects.map(obj => (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setSelectedTalkingObject(
                          selectedTalkingObject?.id === obj.id ? null : obj
                        )}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                          selectedTalkingObject?.id === obj.id
                            ? 'border-purple-400 bg-purple-100'
                            : 'border-gray-200 bg-white hover:border-purple-200'
                        }`}
                      >
                        <span className="text-xl flex-shrink-0 mt-0.5">{obj.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-gray-800">{obj.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                              {obj.personalidade}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">
                            &ldquo;{obj.gancho}&rdquo;
                          </p>
                        </div>
                        {selectedTalkingObject?.id === obj.id && (
                          <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}</div>

          {/* ── Estilo Visual de Referência ── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowStylePanel(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-gray-800">🎨 Estilo Visual de Referência</span>
                {styleAnalysis ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-medium text-orange-700">
                    Estilo aplicado
                  </span>
                ) : (
                  <span className="text-xs text-gray-400">Opcional — envie um print de reel</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStylePanel ? 'rotate-180' : ''}`} />
            </button>

            {showStylePanel && (
              <div className="border-t border-gray-100 p-4 space-y-3">
                {!styleAnalysis ? (
                  <>
                    <div
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleStyleFile(f) }}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => !styleAnalyzing && styleFileRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 rounded-xl p-6 text-center cursor-pointer transition-all"
                    >
                      {styleAnalyzing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                          <p className="text-xs text-gray-500">Analisando estilo visual...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-gray-400" />
                          <p className="text-sm font-medium text-gray-700">Envie um print de reel de referência</p>
                          <p className="text-xs text-gray-400">JPG, PNG, WEBP — arrastar ou clicar</p>
                        </div>
                      )}
                      <input
                        ref={styleFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        aria-label="Selecionar imagem de estilo de referência"
                        title="Selecionar imagem de estilo de referência"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleStyleFile(f) }}
                      />
                    </div>
                    {styleError && <p className="text-xs text-red-500 text-center">{styleError}</p>}
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                        <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">Paleta</p>
                        <p className="text-xs text-gray-700">{styleAnalysis.colorPalette}</p>
                      </div>
                      <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                        <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">Atmosfera</p>
                        <p className="text-xs text-gray-700">{styleAnalysis.mood}</p>
                      </div>
                    </div>
                    <div className="p-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                      <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide mb-0.5">Composição</p>
                      <p className="text-xs text-gray-700">{styleAnalysis.composition}</p>
                    </div>
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Prompt injetado</p>
                      <p className="text-[11px] text-gray-600 font-mono leading-relaxed">{styleAnalysis.stylePrompt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStyleAnalysis(null); setStyleReference(null) }}
                      className="text-xs text-gray-400 hover:text-red-500 underline"
                    >
                      Remover referência
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={generate}
            disabled={!topic.trim() || generating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Gerando pacote...</>
              : <><Sparkles className="w-4 h-4" /> Gerar Pacote Completo</>
            }
          </button>
          </> // close (inputMode === 'text' || character) fragment
          )}
        </div>
      )}

      {/* Streaming output */}
      {generating && (
        <div
          ref={outputRef}
          className="bg-gray-900 text-green-400 rounded-2xl p-4 text-xs font-mono leading-relaxed max-h-96 overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-3 text-gray-500 text-[10px] uppercase tracking-widest">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Gerando...
          </div>
          <pre className="whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      {/* Auto-post modal */}
      {showAutoPost && (
        <AutoPostModal
          isOpen={showAutoPost}
          onClose={() => setShowAutoPost(false)}
          caption={extractPostContent.caption}
          hashtags={extractPostContent.hashtags}
          mediaUrls={sceneImageUrls.filter((u): u is string => !!u)}
          mediaType={format === 'reel' ? 'reel' : format === 'carrossel' ? 'carousel' : 'image'}
        />
      )}

      {/* Results — sectioned cards */}
      {done && sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Pacote gerado ✓</p>
            <div className="flex items-center gap-2">
              {isProMax ? (
                <button
                  type="button"
                  onClick={() => setShowAutoPost(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                  Auto-publicar
                </button>
              ) : (
                <a
                  href="/assinatura"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg hover:bg-gray-200 transition-colors border border-dashed border-gray-300"
                  title="Recurso PRO MAX"
                >
                  🚀 Auto-publicar (PRO MAX)
                </a>
              )}
              <CopyBtn text={output} />
            </div>
          </div>
          <SceneImagePanel output={output} onImagesUpdate={setSceneImageUrls} characterDna={character?.dna} />
          <VoicePanel output={output} onAudioReady={setTtsAudioBlobUrl} />
          <LipSyncPanel audioBlobUrl={ttsAudioBlobUrl} />
          {sections.map(s => (
            <SectionCard key={s.title} title={s.title} body={s.body} />
          ))}
        </div>
      )}

      {/* Done but sections didn't parse (raw fallback) */}
      {done && sections.length === 0 && output && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Resultado</p>
            <CopyBtn text={output} />
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{output}</pre>
        </div>
      )}
    </div>
  )
}
