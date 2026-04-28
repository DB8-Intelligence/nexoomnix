/**
 * NexoOmnix ↔ db8-agent HTTP Client
 * ==================================
 * Proxy para a API Railway em api.db8intelligence.com.br
 * Todos os endpoints recebem tenant_id para isolamento multi-tenant.
 *
 * AVISO: FFmpeg precisa de servidor persistente — NUNCA migrar para serverless.
 * Usar APENAS em API Routes server-side (nunca em componentes client-side).
 */

const DB8_AGENT_URL = process.env.DB8_AGENT_URL ?? 'https://api.db8intelligence.com.br'

// ─── Core fetch ───────────────────────────────────────────────────────────────

export async function db8Fetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${DB8_AGENT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`db8-agent ${options?.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

/** Verifica se o db8-agent está online */
export async function db8Health(): Promise<boolean> {
  try {
    await fetch(`${DB8_AGENT_URL}/health`, { signal: AbortSignal.timeout(5000) })
    return true
  } catch {
    return false
  }
}

/** FormData upload (para generate-video com imagens) */
export async function db8Upload<T = unknown>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${DB8_AGENT_URL}${path}`, {
    method: 'POST',
    body: formData,
    // Não setar Content-Type — o Node define o boundary do multipart automaticamente
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`db8-agent upload ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Db8ContentRequest {
  tenant_id: string
  project_id: string
  niche: string
  formato: 'reel' | 'post' | 'carrossel' | 'stories'
  tema: string
  source_url?: string
}

// ─── ContentAI — dispara geração via webhook n8n ──────────────────────────────

export async function triggerContentGeneration(req: Db8ContentRequest): Promise<{ job_id: string; status: string }> {
  const webhookUrl = process.env.N8N_CONTENT_WEBHOOK_URL
  const token      = process.env.N8N_WEBHOOK_TOKEN
  if (!webhookUrl) throw new Error('N8N_CONTENT_WEBHOOK_URL não configurada. Execute npm run setup.')

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`n8n webhook ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ job_id: string; status: string }>
}

// ─── WhatsApp via db8-agent ───────────────────────────────────────────────────

export interface Db8WhatsAppMessage {
  tenant_id: string
  to: string         // número com DDI, ex: "5511999999999"
  message: string
  media_url?: string
}

export async function sendWhatsApp(msg: Db8WhatsAppMessage): Promise<{ status: string }> {
  return db8Fetch('/webhook/whatsapp', {
    method: 'POST',
    body: JSON.stringify(msg),
  })
}
