/**
 * Use case: enviar notificações transacionais relacionadas a billing.
 *
 * Depende apenas do contract `EmailProvider` (não do SDK da Resend).
 * Não importa de `next/*` — roda em Node puro, testável isolado.
 *
 * Dois casos atendem as duas chamadas de email do webhook do Stripe:
 *   1. Boas-vindas após `checkout.session.completed`
 *   2. Aviso de falha após `invoice.payment_failed`
 *
 * Os templates HTML são equivalentes aos de `src/lib/resend.ts`
 * (que ainda existe durante a migração). Quando a migração para
 * `modules/` estiver concluída, os templates aqui passam a ser a
 * única fonte de verdade.
 */

import { getEmailProvider, type EmailSendResult } from '@/modules/platform/integrations/email'

export interface SendSubscriptionWelcomeInput {
  to: string
  tenantName: string
  plan: string
}

export interface SendPaymentFailedNoticeInput {
  to: string
  tenantName: string
  retryUrl: string
}

export async function sendSubscriptionWelcome(
  input: SendSubscriptionWelcomeInput,
): Promise<EmailSendResult> {
  const provider = getEmailProvider()
  const { subject, html } = buildWelcomeEmail(input.tenantName, input.plan)
  return provider.send({ to: input.to, subject, html })
}

export async function sendPaymentFailedNotice(
  input: SendPaymentFailedNoticeInput,
): Promise<EmailSendResult> {
  const provider = getEmailProvider()
  const { subject, html } = buildPaymentFailedEmail(input.tenantName, input.retryUrl)
  return provider.send({ to: input.to, subject, html })
}

// ── Templates ─────────────────────────────────────────────────────
// Mantidos idênticos aos de src/lib/resend.ts para preservar
// comportamento durante a migração.

function buildWelcomeEmail(tenantName: string, plan: string): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return {
    subject: `Bem-vindo ao NexoOmnix, ${tenantName}! 🚀`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h1 style="font-size:24px;color:#1d4ed8">Bem-vindo ao NexoOmnix!</h1>
        <p style="color:#374151">Olá, <strong>${tenantName}</strong>!</p>
        <p style="color:#374151">
          Sua assinatura <strong>${plan}</strong> foi ativada com sucesso.
          Acesse o painel e comece a transformar seu negócio com IA.
        </p>
        <a
          href="${appUrl}/dashboard"
          style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px"
        >
          Acessar meu painel →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          NexoOmnix • Gestão inteligente para seu negócio
        </p>
      </div>
    `,
  }
}

function buildPaymentFailedEmail(
  tenantName: string,
  retryUrl: string,
): { subject: string; html: string } {
  return {
    subject: `Pagamento não processado — NexoOmnix`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h1 style="font-size:22px;color:#dc2626">Problema com seu pagamento</h1>
        <p style="color:#374151">Olá, <strong>${tenantName}</strong>!</p>
        <p style="color:#374151">
          Não conseguimos processar o pagamento da sua assinatura NexoOmnix.
          Para evitar a interrupção do serviço, atualize seu método de pagamento.
        </p>
        <a
          href="${retryUrl}"
          style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px"
        >
          Atualizar pagamento →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          NexoOmnix • Se precisar de ajuda, responda este e-mail.
        </p>
      </div>
    `,
  }
}
