'use client'

import { useState, useEffect } from 'react'
import {
  Share2, Instagram, Facebook, Sparkles, Lock, Calendar,
  Image as ImageIcon, Plus, CheckCircle, Clock, AlertCircle,
  ExternalLink, Zap, Send, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { MetaConnectButton } from '@/components/content-ai/MetaConnectButton'

type Tab = 'calendario' | 'criar' | 'contas' | 'historico'

interface PostIdea {
  titulo: string
  legenda: string
  hashtags: string[]
  formato: 'reel' | 'post' | 'stories' | 'carrossel'
}

interface ScheduledPost {
  id: string
  caption: string
  media_type: string
  status: 'pending' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled'
  scheduled_for: string | null
  published_at: string | null
  platform_permalink: string | null
  error_message: string | null
  created_at: string
  social_media_connections: {
    platform: string
    account_name: string | null
    account_username: string | null
  } | null
}

const FORMATO_COLORS = {
  reel:      'bg-purple-100 text-purple-700',
  post:      'bg-blue-100 text-blue-700',
  stories:   'bg-pink-100 text-pink-700',
  carrossel: 'bg-orange-100 text-orange-700',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled:  { label: 'Agendado',    color: 'bg-blue-50 text-blue-700 border-blue-100',   icon: <Clock className="w-3 h-3" /> },
  publishing: { label: 'Publicando',  color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  published:  { label: 'Publicado',   color: 'bg-green-50 text-green-700 border-green-100', icon: <CheckCircle className="w-3 h-3" /> },
  failed:     { label: 'Falhou',      color: 'bg-red-50 text-red-700 border-red-100',      icon: <AlertCircle className="w-3 h-3" /> },
  pending:    { label: 'Pendente',    color: 'bg-gray-50 text-gray-600 border-gray-100',   icon: <Clock className="w-3 h-3" /> },
  cancelled:  { label: 'Cancelado',   color: 'bg-gray-50 text-gray-500 border-gray-100',   icon: <AlertCircle className="w-3 h-3" /> },
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface RedesSociaisViewProps {
  isPro: boolean
  isProMax: boolean
}

// ─── Scheduled Post Card ─────────────────────────────────────

function PostCard({ post }: { post: ScheduledPost }) {
  const cfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.pending
  const platform = post.social_media_connections?.platform ?? 'unknown'
  const handle = post.social_media_connections?.account_username
    ? `@${post.social_media_connections.account_username}`
    : post.social_media_connections?.account_name ?? platform

  const dateLabel = post.published_at
    ? new Date(post.published_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : post.scheduled_for
      ? new Date(post.scheduled_for).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '—'

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {platform === 'instagram'
            ? <Instagram className="w-3.5 h-3.5 text-pink-500" />
            : <Facebook className="w-3.5 h-3.5 text-blue-500" />
          }
          <span className="text-xs text-gray-500">{handle}</span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </span>
      </div>

      <p className="text-xs text-gray-700 line-clamp-2">{post.caption.slice(0, 120)}{post.caption.length > 120 ? '…' : ''}</p>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{dateLabel}</span>
        {post.platform_permalink && (
          <a
            href={post.platform_permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline"
          >
            Ver post <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {post.status === 'failed' && post.error_message && (
          <span className="text-[11px] text-red-500 truncate max-w-[140px]" title={post.error_message}>
            {post.error_message}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export function RedesSociaisView({ isPro, isProMax }: RedesSociaisViewProps) {
  const [tab, setTab] = useState<Tab>('calendario')
  const [gerando, setGerando] = useState(false)
  const [ideias, setIdeias] = useState<PostIdea[]>([])
  const [tema, setTema] = useState('')
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  const hoje = new Date()
  const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getDay()

  // Load posts when on calendário or histórico tab and user has Pro Max
  useEffect(() => {
    if (isProMax && (tab === 'calendario' || tab === 'historico') && posts.length === 0) {
      loadPosts()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isProMax])

  async function loadPosts() {
    setLoadingPosts(true)
    try {
      const res = await fetch('/api/meta/schedule')
      if (res.ok) {
        const data = await res.json() as { posts: ScheduledPost[] }
        setPosts(data.posts ?? [])
      }
    } finally {
      setLoadingPosts(false)
    }
  }

  async function gerarIdeias() {
    if (!tema.trim()) return
    setGerando(true)
    try {
      const res = await fetch('/api/ai/gerar-conteudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'ideias_posts', tema, quantidade: 4 }),
      })
      const data = await res.json() as { ideias?: PostIdea[] }
      if (data.ideias) setIdeias(data.ideias)
    } catch { /* silent */ }
    finally { setGerando(false) }
  }

  // Days with scheduled posts
  const scheduledDays = new Set(
    posts
      .filter(p => p.scheduled_for && p.status === 'scheduled')
      .map(p => new Date(p.scheduled_for!).getDate())
  )
  const publishedDays = new Set(
    posts
      .filter(p => p.published_at)
      .map(p => new Date(p.published_at!).getDate())
  )

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-purple-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Redes Sociais IA — Plano Pro</h3>
        <p className="text-gray-500 text-sm max-w-xs mb-4">
          Crie posts, reels e stories com IA, gerencie seu calendário editorial e conecte Instagram e Facebook.
        </p>
        <Link href="/assinatura" className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          Fazer upgrade
        </Link>
      </div>
    )
  }

  const scheduledPosts = posts.filter(p => ['scheduled', 'publishing', 'pending'].includes(p.status))
  const historyPosts = posts.filter(p => ['published', 'failed', 'cancelled'].includes(p.status))

  return (
    <div className="space-y-6">
      {/* PRO MAX Banner */}
      {!isProMax && (
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">🚀 Auto-post Instagram & Facebook</p>
              <p className="text-xs text-gray-500">Publique automaticamente via Meta API com o plano PRO MAX</p>
            </div>
          </div>
          <Link href="/assinatura" className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90 font-medium whitespace-nowrap">
            Upgrade PRO MAX
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0.5 overflow-x-auto">
          {([
            { key: 'calendario',  label: 'Calendário',       icon: Calendar },
            { key: 'criar',       label: 'Criar com IA',     icon: Sparkles },
            { key: 'contas',      label: 'Contas Conectadas', icon: Share2  },
            { key: 'historico',   label: 'Histórico',        icon: CheckCircle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {key === 'calendario' && scheduledPosts.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                  {scheduledPosts.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendário ──────────────────────────────────────── */}
      {tab === 'calendario' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-900">
              {hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            <Link
              href="/conteudo"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo conteúdo
            </Link>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: diasMes }).map((_, i) => {
              const dia = i + 1
              const isHoje = dia === hoje.getDate()
              const hasScheduled = scheduledDays.has(dia)
              const hasPublished = publishedDays.has(dia)
              return (
                <div
                  key={dia}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer hover:bg-gray-100 transition-colors ${
                    isHoje ? 'bg-blue-600 text-white font-semibold hover:bg-blue-700' : 'text-gray-700'
                  }`}
                >
                  {dia}
                  {(hasScheduled || hasPublished) && (
                    <div className="absolute bottom-1 flex gap-0.5">
                      {hasScheduled && <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                      {hasPublished && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" /> Agendado</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full" /> Publicado</span>
          </div>

          {/* Scheduled posts list */}
          {loadingPosts ? (
            <div className="mt-6 flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Carregando posts...
            </div>
          ) : scheduledPosts.length > 0 ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Posts agendados</p>
              {scheduledPosts.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          ) : (
            <div className="mt-6 text-center py-8 text-gray-400 text-sm">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              Crie conteúdo com IA para preencher seu calendário.
            </div>
          )}
        </div>
      )}

      {/* ── Criar com IA ────────────────────────────────────── */}
      {tab === 'criar' && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Gerador rápido de ideias</p>
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tema}
                  onChange={e => setTema(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && gerarIdeias()}
                  placeholder="Ex: promoção de natal, novo serviço, dica profissional..."
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={gerarIdeias}
                  disabled={gerando || !tema.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {gerando ? 'Gerando...' : 'Gerar ideias'}
                </button>
              </div>
            </div>
          </div>

          {ideias.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ideias.map((ideia, i) => (
                <div key={i} className="p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900">{ideia.titulo}</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${FORMATO_COLORS[ideia.formato]}`}>
                      {ideia.formato}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-3">{ideia.legenda}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {ideia.hashtags.slice(0, 4).map(h => (
                      <span key={h} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">#{h}</span>
                    ))}
                  </div>
                  <Link
                    href={`/conteudo?tema=${encodeURIComponent(ideia.titulo)}`}
                    className="block text-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                  >
                    Criar com IA
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              Digite um tema e clique em &quot;Gerar ideias&quot; para criar posts com IA
            </div>
          )}
        </div>
      )}

      {/* ── Contas Conectadas ───────────────────────────────── */}
      {tab === 'contas' && (
        <div className="space-y-4">
          {isProMax ? (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-1">Contas Meta conectadas</p>
                <p className="text-xs text-gray-500 mb-4">
                  Conecte sua conta Instagram Business e Página do Facebook para habilitar o auto-post.
                </p>
                <MetaConnectButton />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">Como funciona:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Clique em <strong>Conectar</strong> para autorizar via Facebook OAuth</li>
                  <li>Suas páginas do Facebook e contas Instagram Business são importadas automaticamente</li>
                  <li>Após gerar o conteúdo, use o botão <strong>Auto-publicar</strong></li>
                  <li>Escolha entre publicar agora ou agendar para um horário específico</li>
                </ul>
                <p className="text-gray-500 pt-1">
                  Requer conta <strong>Instagram Business ou Creator</strong> vinculada a uma Página do Facebook.
                  Perfis pessoais não são suportados pela API do Meta.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* Static cards with upgrade prompt */}
              {[
                { label: 'Instagram', icon: Instagram, desc: 'Publique Reels, posts e carrosséis automaticamente', color: 'text-pink-600 bg-pink-50 border-pink-100' },
                { label: 'Facebook', icon: Facebook, desc: 'Publique nas suas Páginas do Facebook', color: 'text-blue-600 bg-blue-50 border-blue-100' },
              ].map(({ label, icon: Icon, desc, color }) => (
                <div key={label} className={`flex items-center gap-4 p-4 border rounded-xl ${color} opacity-60`}>
                  <Icon className="w-6 h-6 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
              ))}

              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900">🚀 Auto-post requer PRO MAX</p>
                  <p className="text-xs text-gray-500 mt-0.5">Publicação automática via Meta Graph API — R$ 499/mês</p>
                </div>
                <Link
                  href="/assinatura"
                  className="text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-2 rounded-lg hover:opacity-90 font-medium whitespace-nowrap"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ───────────────────────────────────────── */}
      {tab === 'historico' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Posts publicados e histórico</p>
            {isProMax && (
              <button
                type="button"
                onClick={loadPosts}
                disabled={loadingPosts}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            )}
          </div>

          {!isProMax ? (
            <div className="text-center py-12 space-y-3">
              <Send className="w-8 h-8 mx-auto text-gray-200" />
              <p className="text-sm text-gray-500">Histórico de publicações disponível no plano PRO MAX</p>
              <Link href="/assinatura" className="inline-block text-xs text-purple-600 hover:underline">
                Fazer upgrade →
              </Link>
            </div>
          ) : loadingPosts ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Carregando histórico...
            </div>
          ) : historyPosts.length > 0 ? (
            historyPosts.map(p => <PostCard key={p.id} post={p} />)
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Send className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              Nenhum post publicado ainda.
              <br />
              <Link href="/conteudo" className="text-blue-500 hover:underline text-xs mt-1 inline-block">
                Criar e publicar agora →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
