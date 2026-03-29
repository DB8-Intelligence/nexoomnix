'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, Scissors, Wrench, Stethoscope, Scale, Home, PawPrint,
  GraduationCap, Apple, HardHat, Camera, UtensilsCrossed, Dumbbell, Calculator,
  CheckCircle2, ChevronRight, Loader2, Eye, EyeOff
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NICHE_CONFIGS, PLANS, type NicheSlug } from '@/lib/niche-config'
import { slugify } from '@/lib/utils'
import type { PlanType } from '@/types/database'
import { PersonaSelector } from '@/components/content-ai/PersonaSelector'
import { getPersonaForNiche } from '@/lib/content-ai/content-personas'
import type { PersonaId } from '@/lib/content-ai/content-personas'

type Step = 'account' | 'niche' | 'business' | 'persona' | 'plan' | 'success'

const NICHE_ICONS: Record<NicheSlug, React.ReactNode> = {
  beleza:      <Scissors className="w-6 h-6" />,
  tecnico:     <Wrench className="w-6 h-6" />,
  saude:       <Stethoscope className="w-6 h-6" />,
  juridico:    <Scale className="w-6 h-6" />,
  imoveis:     <Home className="w-6 h-6" />,
  pet:         <PawPrint className="w-6 h-6" />,
  educacao:    <GraduationCap className="w-6 h-6" />,
  nutricao:    <Apple className="w-6 h-6" />,
  engenharia:  <HardHat className="w-6 h-6" />,
  fotografia:  <Camera className="w-6 h-6" />,
  gastronomia: <UtensilsCrossed className="w-6 h-6" />,
  fitness:     <Dumbbell className="w-6 h-6" />,
  financas:    <Calculator className="w-6 h-6" />,
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'account',  label: 'Conta' },
  { id: 'niche',    label: 'Nicho' },
  { id: 'business', label: 'Negócio' },
  { id: 'persona',  label: 'Persona' },
  { id: 'plan',     label: 'Plano' },
]

export default function CadastroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    niche: '' as NicheSlug | '',
    businessName: '',
    phone: '',
    whatsapp: '',
    plan: 'trial' as PlanType,
  })
  const [personaId, setPersonaId] = useState<PersonaId | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  function update(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const stepIndex = STEPS.findIndex(s => s.id === step)

  // ─── Step 1: Account ─────────────────────────────────────

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.fullName || !formData.email || !formData.password) return

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setStep('niche')
  }

  // ─── Step 2: Niche selection ──────────────────────────────

  function handleNicheSelect(niche: NicheSlug) {
    update('niche', niche)
    // Auto-suggest persona based on niche
    const suggested = getPersonaForNiche(niche)
    setPersonaId(suggested.id)
    setStep('business')
  }

  // ─── Step 3: Business info ────────────────────────────────

  function handleBusinessSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.businessName) return
    setStep('persona')
  }

  // ─── Step 4: Plan + Create account ───────────────────────

  async function handlePlanSelect(plan: PlanType) {
    update('plan', plan)
    await createAccount(plan)
  }

  async function createAccount(plan: PlanType) {
    if (!formData.niche) return
    setLoading(true)
    setError(null)

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (authError) throw new Error(authError.message)
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 2. Chamar setup_tenant via RPC
      const slug = slugify(formData.businessName)
      const { error: rpcError } = await supabase.rpc('setup_tenant', {
        p_user_id:   authData.user.id,
        p_name:      formData.businessName,
        p_slug:      slug,
        p_niche:     formData.niche,
        p_plan:      plan,
        p_full_name: formData.fullName,
        p_email:     formData.email,
        p_phone:     formData.phone || null,
        p_whatsapp:  formData.whatsapp || null,
      })

      if (rpcError) throw new Error(rpcError.message)

      // Save persona selection to tenant_settings if chosen
      if (personaId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', authData.user.id)
          .single()

        if (profile?.tenant_id) {
          await supabase
            .from('tenant_settings')
            .update({ content_persona_id: personaId })
            .eq('tenant_id', profile.tenant_id)
        }
      }

      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  const selectedNiche = formData.niche ? NICHE_CONFIGS[formData.niche] : null

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NexoOmnix</span>
          </div>
        </div>

        {/* Progress steps */}
        {step !== 'success' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${
                  i < stepIndex
                    ? 'text-green-600'
                    : i === stepIndex
                      ? 'text-indigo-600'
                      : 'text-gray-400'
                }`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < stepIndex
                      ? 'bg-green-100 text-green-700'
                      : i === stepIndex
                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${i < stepIndex ? 'bg-green-300' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Step: Account ── */}
        {step === 'account' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Criar sua conta</h2>
            <p className="text-gray-500 text-sm mb-6">14 dias grátis, sem cartão de crédito</p>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => update('fullName', e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => update('email', e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Já tem conta?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Entrar</Link>
            </p>
          </div>
        )}

        {/* ── Step: Niche ── */}
        {step === 'niche' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Qual é o seu negócio?</h2>
            <p className="text-gray-500 text-sm mb-6">Vamos personalizar o sistema para você</p>

            <div className="grid grid-cols-2 gap-3">
              {Object.values(NICHE_CONFIGS).map(niche => (
                <button
                  key={niche.slug}
                  onClick={() => handleNicheSelect(niche.slug)}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                >
                  <span className="text-gray-500 group-hover:text-indigo-600 transition-colors">
                    {NICHE_ICONS[niche.slug]}
                  </span>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{niche.brandName}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">
                      {niche.terms.professional}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step: Business ── */}
        {step === 'business' && selectedNiche && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: selectedNiche.primaryColor }}
              >
                {NICHE_ICONS[selectedNiche.slug]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedNiche.brandName}</h2>
                <p className="text-gray-500 text-sm">{selectedNiche.tagline}</p>
              </div>
            </div>

            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do seu negócio
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={e => update('businessName', e.target.value)}
                  placeholder={`Ex: ${selectedNiche.brandName} do João`}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={e => update('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setStep('niche')}
                className="w-full text-gray-500 hover:text-gray-700 text-sm py-1"
              >
                ← Voltar e trocar nicho
              </button>
            </form>
          </div>
        )}

        {/* ── Step: Persona ── */}
        {step === 'persona' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Persona de Conteúdo</h2>
            <p className="text-gray-500 text-sm mb-4">
              Escolha o estilo de conteúdo AI gerado para seu perfil. Você pode mudar depois.
            </p>

            <PersonaSelector
              selected={personaId}
              onSelect={setPersonaId}
              onConfirm={() => setStep('plan')}
              confirmLabel="Confirmar e escolher plano"
            />

            <button
              type="button"
              onClick={() => setStep('plan')}
              className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 mt-2"
            >
              Pular por agora
            </button>

            <button
              type="button"
              onClick={() => setStep('business')}
              className="w-full text-gray-400 hover:text-gray-600 text-xs py-1"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* ── Step: Plan ── */}
        {step === 'plan' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Escolha seu plano</h2>
            <p className="text-gray-500 text-sm mb-6">
              Comece grátis por 14 dias. Cancele quando quiser.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>
            )}

            <div className="space-y-3">
              {/* Trial option */}
              <button
                onClick={() => handlePlanSelect('trial')}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 transition-all disabled:opacity-60"
              >
                <div className="text-left">
                  <div className="font-bold text-green-800">Trial gratuito</div>
                  <div className="text-sm text-green-700">14 dias com todas as funções do Starter</div>
                </div>
                <div className="text-green-700 font-bold">R$0</div>
              </button>

              {/* Paid plans */}
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loading}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{plan.name}</span>
                      {plan.highlight && (
                        <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-medium">
                          Mais popular
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">{plan.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">R${plan.price}</div>
                    <div className="text-xs text-gray-400">/mês</div>
                  </div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-indigo-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Criando seu espaço...</span>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tudo pronto! 🎉
            </h2>
            <p className="text-gray-500 mb-2">
              Sua conta foi criada com sucesso.
            </p>
            {formData.niche && (
              <p className="text-gray-600 text-sm mb-6">
                <strong>{formData.businessName}</strong> está configurado como{' '}
                <strong>{NICHE_CONFIGS[formData.niche].brandName}</strong>
              </p>
            )}
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3 rounded-xl transition-all inline-flex items-center gap-2"
            >
              Acessar meu painel
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
