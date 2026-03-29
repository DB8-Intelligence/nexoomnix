import Link from 'next/link'
import { Check, Zap, ArrowRight, Star } from 'lucide-react'

const NICHES = [
  { slug: 'beleza',      name: 'Salão & Barbearia',    href: '/salaopro',    emoji: '💇' },
  { slug: 'saude',       name: 'Clínica & Saúde',       href: '/clinicapro',  emoji: '🏥' },
  { slug: 'tecnico',     name: 'Serviços Técnicos',     href: '/ordemdeservico', emoji: '🔧' },
  { slug: 'imoveis',     name: 'Imobiliária',           href: '/imobpro',     emoji: '🏠' },
  { slug: 'juridico',    name: 'Advocacia',             href: '/juridicpro',  emoji: '⚖️' },
  { slug: 'pet',         name: 'Pet Shop & Vet',        href: '/petpro',      emoji: '🐾' },
  { slug: 'educacao',    name: 'Escola & Cursos',       href: '/educapro',    emoji: '🎓' },
  { slug: 'nutricao',    name: 'Nutrição & Fitness',    href: '/nutripro',    emoji: '🥗' },
  { slug: 'engenharia',  name: 'Engenharia & Arquitetura', href: '/engepro',     emoji: '🏗️' },
  { slug: 'fotografia',  name: 'Fotografia & Vídeo',    href: '/fotopro',     emoji: '📸' },
  { slug: 'gastronomia', name: 'Restaurante & Bar',      href: '/gastronomia', emoji: '🍽️' },
  { slug: 'fitness',     name: 'Academia & Personal',    href: '/fitness',     emoji: '💪' },
  { slug: 'financas',    name: 'Contabilidade & Finanças', href: '/financas', emoji: '📊' },
]

const FEATURES = [
  'Omnix Agenda — agendamentos online',
  'Omnix CRM — gestão de clientes',
  'Omnix Reels — reels virais com IA',
  'Omnix Social — posts automáticos',
  'Omnix Sites — site público do negócio',
  'Financeiro e fluxo de caixa',
  'DRE automático mensal',
  'Agente IA Contador 24h',
]

const PLANS = [
  { name: 'Starter', price: 'R$ 99', desc: 'Para começar' },
  { name: 'Pro', price: 'R$ 199', desc: 'Para crescer', highlight: true },
  { name: 'Pro Plus', price: 'R$ 349', desc: 'IA completa' },
  { name: 'Enterprise', price: 'R$ 699', desc: 'Equipes' },
]

export function NexoOmnixLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">NexoOmnix</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Começar grátis <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 py-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6">
          <Star className="w-3 h-3" />
          14 dias grátis — sem cartão de crédito
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Crie, automatize e escale<br />
          <span className="text-blue-600">o marketing do seu negócio</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Plataforma completa para criar reels virais, publicar nas redes sociais,
          gerenciar clientes e crescer online — tudo num só lugar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/cadastro"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Começar grátis por 14 dias
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Já tenho conta →
          </Link>
        </div>
      </section>

      {/* Nichos */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            Especializado para o seu segmento
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {NICHES.map(niche => (
              <Link
                key={niche.slug}
                href={niche.href}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all text-center"
              >
                <span className="text-2xl">{niche.emoji}</span>
                <span className="text-xs font-medium text-gray-700">{niche.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Tudo que você precisa, num só lugar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
          {FEATURES.map(feat => (
            <div key={feat} className="flex items-center gap-3 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feat}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="px-6 py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Planos simples e transparentes</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Comece grátis. Sem taxas escondidas.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`p-5 rounded-xl border text-center ${plan.highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              >
                <p className={`text-sm font-bold ${plan.highlight ? 'text-blue-700' : 'text-gray-900'}`}>
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {plan.price}
                  <span className="text-xs font-normal text-gray-400">/mês</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{plan.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Começar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} NexoOmnix · DB8-Intelligence · Todos os direitos reservados</p>
        <p className="mt-1">
          <Link href="/login" className="hover:text-gray-600">Entrar</Link>
          {' · '}
          <Link href="/cadastro" className="hover:text-gray-600">Cadastrar</Link>
        </p>
      </footer>
    </div>
  )
}
