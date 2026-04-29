/**
 * Use case: side effects ao receber `customer.subscription.deleted`.
 *
 * Rebaixa o tenant de volta ao plano `trial` e limpa referências Stripe.
 * Não apaga o tenant — a assinatura some, o tenant permanece.
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface SubscriptionDeletedInput {
  tenantId: string
}

export async function handleSubscriptionDeleted(
  input: SubscriptionDeletedInput,
): Promise<void> {
  const supabase = await createServiceClient()
  await supabase
    .from('tenants')
    .update({
      plan: 'trial',
      plan_expires_at: null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      cancel_at_period_end: false,
    })
    .eq('id', input.tenantId)
}
