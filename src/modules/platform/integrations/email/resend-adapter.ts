import { Resend } from 'resend'
import type { EmailMessage, EmailProvider, EmailSendResult } from './email-provider'

/**
 * Adapter concreto usando o SDK da Resend.
 * Instanciado sob demanda pelo factory em `./index.ts` quando
 * `RESEND_API_KEY` está presente no ambiente.
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend
  private readonly defaultFrom: string

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey)
    this.defaultFrom = defaultFrom
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { data, error } = await this.client.emails.send({
      from: message.from ?? this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      replyTo: message.replyTo,
      tags: message.tags
        ? Object.entries(message.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    })

    if (error) return { ok: false, error: error.message }
    if (!data?.id) return { ok: false, error: 'resend-returned-no-id' }
    return { ok: true, id: data.id }
  }
}
