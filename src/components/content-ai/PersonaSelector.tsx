'use client'

import { useState, useMemo } from 'react'
import { Check, Heart, Eye, Users, ArrowRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CONTENT_PERSONAS,
  PERSONA_OPTIONS,
  type ContentPersona,
  type PersonaId,
} from '@/lib/content-ai/content-personas'

// ─── Constants ─────────────────────────────────────────────────────────────

/** Personas based on fresh reference profile analysis (Março 2026) */
const NEW_PERSONA_IDS: PersonaId[] = ['financeiro', 'nutricao', 'casa']

const TONE_LABELS: Record<ContentPersona['contentTone'], string> = {
  educativo:    'Educativo',
  antagonista:  'Antagonista',
  humoristico:  'Humorístico',
  autoritativo: 'Autoritativo',
  inspirador:   'Inspirador',
}

const TONE_COLORS: Record<ContentPersona['contentTone'], string> = {
  educativo:    'bg-blue-50 text-blue-600 border-blue-200',
  antagonista:  'bg-red-50 text-red-600 border-red-200',
  humoristico:  'bg-yellow-50 text-yellow-600 border-yellow-200',
  autoritativo: 'bg-purple-50 text-purple-600 border-purple-200',
  inspirador:   'bg-green-50 text-green-600 border-green-200',
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ─── Filter configuration ──────────────────────────────────────────────────

type PrimaryTab = 'top' | 'novos' | 'todos' | 'favoritos'
type ActiveTab  = PrimaryTab | PersonaId

const PRIMARY_TABS: { id: PrimaryTab; label: string }[] = [
  { id: 'top',       label: 'TOP Personas' },
  { id: 'novos',     label: 'Novos' },
  { id: 'todos',     label: 'Todos' },
  { id: 'favoritos', label: 'Favoritos' },
]

const CATEGORY_TABS: { id: PersonaId; label: string; emoji: string }[] = [
  { id: 'financeiro', label: 'Financeiro', emoji: '💸' },
  { id: 'nutricao',   label: 'Nutrição',   emoji: '🥑' },
  { id: 'casa',       label: 'Casa',       emoji: '🏠' },
  { id: 'saude',      label: 'Saúde',      emoji: '🏥' },
  { id: 'beleza',     label: 'Beleza',     emoji: '✂️' },
  { id: 'tecnico',    label: 'Técnico',    emoji: '🔧' },
  { id: 'juridico',   label: 'Jurídico',   emoji: '⚖️' },
  { id: 'educacao',   label: 'Educação',   emoji: '📚' },
  { id: 'pet',        label: 'Pet',        emoji: '🐾' },
  { id: 'humor',      label: 'Humor',      emoji: '😂' },
]

// ─── Main component ────────────────────────────────────────────────────────

interface PersonaSelectorProps {
  selected: PersonaId | null
  onSelect: (id: PersonaId) => void
  onConfirm?: () => void
  confirmLabel?: string
  /** Hides the footer confirm button (use when embedding inline) */
  hideFooter?: boolean
}

export function PersonaSelector({
  selected,
  onSelect,
  onConfirm,
  confirmLabel = 'Avançar',
  hideFooter = false,
}: PersonaSelectorProps) {
  const [activeTab, setActiveTab]                 = useState<ActiveTab>('top')
  const [favorites, setFavorites]                 = useState<Set<PersonaId>>(new Set())
  const [showMoreCategories, setShowMoreCategories] = useState(false)

  const allPersonas = useMemo(() => Object.values(CONTENT_PERSONAS), [])

  const filteredPersonas = useMemo<ContentPersona[]>(() => {
    switch (activeTab) {
      case 'top':
        // Top 6 by viral views, personalizado excluded (same order as PERSONA_OPTIONS)
        return PERSONA_OPTIONS.slice(0, 6)
      case 'novos':
        return allPersonas.filter(p => NEW_PERSONA_IDS.includes(p.id as PersonaId))
      case 'favoritos':
        return allPersonas.filter(p => favorites.has(p.id))
      case 'todos':
        return allPersonas
      default:
        return allPersonas.filter(p => p.id === activeTab)
    }
  }, [activeTab, favorites, allPersonas])

  const visibleCategories = showMoreCategories
    ? CATEGORY_TABS
    : CATEGORY_TABS.slice(0, 5)

  function toggleFavorite(id: PersonaId) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">

      {/* Primary filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {PRIMARY_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab.label}
            {tab.id === 'favoritos' && favorites.size > 0 && (
              <span className="ml-1.5 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                {favorites.size}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Category filter row */}
      <div className="flex gap-2 flex-wrap items-center">
        {visibleCategories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              activeTab === cat.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowMoreCategories(v => !v)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          {showMoreCategories ? 'Menos' : 'Mais categorias'}
          <ChevronDown className={cn('w-3 h-3 transition-transform', showMoreCategories && 'rotate-180')} />
        </button>
      </div>

      {/* Results */}
      {filteredPersonas.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          {activeTab === 'favoritos'
            ? 'Nenhum favorito ainda. Clique no ♡ para favoritar uma persona.'
            : 'Nenhuma persona encontrada.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPersonas.map(persona => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              isSelected={selected === persona.id}
              isFavorite={favorites.has(persona.id)}
              isNew={NEW_PERSONA_IDS.includes(persona.id as PersonaId)}
              onSelect={() => onSelect(persona.id)}
              onToggleFavorite={() => toggleFavorite(persona.id)}
            />
          ))}
        </div>
      )}

      {/* Footer confirm */}
      {!hideFooter && (
        <div className="pt-4 flex items-center justify-between border-t border-gray-100">
          <p className="text-sm text-gray-500">
            {selected ? (
              <>
                Selecionado:{' '}
                <span className="font-semibold text-gray-800">
                  {CONTENT_PERSONAS[selected].emoji} {CONTENT_PERSONAS[selected].name}
                </span>
              </>
            ) : (
              'Selecione uma persona para continuar'
            )}
          </p>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={!selected}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                selected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {confirmLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Card subcomponent ─────────────────────────────────────────────────────

interface PersonaCardProps {
  persona: ContentPersona
  isSelected: boolean
  isFavorite: boolean
  isNew: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}

function PersonaCard({
  persona,
  isSelected,
  isFavorite,
  isNew,
  onSelect,
  onToggleFavorite,
}: PersonaCardProps) {
  const hasTopViews = (persona.referenceMaxViews ?? 0) >= 1_000_000

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative flex gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      )}
    >
      {/* Emoji */}
      <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{persona.emoji}</span>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-7">
        {/* Badges row */}
        <div className="flex gap-1 mb-1 flex-wrap">
          {hasTopViews && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 leading-none">
              🔥 Popular
            </span>
          )}
          {isNew && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-200 leading-none">
              Novo
            </span>
          )}
        </div>

        <h3 className={cn(
          'text-sm font-semibold leading-tight',
          isSelected ? 'text-blue-800' : 'text-gray-900'
        )}>
          {persona.name}
        </h3>

        <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {persona.tagline}
        </p>

        {/* Tone badge */}
        <div className="mt-2">
          <span className={cn(
            'inline-block text-xs px-2 py-0.5 rounded-full font-medium border',
            TONE_COLORS[persona.contentTone]
          )}>
            {TONE_LABELS[persona.contentTone]}
          </span>
        </div>

        {/* Reference stats */}
        {persona.referenceProfile && (
          <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
            {(persona.referenceFollowers ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {formatViews(persona.referenceFollowers!)} seguidores
              </span>
            )}
            {(persona.referenceMaxViews ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                até {formatViews(persona.referenceMaxViews!)} views
              </span>
            )}
          </div>
        )}
      </div>

      {/* Favorite button — top right */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleFavorite() }}
        className={cn(
          'absolute top-3 right-3 p-1 rounded-lg transition-colors',
          isFavorite
            ? 'text-red-400 hover:text-red-500'
            : 'text-gray-300 hover:text-gray-400'
        )}
      >
        <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
      </button>

      {/* Selected checkmark — bottom right */}
      {isSelected && (
        <div className="absolute bottom-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  )
}
