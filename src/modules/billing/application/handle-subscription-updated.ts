/**
 * Use case: side effects ao receber `customer.subscription.updated`.
 *
 * Atualiza o plan do tenant com base no novo price_id e propaga
 * cancel_at / cancel_at_period_end para refletir estado da sub no banco.
 *
 * Recebe dados já normalizados pela route. `planFromPriceId` continua
 * vindo de `@/lib/stripe` (mapeamento puro, sem SDK call).
 */

import { createServiceClient } from '@/lib/supabase/server'
import { planFromPriceId } from '@/lib/stripe'

export interface SubscriptionUpdatedInput {
  tenantId: string
  priceId: string | null
  /** Unix timestamp (segundos) ou null. */
  cancelAt: number | null
  cancelAtPeriodEnd: boolean
}

export async function handleSubscriptionUpdated(
  input: SubscriptionUpdatedInput,
): Promise<void> {
  const supabase = await createServiceClient()
  const plan = planFromPriceId(input.priceId ?? '')

  await supabase
    .from('tenants')
    .update({
      plan,
      plan_expires_at: input.cancelAt
        ? new Date(input.cancelAt * 1000).toISOString()
        : null,
      stripe_price_id: input.priceId ?? null,
      cancel_at_period_end: input.cancelAtPeriodEnd,
    })
    .eq('id', input.tenantId)
}
