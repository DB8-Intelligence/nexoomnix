/**
 * Contract de envio transacional de email.
 *
 * Use apenas este arquivo como dependência na camada `application/`.
 * A implementação concreta (Resend, SES, etc.) fica em adapters vizinhos
 * e é selecionada pelo factory em `./index.ts`.
 */

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  /** Remetente. Quando omitido, o adapter usa o default configurado. */
  from?: string
  replyTo?: string
  /** Tags livres para tracking/analytics do provedor. */
  tags?: Record<string, string>
}

export type EmailSendResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>
}

/**
 * Fallback seguro: quando nenhuma API key está configurada, falhar o envio
 * silenciosamente (sem throw) preserva o comportamento anterior do
 * `src/lib/resend.ts` (early return com `RESEND_API_KEY` ausente) e evita
 * que um webhook cair só porque email não está disponível no ambiente.
 */
export class NullEmailProvider implements EmailProvider {
  async send(_message: EmailMessage): Promise<EmailSendResult> {
    return { ok: false, error: 'no-provider-configured' }
  }
}
