/**
 * Stripe webhook endpoint.
 *
 * Responsabilidades desta rota:
 *   1. Ler o raw body + header `stripe-signature`
 *   2. Validar assinatura via `stripe.webhooks.constructEvent`
 *   3. Registrar o evento na tabela de idempotência (INSERT ou detectar
 *      duplicação). Só eventos `new` ou `retry-failed` seguem para
 *      processamento; `already-processed` e `in-flight` retornam 200
 *      sem side effects.
 *   4. Resolver objetos secundários via SDK quando necessário (ex: subscription
 *      completa do `checkout.session.completed`)
 *   5. Despachar dados já normalizados para o use case correspondente
 *   6. Marcar o evento como `processed` após sucesso, `failed` se algum
 *      use case lançar erro (e propagar o erro pra Stripe retentar)
 *   7. Retornar 200 { received: true } (ou 200 { received: true, duplicate: true }
 *      quando pulamos por idempotência)
 *
 * Side effects de negócio vivem em `src/modules/billing/application/handle-*.ts`.
 * O SDK do Stripe + verificação de assinatura são INTENCIONALMENTE infra
 * desta rota — protocolos de webhook são provider-específicos. Ver ADR-0002.
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import type Stripe from 'stripe'
import { handleCheckoutSessionCompleted } from '@/modules/billing/application/handle-checkout-session-completed'
import { handleSubscriptionUpdated } from '@/modules/billing/application/handle-subscription-updated'
import { handleSubscriptionDeleted } from '@/modules/billing/application/handle-subscription-deleted'
import { handleInvoicePaymentFailed } from '@/modules/billing/application/handle-invoice-payment-failed'
import {
  markFailed,
  markProcessed,
  registerEvent,
} from '@/modules/billing/infra/stripe-webhook-event-repository'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  // ── Idempotência ────────────────────────────────────────────────────
  // Registro acontece APÓS a validação de assinatura — nunca persistimos
  // um evento sem HMAC válido.
  const registered = await registerEvent({
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    apiVersion: event.api_version,
    raw: event,
  })

  if (registered.kind === 'already-processed' || registered.kind === 'in-flight') {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // registered.kind === 'new' || 'retry-failed' — processar side effects.
  try {
    await dispatch(event)
    await markProcessed(event.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markFailed(event.id, message)
    // Propaga: Stripe recebe 500, retenta no futuro. Próxima entrega
    // verá status='failed' e fará retry-failed (atualizando para processing).
    throw err
  }

  return NextResponse.json({ received: true })
}

async function dispatch(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const plan = session.metadata?.plan
      if (!tenantId || !plan) return

      const sub = session.subscription
        ? await stripe.subscriptions.retrieve(session.subscription as string)
        : null

      await handleCheckoutSessionCompleted({
        tenantId,
        plan,
        subscription: sub
          ? {
              id: sub.id,
              priceId: sub.items.data[0]?.price.id ?? null,
              cancelAt: sub.cancel_at,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            }
          : null,
      })
      return
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) return

      await handleSubscriptionUpdated({
        tenantId,
        priceId: sub.items.data[0]?.price.id ?? null,
        cancelAt: sub.cancel_at,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      })
      return
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) return

      await handleSubscriptionDeleted({ tenantId })
      return
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) return

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      await handleInvoicePaymentFailed({ customerId, appUrl })
      return
    }

    default:
      return
  }
}
