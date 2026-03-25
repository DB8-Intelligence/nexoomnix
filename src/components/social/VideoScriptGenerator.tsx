'use client'

// ============================================================
// NexoPro — VideoScriptGenerator
// Gerador de Roteiro completo para HeyGen AI Avatar
// ============================================================

import { useState } from 'react'
import type { RoteiroCompleto, CenaRoteiro, TipoCena } from '@/lib/ai'

interface GerarRoteiroRequest {
  topico: string
  formatoVideo: 'reels' | 'shorts' | 'tiktok'
  tom: 'autoridade' | 'educativo' | 'conversacional'
}

const TIPO_COLORS: Record<TipoCena, string> = {
  gancho:      'bg-red-100 text-red-700 border-red-200',
  problema:    'bg-orange-100 text-orange-700 border-orange-200',
  explicacao:  'bg-blue-100 text-blue-700 border-blue-200',
  risco:       'bg-yellow-100 text-yellow-700 border-yellow-200',
  solucao:     'bg-green-100 text-green-700 border-green-200',
  cta:         'bg-purple-100 text-purple-700 border-purple-200',
}

const TIPO_ICONS: Record<TipoCena, string> = {
  gancho:     '🎯',
  problema:   '⚠️',
  explicacao: '💡',
  risco:      '🔴',
  solucao:    '✅',
  cta:        '📣',
}

function CenaCard({ cena, onCopy }: { cena: CenaRoteiro; onCopy: (text: string) => void }) {
  const colorClass = TIPO_COLORS[cena.tipo]
  const icon = TIPO_ICONS[cena.tipo]

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header da cena */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${colorClass}`}>
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-bold text-sm tracking-wide">
            Cena {cena.numero} — {cena.tipoLabel}
          </span>
        </div>
        <span className="text-xs font-medium opacity-70">{cena.duracaoSegundos}s</span>
      </div>

      {/* Corpo */}
      <div className="p-4 space-y-3">
        {/* Fala */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fala do Avatar</p>
          <p className="text-gray-800 text-sm leading-relaxed font-medium">&ldquo;{cena.fala}&rdquo;</p>
        </div>

        {/* Movimento + Dica */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Movimento HeyGen</p>
            <p className="text-gray-700 text-xs">{cena.movimento}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dica de Configuração</p>
            <p className="text-gray-700 text-xs">{cena.dicaHeygen}</p>
          </div>
        </div>

        {/* Copiar cena */}
        <button
          onClick={() => onCopy(`[CENA ${cena.numero} — ${cena.tipoLabel}]\nFala: "${cena.fala}"\nMovimento: ${cena.movimento}\nDica: ${cena.dicaHeygen}`)}
          className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
        >
          Copiar esta cena
        </button>
      </div>
    </div>
  )
}

function MecanismoCard({ mecanismo }: { mecanismo: RoteiroCompleto['mecanismo'] }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4">
      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Mecanismo de Viralidade</p>
      <div className="space-y-2">
        <div className="flex gap-2">
          <span className="text-sm">😨</span>
          <div>
            <span className="text-xs font-semibold text-gray-500">Medo ativado: </span>
            <span className="text-xs text-gray-700">{mecanismo.medo}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-sm">❌</span>
          <div>
            <span className="text-xs font-semibold text-gray-500">Erro apontado: </span>
            <span className="text-xs text-gray-700">{mecanismo.erro}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="text-sm">🤔</span>
          <div>
            <span className="text-xs font-semibold text-gray-500">Curiosidade: </span>
            <span className="text-xs text-gray-700">{mecanismo.curiosidade}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VideoScriptGenerator() {
  const [topico, setTopico] = useState('')
  const [formatoVideo, setFormatoVideo] = useState<GerarRoteiroRequest['formatoVideo']>('reels')
  const [tom, setTom] = useState<GerarRoteiroRequest['tom']>('autoridade')
  const [roteiro, setRoteiro] = useState<RoteiroCompleto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGerar() {
    if (!topico.trim()) return
    setLoading(true)
    setError(null)
    setRoteiro(null)

    try {
      const res = await fetch('/api/ai/gerar-roteiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topico, formatoVideo, tom }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao gerar roteiro')
        return
      }

      setRoteiro(data as RoteiroCompleto)
    } catch {
      setError('Falha na conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildRoteiroCompleto(r: RoteiroCompleto): string {
    const linhas: string[] = [
      `ROTEIRO: ${r.titulo}`,
      `Tema: ${r.tema}`,
      `Ângulo: ${r.angulo}`,
      `Duração estimada: ${r.duracaoTotal}`,
      '',
      '─────────────────────────────',
    ]

    r.cenas.forEach(c => {
      linhas.push(`\n[CENA ${c.numero} — ${c.tipoLabel}] (${c.duracaoSegundos}s)`)
      linhas.push(`Fala: "${c.fala}"`)
      linhas.push(`Movimento: ${c.movimento}`)
      linhas.push(`Dica HeyGen: ${c.dicaHeygen}`)
    })

    linhas.push('')
    linhas.push('─────────────────────────────')
    linhas.push(`\nLegenda do Post:\n${r.legenda}`)
    linhas.push(`\nHashtags: ${r.hashtags.map(h => `#${h}`).join(' ')}`)

    return linhas.join('\n')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Painel de entrada */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">🎬</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Gerador de Roteiro HeyGen</h2>
            <p className="text-xs text-gray-500">Cole um tema, assunto ou descrição de vídeo</p>
          </div>
        </div>

        {/* Input do tema */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tema ou assunto do vídeo
          </label>
          <textarea
            value={topico}
            onChange={e => setTopico(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={
              'Ex: "3 erros ao comprar imóvel"\n' +
              'Ou: "Como pagar menos imposto na venda do imóvel"\n' +
              'Ou cole a descrição de um vídeo que você viu e quer transformar no seu'
            }
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{topico.length}/500</p>
        </div>

        {/* Opções */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Formato</label>
            <select
              value={formatoVideo}
              onChange={e => setFormatoVideo(e.target.value as GerarRoteiroRequest['formatoVideo'])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="reels">Instagram Reels</option>
              <option value="shorts">YouTube Shorts</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tom da fala</label>
            <select
              value={tom}
              onChange={e => setTom(e.target.value as GerarRoteiroRequest['tom'])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="autoridade">Autoridade</option>
              <option value="educativo">Educativo</option>
              <option value="conversacional">Conversacional</option>
            </select>
          </div>
        </div>

        {/* Botão gerar */}
        <button
          onClick={handleGerar}
          disabled={loading || topico.trim().length < 5}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Gerando roteiro com IA...
            </span>
          ) : (
            'Gerar Roteiro para HeyGen'
          )}
        </button>

        {/* Erro */}
        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Resultado */}
      {roteiro && (
        <div className="space-y-4">
          {/* Cabeçalho do roteiro */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-violet-200 text-xs font-medium uppercase tracking-wider mb-1">Roteiro gerado</p>
                <h3 className="text-white font-bold text-base leading-snug">{roteiro.titulo}</h3>
                <p className="text-violet-200 text-xs mt-1">{roteiro.angulo}</p>
              </div>
              <div className="flex-shrink-0 ml-4 text-right">
                <p className="text-violet-200 text-xs">Duração total</p>
                <p className="text-white font-bold text-lg">{roteiro.duracaoTotal}</p>
              </div>
            </div>

            {/* Botão copiar tudo */}
            <button
              onClick={() => copyToClipboard(buildRoteiroCompleto(roteiro))}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {copied ? '✓ Copiado!' : 'Copiar roteiro completo'}
            </button>
          </div>

          {/* Mecanismo de viralidade */}
          <MecanismoCard mecanismo={roteiro.mecanismo} />

          {/* Cenas */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Cenas do vídeo</p>
            {roteiro.cenas.map(cena => (
              <CenaCard key={cena.numero} cena={cena} onCopy={copyToClipboard} />
            ))}
          </div>

          {/* Legenda e hashtags */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Legenda do Post</p>
              <p className="text-sm text-gray-700">{roteiro.legenda}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Hashtags</p>
              <div className="flex flex-wrap gap-1.5">
                {roteiro.hashtags.map(h => (
                  <span
                    key={h}
                    className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100"
                  >
                    #{h}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(`${roteiro.legenda}\n\n${roteiro.hashtags.map(h => `#${h}`).join(' ')}`)}
              className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
            >
              Copiar legenda + hashtags
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
