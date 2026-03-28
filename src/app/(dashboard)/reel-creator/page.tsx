'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Film, Link2, FileText, Sparkles, Copy, Check, RefreshCw, ToggleLeft, ToggleRight, ChevronDown, ImageIcon, Download, Loader2, Zap, Mic, Volume2, Play, Square, Video, Wand2, Clapperboard, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
  pet:        'Pet / Veterinária',
  educacao:   'Escola / Cursos',
  nutricao:   'Nutrição',
  engenharia: 'Engenharia',
  fotografia: 'Fotografia',
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

function SceneImagePanel({ output, onImagesUpdate }: { output: string; onImagesUpdate?: (urls: (string | null)[]) => void }) {
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
        body: JSON.stringify({ prompt: prompts[idx], scene: idx + 1 }),
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

function LipSyncPanel({ audioBlobUrl }: { audioBlobUrl: string | null }) {
  const [imageUrl, setImageUrl] = useState('')
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
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

// ─── Page ────────────────────────────────────────────────────
export default function ReelCreatorPage() {
  const supabase = createClient()

  // Niche detection
  const [niche, setNiche] = useState<string>('')
  useEffect(() => {
    async function detectNiche() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('tenant:tenants(niche)')
        .eq('id', user.id)
        .single()
      const n = (data?.tenant as { niche?: string } | null)?.niche ?? ''
      setNiche(n)
    }
    detectNiche()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Form state
  const [topic, setTopic] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<Format>('reel')
  const [duration, setDuration] = useState(30)
  const [talkingObject, setTalkingObject] = useState(false)

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [output, setOutput] = useState('')
  const [done, setDone] = useState(false)
  const [ttsAudioBlobUrl, setTtsAudioBlobUrl] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

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
  }, [topic, url, description, format, duration, talkingObject, generating])

  const nicheLabel = NICHE_LABELS[niche] ?? niche

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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

      {/* Form */}
      {!done && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
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

          {/* Talking Object toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">🎭 Objeto Falante Viral</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Gerar 5 opções de objetos animados com prompts AI e scripts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTalkingObject(t => !t)}
              className="flex-shrink-0"
            >
              {talkingObject
                ? <ToggleRight className="w-8 h-8 text-purple-600" />
                : <ToggleLeft className="w-8 h-8 text-gray-300" />
              }
            </button>
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

      {/* Results — sectioned cards */}
      {done && sections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Pacote gerado ✓</p>
            <CopyBtn text={output} />
          </div>
          <SceneImagePanel output={output} />
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
