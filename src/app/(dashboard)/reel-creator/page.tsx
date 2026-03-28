'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Film, Link2, FileText, Sparkles, Copy, Check, RefreshCw, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react'
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
