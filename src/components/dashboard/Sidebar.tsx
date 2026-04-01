'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap, Calendar, Users, DollarSign, BarChart3, FileText,
  Share2, Globe, Bot, Bell, Settings, X, ChevronRight,
  ClipboardList, Home, BookOpen, Package, Sparkles, CreditCard, PieChart, Film, FlaskConical, Kanban
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNicheConfig } from '@/lib/niche-config'
import type { Tenant } from '@/types/database'

interface SidebarProps {
  tenant: Tenant
  open: boolean
  onClose: () => void
  productMode?: string
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
  requiredModule?: string
}

function getNavItems(tenant: Tenant): NavItem[] {
  const niche = tenant.niche

  // Módulo de agenda/OS muda por nicho
  const agendaItem: NavItem = niche === 'tecnico'
    ? { href: '/agenda', label: 'Ordens de Serviço', icon: <ClipboardList className="w-4 h-4" />, requiredModule: 'agenda' }
    : niche === 'imoveis'
      ? { href: '/agenda', label: 'Visitas', icon: <Calendar className="w-4 h-4" />, requiredModule: 'agenda' }
      : { href: '/agenda', label: 'Omnix Agenda', icon: <Calendar className="w-4 h-4" />, requiredModule: 'agenda' }

  const clientsItem: NavItem = {
    href: '/clientes',
    label: niche === 'saude' || niche === 'nutricao' ? 'Pacientes'
      : niche === 'educacao' ? 'Alunos'
      : niche === 'pet' ? 'Tutores & Pets'
      : 'Clientes',
    icon: <Users className="w-4 h-4" />,
    requiredModule: 'clientes',
  }

  const crmItem: NavItem = {
    href: '/crm',
    label: 'Omnix CRM',
    icon: <Kanban className="w-4 h-4" />,
    requiredModule: 'clientes',
  }

  return [
    agendaItem,
    clientsItem,
    crmItem,
    ...(niche === 'juridico' || niche === 'imoveis' ? [
      { href: '/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" />, requiredModule: 'documentos' },
    ] : []),
    ...(niche === 'tecnico' || niche === 'pet' ? [
      { href: '/estoque', label: 'Estoque', icon: <Package className="w-4 h-4" />, requiredModule: 'estoque' },
    ] : []),
    ...(niche === 'imoveis' ? [
      { href: '/imoveis', label: 'Imóveis', icon: <Home className="w-4 h-4" />, requiredModule: 'imoveis' },
    ] : []),
    ...(niche === 'educacao' ? [
      { href: '/cursos', label: 'Cursos / Turmas', icon: <BookOpen className="w-4 h-4" />, requiredModule: 'cursos' },
    ] : []),
    { href: '/financeiro', label: 'Financeiro', icon: <DollarSign className="w-4 h-4" />, requiredModule: 'financeiro' },
    { href: '/relatorios', label: 'Relatórios', icon: <PieChart className="w-4 h-4" />, requiredModule: 'contabilidade', badge: 'Pro+' },
    { href: '/contabilidade', label: 'Contabilidade', icon: <BarChart3 className="w-4 h-4" />, requiredModule: 'contabilidade', badge: 'Pro+' },
    { href: '/conteudo', label: 'Omnix Content', icon: <Sparkles className="w-4 h-4" />, requiredModule: 'content_ai', badge: 'Pro' },
    { href: '/reel-creator', label: 'Omnix Reels', icon: <Film className="w-4 h-4" />, requiredModule: 'content_ai', badge: 'Pro' },
    { href: '/reel-creator/analisar', label: 'Analisar por Link', icon: <Zap className="w-4 h-4" />, requiredModule: 'content_ai', badge: 'Pro' },
    { href: '/redes-sociais', label: 'Omnix Social', icon: <Share2 className="w-4 h-4" />, requiredModule: 'social', badge: 'Pro' },
    { href: '/site-publico', label: 'Omnix Sites', icon: <Globe className="w-4 h-4" />, requiredModule: 'site', badge: 'Pro' },
    { href: '/ia-contador', label: 'IA Contador', icon: <Bot className="w-4 h-4" />, requiredModule: 'ia_contador', badge: 'Enterprise' },
  ]
}

const REELCREATOR_NAV: NavItem[] = [
  { href: '/reel-creator',         label: 'Omnix Reels',       icon: <Film className="w-4 h-4" />,     requiredModule: 'content_ai' },
  { href: '/reel-creator/analisar',label: 'Analisar por Link', icon: <Zap className="w-4 h-4" />,      requiredModule: 'content_ai', badge: 'Pro' },
  { href: '/conteudo',             label: 'Omnix Content',     icon: <Sparkles className="w-4 h-4" />, requiredModule: 'content_ai' },
  { href: '/redes-sociais',        label: 'Omnix Social',      icon: <Share2 className="w-4 h-4" />,   requiredModule: 'social',     badge: 'Pro' },
]

export function Sidebar({ tenant, open, onClose, productMode = 'nexoomnix' }: SidebarProps) {
  const pathname = usePathname()
  const niche = getNicheConfig(tenant.niche)
  const isReelCreator = productMode === 'reelcreator'
  const navItems = isReelCreator ? REELCREATOR_NAV : getNavItems(tenant)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              data-color={niche.primaryColor}
              style={{ backgroundColor: niche.primaryColor }} // dynamic brand color — cannot be a Tailwind class
            >
              {isReelCreator ? <Film className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4 text-white" />}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm truncate">
              {isReelCreator ? 'ReelCreator AI' : tenant.name}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {isReelCreator ? 'by NexoOmnix' : niche.brandName}
            </div>
          </div>
        </Link>
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Plan badge */}
      <div className="px-5 py-3">
        <span className={cn('badge-plan', tenant.plan)}>
          {tenant.plan === 'trial' && '⏳ '}
          {tenant.plan === 'enterprise' && '⭐ '}
          {tenant.plan.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin space-y-0.5">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            pathname === '/dashboard'
              ? 'bg-brand/10 text-brand'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
          style={pathname === '/dashboard' ? { color: niche.primaryColor, backgroundColor: `${niche.primaryColor}15` } : {}}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          Dashboard
        </Link>

        {navItems.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand/10 text-brand'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              style={isActive ? { color: niche.primaryColor, backgroundColor: `${niche.primaryColor}15` } : {}}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && !isActive && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/admin/skills"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            pathname.startsWith('/admin/skills')
              ? 'bg-violet-50 text-violet-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <FlaskConical className="w-4 h-4 flex-shrink-0" />
          Skills Factory
          <span className="ml-auto text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-md font-medium">IA</span>
        </Link>
        <Link
          href="/assinatura"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <CreditCard className="w-4 h-4 flex-shrink-0" />
          Assinatura
        </Link>
        <Link
          href="/notificacoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <Bell className="w-4 h-4 flex-shrink-0" />
          Notificações
        </Link>
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          Configurações
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-30 transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {sidebarContent}
      </aside>
    </>
  )
}
