'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Trash2, Eye, EyeOff, ImageIcon, Link as LinkIcon, Upload } from 'lucide-react'

type Format = 'feed' | 'story' | 'reel_cover'
type Source = 'upload' | 'canva' | 'external'

interface Template {
  id: string
  tenant_id: string | null
  name: string
  description: string | null
  image_url: string
  format: Format
  source: Source
  canva_url: string | null
  niche: string | null
  is_active: boolean
  usage_count: number
}

const FORMAT_LABELS: Record<Format, string> = {
  feed:        'Feed (1:1)',
  story:       'Story (9:16)',
  reel_cover:  'Capa de Reel',
}

export function ContentTemplateGallery() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterFormat, setFilterFormat] = useState<Format | 'all'>('all')
  const [form, setForm] = useState({
    name: '',
    description: '',
    image_url: '',
    canva_url: '',
    format: 'feed' as Format,
    source: 'external' as Source,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('active', 'false')
      if (filterFormat !== 'all') params.set('format', filterFormat)
      const res = await fetch(`/api/content-templates?${params}`)
      const data = await res.json() as { templates: Template[] }
      setTemplates(data.templates ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterFormat])

  async function create() {
    if (!form.name.trim() || !form.image_url.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/content-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name,
          description: form.description,
          image_url:   form.image_url,
          canva_url:   form.canva_url || undefined,
          format:      form.format,
          source:      form.canva_url ? 'canva' : 'external',
        }),
      })
      if (res.ok) {
        setForm({ name: '', description: '', image_url: '', canva_url: '', format: 'feed', source: 'external' })
        setShowForm(false)
        await load()
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggle(t: Template) {
    await fetch(`/api/content-templates/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    await load()
  }

  async function remove(t: Template) {
    if (!confirm(`Excluir o template "${t.name}"?`)) return
    await fetch(`/api/content-templates/${t.id}`, { method: 'DELETE' })
    await load()
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', form.name.trim() || file.name)
      fd.append('format', form.format)
      if (form.canva_url.trim())   fd.append('canva_url', form.canva_url.trim())
      if (form.description.trim()) fd.append('description', form.description.trim())
      const res = await fetch('/api/content-templates/upload', { method: 'POST', body: fd })
      if (res.ok) {
        setForm({ name: '', description: '', image_url: '', canva_url: '', format: 'feed', source: 'external' })
        setShowForm(false)
        await load()
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error ?? 'Falha no upload')
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const mine = templates.filter(t => t.tenant_id !== null)
  const defaults = templates.filter(t => t.tenant_id === null)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-violet-600" />
            Biblioteca de templates
          </h2>
          <p className="text-sm text-gray-500">
            Backgrounds reutilizáveis pros seus posts. Salve uma vez, a IA usa no autopilot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            title="Filtrar por formato"
            value={filterFormat}
            onChange={e => setFilterFormat(e.target.value as Format | 'all')}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Todos os formatos</option>
            <option value="feed">Feed</option>
            <option value="story">Story</option>
            <option value="reel_cover">Capa de Reel</option>
          </select>
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
            >
              <Plus className="w-4 h-4" /> Adicionar template
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <input
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do template (ex: Background azul corporate)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <input
            value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })}
            placeholder="URL pública da imagem (Canva export, CDN, etc.)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <input
            value={form.canva_url}
            onChange={e => setForm({ ...form, canva_url: e.target.value })}
            placeholder="Link do design no Canva (opcional — pra editar depois)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição curta (opcional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <select
            title="Formato do template"
            value={form.format}
            onChange={e => setForm({ ...form, format: e.target.value as Format })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="feed">Feed (1:1)</option>
            <option value="story">Story (9:16)</option>
            <option value="reel_cover">Capa de Reel</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            aria-label="Upload de template"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) uploadFile(f)
            }}
            className="hidden"
          />

          <div className="flex gap-2 justify-end flex-wrap">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-gray-600 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-violet-200 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Fazer upload
            </button>
            <button
              type="button"
              onClick={create}
              disabled={saving || !form.name.trim() || !form.image_url.trim()}
              className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar URL'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Meus templates</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {mine.map(t => <TemplateCard key={t.id} t={t} onToggle={toggle} onRemove={remove} />)}
              </div>
            </section>
          )}

          {defaults.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Templates DB8 por nicho</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {defaults.map(t => <TemplateCard key={t.id} t={t} readonly />)}
              </div>
            </section>
          )}

          {mine.length === 0 && defaults.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhum template ainda. Crie o primeiro ou aguarde os defaults da DB8.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TemplateCard({
  t,
  onToggle,
  onRemove,
  readonly,
}: {
  t: Template
  onToggle?: (t: Template) => void
  onRemove?: (t: Template) => void
  readonly?: boolean
}) {
  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${t.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="aspect-square bg-gray-50 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.image_url}
          alt={t.name}
          className="w-full h-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-xs text-gray-700">
          {FORMAT_LABELS[t.format]}
        </div>
        {t.canva_url && (
          <a
            href={t.canva_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-xs text-violet-700 inline-flex items-center gap-1"
          >
            <LinkIcon className="w-3 h-3" /> Canva
          </a>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium text-sm text-gray-900 truncate">{t.name}</div>
        {t.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{t.description}</div>
        )}
        {!readonly && (
          <div className="flex items-center gap-1 mt-2 -mx-1">
            <button
              type="button"
              onClick={() => onToggle?.(t)}
              className="flex-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded inline-flex items-center justify-center gap-1"
              title={t.is_active ? 'Desativar' : 'Ativar'}
            >
              {t.is_active ? <><Eye className="w-3 h-3" /> Ativo</> : <><EyeOff className="w-3 h-3" /> Pausado</>}
            </button>
            <button
              type="button"
              onClick={() => onRemove?.(t)}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
