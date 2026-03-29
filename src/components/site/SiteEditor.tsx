'use client'

import { useState, useEffect } from 'react'
import { Globe, Save, Eye, Loader2, CheckCircle2, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TenantSettings, Tenant } from '@/types/database'

interface SiteEditorState {
  site_enabled: boolean
  site_title: string
  site_description: string
  site_cta_text: string
  whatsapp_number: string
  whatsapp_enabled: boolean
}

export function SiteEditor() {
  const supabase = createClient()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [form, setForm] = useState<SiteEditorState>({
    site_enabled: false,
    site_title: '',
    site_description: '',
    site_cta_text: 'Agendar agora',
    whatsapp_number: '',
    whatsapp_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const [tenantRes, settingsRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', profile.tenant_id).single(),
        supabase.from('tenant_settings').select('*').eq('tenant_id', profile.tenant_id).single(),
      ])

      const t = tenantRes.data as Tenant | null
      const s = settingsRes.data as TenantSettings | null

      setTenant(t)
      setSettings(s)

      if (s) {
        setForm({
          site_enabled: s.site_enabled,
          site_title: s.site_title ?? t?.name ?? '',
          site_description: s.site_description ?? '',
          site_cta_text: s.site_cta_text ?? 'Agendar agora',
          whatsapp_number: s.whatsapp_number ?? '',
          whatsapp_enabled: s.whatsapp_enabled,
        })
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await supabase
      .from('tenant_settings')
      .update({
        site_enabled: form.site_enabled,
        site_title: form.site_title,
        site_description: form.site_description,
        site_cta_text: form.site_cta_text,
        whatsapp_number: form.whatsapp_number,
        whatsapp_enabled: form.whatsapp_enabled,
      } as unknown as Record<string, unknown>)
      .eq('id', settings.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleCopyLink() {
    if (!tenant) return
    const slug = tenant.slug ?? tenant.id
    navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const siteUrl = tenant ? `/s/${tenant.slug ?? tenant.id}` : '#'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-900">Site público ativado</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {form.site_enabled ? `Acessível em: nexoomnix.com${siteUrl}` : 'Site desativado — não aparece para visitantes'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(f => ({ ...f, site_enabled: !f.site_enabled }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${form.site_enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.site_enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Link do site */}
      {form.site_enabled && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-700 flex-1 truncate">nexoomnix.com{siteUrl}</span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver
          </a>
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título do site</label>
          <input
            type="text"
            value={form.site_title}
            onChange={e => setForm(f => ({ ...f, site_title: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Studio Ana Beleza"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / slogan</label>
          <textarea
            value={form.site_description}
            onChange={e => setForm(f => ({ ...f, site_description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Fale sobre seu negócio em 1-2 frases..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Texto do botão principal</label>
          <input
            type="text"
            value={form.site_cta_text}
            onChange={e => setForm(f => ({ ...f, site_cta_text: e.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Agendar agora"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">WhatsApp de contato</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, whatsapp_enabled: !f.whatsapp_enabled }))}
              className={`relative w-9 h-5 rounded-full transition-colors ${form.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.whatsapp_enabled ? 'translate-x-4' : ''}`} />
            </button>
          </div>
          {form.whatsapp_enabled && (
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-9999"
            />
          )}
        </div>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Salvo!' : 'Salvar alterações'}
      </button>
    </div>
  )
}
