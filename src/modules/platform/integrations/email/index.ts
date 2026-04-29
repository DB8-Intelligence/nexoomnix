import { NullEmailProvider, type EmailProvider } from './email-provider'
import { ResendEmailProvider } from './resend-adapter'

/**
 * Factory lazy + singleton. A instância é decidida no primeiro acesso
 * com base em `RESEND_API_KEY`. Durante builds e ambientes de dev sem
 * a chave, o `NullEmailProvider` é retornado — calls `.send()` falham
 * silenciosamente (sem throw), mantendo o comportamento anterior.
 */
let instance: EmailProvider | null = null

const DEFAULT_FROM = 'NexoOmnix <noreply@nexoomnix.com>'

export function getEmailProvider(): EmailProvider {
  if (instance) return instance

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? DEFAULT_FROM

  instance = apiKey ? new ResendEmailProvider(apiKey, from) : new NullEmailProvider()
  return instance
}

export type { EmailMessage, EmailProvider, EmailSendResult } from './email-provider'
