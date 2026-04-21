// Notifica um webhook externo (Slack/Discord/genérico) quando um bug é criado.
// Controlado por BUG_WEBHOOK_URL. Se não configurado, é no-op.
// Compatível com Slack incoming webhooks (campo "text") e endpoints genéricos.

export interface BugNotification {
  id:          string
  description: string
  severity:    string
  url:         string
  reporter:    string | null
}

export async function notifyBugWebhook(bug: BugNotification): Promise<void> {
  const webhook = process.env.BUG_WEBHOOK_URL
  if (!webhook) return

  const severityEmoji: Record<string, string> = {
    critical: '🚨', high: '🔥', medium: '⚠️', low: '📌',
  }
  const emoji = severityEmoji[bug.severity] ?? '🐛'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
  const adminUrl = `${baseUrl}/admin/bugs`

  const text = [
    `${emoji} *Novo bug ${bug.severity}* — ${bug.id.slice(0, 8)}`,
    `*Reporter:* ${bug.reporter ?? 'anonymous'}`,
    `*URL:* ${bug.url}`,
    `*Descrição:* ${bug.description.slice(0, 500)}`,
    baseUrl ? `<${adminUrl}|Abrir no painel>` : '',
  ].filter(Boolean).join('\n')

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, bug }),
    })
  } catch (err) {
    // Apenas logar — webhook falho não pode impedir o report de ser gravado.
    console.warn('[notifyBugWebhook] failed:', err instanceof Error ? err.message : err)
  }
}
