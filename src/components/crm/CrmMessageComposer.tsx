'use client'

import { useState } from 'react'
import { Send, MessageCircle, Instagram, Facebook, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CrmChannelType, CrmMessageTemplate } from '@/types/database'

const MESSAGE_CHANNELS: { value: CrmChannelType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-green-500' },
  { value: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'bg-pink-500' },
  { value: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: 'bg-blue-500' },
]

interface CrmMessageComposerProps {
  contactName: string | null
  contactWhatsapp: string | null
  templates: CrmMessageTemplate[]
  onSend: (channel: CrmChannelType, content: string) => Promise<boolean>
}

export function CrmMessageComposer({
  contactName, contactWhatsapp, templates, onSend,
}: CrmMessageComposerProps) {
  const [channel, setChannel] = useState<CrmChannelType>('whatsapp')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const handleSend = async () => {
    if (!content.trim()) return
    setSending(true)
    const success = await onSend(channel, content)
    if (success) setContent('')
    setSending(false)
  }

  const handleSelectTemplate = (template: CrmMessageTemplate) => {
    let text = template.content
    // Replace variables
    if (contactName) text = text.replace(/\{\{nome\}\}/g, contactName)
    setContent(text)
    setShowTemplates(false)
  }

  const handleWhatsAppDirect = () => {
    if (!contactWhatsapp) return
    const phone = contactWhatsapp.replace(/\D/g, '')
    const encodedMsg = encodeURIComponent(content)
    window.open(`https://wa.me/55${phone}?text=${encodedMsg}`, '_blank')
  }

  const filteredTemplates = templates.filter(t => t.channel === channel)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Channel selector */}
      <div className="flex border-b border-gray-200">
        {MESSAGE_CHANNELS.map(ch => (
          <button
            key={ch.value}
            type="button"
            onClick={() => setChannel(ch.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors flex-1 justify-center',
              channel === ch.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {ch.icon}
            {ch.label}
          </button>
        ))}
      </div>

      {/* Templates */}
      {showTemplates && filteredTemplates.length > 0 && (
        <div className="border-b border-gray-200 p-2 max-h-40 overflow-y-auto">
          {filteredTemplates.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTemplate(t)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-800">{t.name}</span>
              <p className="text-gray-500 line-clamp-1 mt-0.5">{t.content}</p>
            </button>
          ))}
        </div>
      )}

      {/* Message input */}
      <div className="p-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder={`Escreva uma mensagem via ${channel}...`}
          className="w-full px-3 py-2 text-sm border-0 resize-none focus:ring-0 focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 bg-gray-50">
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          Templates ({filteredTemplates.length})
        </button>

        <div className="flex items-center gap-2">
          {channel === 'whatsapp' && contactWhatsapp && (
            <button
              type="button"
              onClick={handleWhatsAppDirect}
              disabled={!content.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
            >
              <MessageCircle className="w-3 h-3" />
              Abrir WhatsApp
            </button>
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            {sending ? 'Enviando...' : 'Registrar envio'}
          </button>
        </div>
      </div>
    </div>
  )
}
