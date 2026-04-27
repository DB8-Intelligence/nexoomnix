'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'

interface BrandingData {
  about:        string
  audience:     string
  tone:         string
  differential: string
  pain_point:   string
  colors:       string
  phrase:       string
}

interface BrandingWizardProps {
  businessName: string
  niche: string
  onComplete: (data: BrandingData) => void
}

const TONES = [
  { id: 'descontraido', emoji: '😄', label: 'Descontraído',  desc: 'Informal, próximo, como um amigo' },
  { id: 'inspirador',   emoji: '🚀', label: 'Inspirador',    desc: 'Motivacional, que emociona' },
  { id: 'educativo',    emoji: '📚', label: 'Educativo',     desc: 'Ensina, explica, informa' },
  { id: 'emocional',    emoji: '❤️', label: 'Emocional',     desc: 'Toca o coração, gera conexão' },
  { id: 'formal',       emoji: '💼', label: 'Profissional',  desc: 'Sério, confiável, técnico' },
]

const NICHE_EXAMPLES: Record<string, { about: string; audience: string; differential: string; pain_point: string }> = {
  beleza:      { about: 'Salão de beleza especializado em coloração e escova',          audience: 'Mulheres de 25 a 45 anos que querem se cuidar',           differential: 'Atendimento personalizado e produtos premium',      pain_point: 'Cabelo sem vida e cor que não dura' },
  tecnico:     { about: 'Assistência técnica de celulares e notebooks',                 audience: 'Pessoas e empresas que precisam de reparo rápido',        differential: 'Reparo no dia e garantia de 90 dias',               pain_point: 'Medo de perder dados e ficar sem o aparelho' },
  saude:       { about: 'Clínica de consultas médicas e exames',                        audience: 'Famílias que buscam saúde preventiva',                    differential: 'Atendimento humanizado sem filas',                  pain_point: 'Dificuldade de agendar e ser bem atendido' },
  juridico:    { about: 'Escritório de advocacia focado em direito trabalhista',        audience: 'Trabalhadores que tiveram direitos violados',              differential: 'Consulta gratuita e honorários só no êxito',        pain_point: 'Medo de perder direitos por falta de informação' },
  pet:         { about: 'Pet shop com banho, tosa e veterinário',                       audience: 'Tutores que tratam seus pets como família',               differential: 'Atendimento carinhoso com produtos naturais',       pain_point: 'Preocupação com a saúde e bem-estar do pet' },
  educacao:    { about: 'Escola de reforço e preparatório para vestibular',             audience: 'Estudantes do ensino médio e seus pais',                  differential: 'Metodologia personalizada com resultados comprovados', pain_point: 'Dificuldade em matérias específicas e reprovação' },
  nutricao:    { about: 'Nutricionista especializada em emagrecimento saudável',        audience: 'Adultos que querem emagrecer sem sofrimento',             differential: 'Cardápios práticos que cabem na rotina',            pain_point: 'Tentou várias dietas e voltou ao peso original' },
  engenharia:  { about: 'Escritório de engenharia civil e projetos',                   audience: 'Pessoas que querem construir ou reformar',                differential: 'Projetos aprovados na prefeitura sem complicação',   pain_point: 'Medo de obra cara, atrasada e com problemas' },
  fotografia:  { about: 'Fotógrafo especializado em casamentos e ensaios',             audience: 'Casais e famílias que querem eternizar momentos',         differential: 'Entrega em 7 dias e álbum impresso incluso',        pain_point: 'Medo de ficar sem fotos profissionais de momentos únicos' },
  gastronomia: { about: 'Restaurante especializado em comida caseira',                 audience: 'Famílias e trabalhadores que querem almoçar bem',         differential: 'Receitas da vovó com ingredientes frescos todo dia', pain_point: 'Comida de restaurante cara e sem sabor de casa' },
  fitness:     { about: 'Academia com personal trainer incluso',                        audience: 'Adultos que querem emagrecer e ganhar disposição',        differential: 'Treino personalizado para cada objetivo',           pain_point: 'Começou academia várias vezes e desistiu' },
  financas:    { about: 'Escritório de contabilidade para pequenas empresas',          audience: 'Donos de pequenos negócios e MEIs',                       differential: 'Declarações sem erro e sem multa garantido',        pain_point: 'Medo do Fisco e de pagar impostos a mais' },
}

export function BrandingWizard({ businessName, niche, onComplete }: BrandingWizardProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const examples = NICHE_EXAMPLES[niche] ?? NICHE_EXAMPLES['beleza']

  const [data, setData] = useState<BrandingData>({
    about:        '',
    audience:     '',
    tone:         'descontraido',
    differential: '',
    pain_point:   '',
    colors:       '',
    phrase:       '',
  })

  function set(field: keyof BrandingData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      onComplete(data)
    } finally {
      setSaving(false)
    }
  }

  const canAdvance = [
    data.about.trim().length > 5,
    data.audience.trim().length > 5,
    true, // step 3 always valid (tone has default)
  ][step - 1] ?? true

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium opacity-90">Configuração inicial • 2 minutos</span>
          </div>
          <h2 className="text-xl font-bold">Vamos conhecer seu negócio</h2>
          <p className="text-sm opacity-80 mt-0.5">
            Com isso, cada reel gerado será personalizado para <strong>{businessName}</strong>
          </p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-all ${
                  s <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          {/* Step 1 — O negócio */}
          {step === 1 && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5">O que você faz? 🏪</h3>
                <p className="text-xs text-gray-500 mb-2">Descreva brevemente seu negócio e especialidades</p>
                <textarea
                  value={data.about}
                  onChange={e => set('about', e.target.value)}
                  placeholder={`Ex: ${examples.about}`}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Para quem você trabalha? 👥</h3>
                <p className="text-xs text-gray-500 mb-2">Quem são seus clientes ideais?</p>
                <textarea
                  value={data.audience}
                  onChange={e => set('audience', e.target.value)}
                  placeholder={`Ex: ${examples.audience}`}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Step 2 — Diferencial + dor */}
          {step === 2 && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Qual é o seu maior diferencial? ⭐</h3>
                <p className="text-xs text-gray-500 mb-2">O que te faz diferente dos concorrentes?</p>
                <textarea
                  value={data.differential}
                  onChange={e => set('differential', e.target.value)}
                  placeholder={`Ex: ${examples.differential}`}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Qual dor você resolve? 💊</h3>
                <p className="text-xs text-gray-500 mb-2">O maior problema do seu cliente antes de te encontrar</p>
                <textarea
                  value={data.pain_point}
                  onChange={e => set('pain_point', e.target.value)}
                  placeholder={`Ex: ${examples.pain_point}`}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Step 3 — Tom + identidade */}
          {step === 3 && (
            <>
              <div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Como você se comunica? 🎙️</h3>
                <p className="text-xs text-gray-500 mb-3">Escolha o tom de voz dos seus reels</p>
                <div className="grid grid-cols-1 gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set('tone', t.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                        data.tone === t.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{t.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{t.label}</p>
                        <p className="text-xs text-gray-500">{t.desc}</p>
                      </div>
                      {data.tone === t.id && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Cores da marca 🎨 <span className="text-gray-400">(opcional)</span></label>
                  <input
                    value={data.colors}
                    onChange={e => set('colors', e.target.value)}
                    placeholder="Ex: azul e branco"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Slogan <span className="text-gray-400">(opcional)</span></label>
                  <input
                    value={data.phrase}
                    onChange={e => set('phrase', e.target.value)}
                    placeholder="Ex: Qualidade que transforma"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <button
            type="button"
            disabled={!canAdvance || saving}
            onClick={() => step < 3 ? setStep(s => s + 1) : handleFinish()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : step < 3 ? (
              <>Continuar <ChevronRight className="w-4 h-4" /></>
            ) : (
              <><Sparkles className="w-4 h-4" /> Pronto! Gerar meu primeiro reel</>
            )}
          </button>
        </div>

        {/* Skip */}
        <div className="px-6 pb-4 text-center">
          <button
            type="button"
            onClick={() => onComplete(data)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Pular por agora (configurar depois em Configurações)
          </button>
        </div>
      </div>
    </div>
  )
}
