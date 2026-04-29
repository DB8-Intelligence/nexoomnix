/**
 * Use case: side effects ao receber um `checkout.session.completed`
 * já validado do webhook do Stripe.
 *
 * Recebe dados já normalizados — a route handler é responsável por:
 *   - validar assinatura (stripe.webhooks.constructEvent)
 *   - resolver a subscription completa via SDK (stripe.subscriptions.retrieve)
 *   - extrair tenant_id e plan da metadata
 *
 * Aqui só atualizamos o banco e disparamos o email de boas-vindas
 * (reusando o use case de Sprint 1). Nada de SDK Stripe, nada de Next.js.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendSubscriptionWelcome } from './send-billing-notification'

export interface CheckoutSessionCompletedInput {
  tenantId: string
  plan: string
  /**
   * Dados da subscription recém-criada. A route resolve via SDK e
   * entrega já achatado — o use case não sabe que existe um objeto
   * Stripe.Subscription.
   */
  subscription: {
    id: string
    priceId: string | null
    /** Unix timestamp (segundos) ou null. */
    cancelAt: number | null
    cancelAtPeriodEnd: boolean
  } | null
}

export async function handleCheckoutSessionCompleted(
  input: CheckoutSessionCompletedInput,
): Promise<void> {
  const supabase = await createServiceClient()

  await supabase
    .from('tenants')
    .update({
      plan: input.plan,
      plan_expires_at: input.subscription?.cancelAt
        ? new Date(input.subscription.cancelAt * 1000).toISOString()
        : null,
      stripe_subscription_id: input.subscription?.id ?? null,
      stripe_price_id: input.subscription?.priceId ?? null,
      cancel_at_period_end: input.subscription?.cancelAtPeriodEnd ?? false,
    })
    .eq('id', input.tenantId)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, email')
    .eq('id', input.tenantId)
    .single()

  if (tenant?.email) {
    await sendSubscriptionWelcome({
      to: tenant.email,
      tenantName: tenant.name,
      plan: input.plan,
    })
  }
}
