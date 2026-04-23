import { NullBillingProvider, type BillingProvider } from './billing-provider'
import { StripeBillingProvider } from './stripe-adapter'

/**
 * Factory lazy + singleton.
 *
 * Se `STRIPE_SECRET_KEY` está ausente no ambiente, retorna
 * `NullBillingProvider` — todas as operações falham com
 * `BillingNotConfiguredError` (tipado) em vez de o SDK do Stripe
 * explodir numa call distante. Ambientes de dev/CI sem chave de teste
 * conseguem inicializar o processo normalmente; falhas só acontecem
 * no ponto em que billing é realmente necessário.
 *
 * Quando houver mais de um provedor (Kiwify, Pagar.me), o select pode
 * vir de env var (`BILLING_PROVIDER=stripe|kiwify`).
 */
let instance: BillingProvider | null = null

export function getBillingProvider(): BillingProvider {
  if (instance) return instance
  const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY)
  instance = hasStripeKey ? new StripeBillingProvider() : new NullBillingProvider()
  return instance
}

export {
  BillingNotConfiguredError,
  NullBillingProvider,
} from './billing-provider'

export type {
  BillingCheckoutSession,
  BillingCustomer,
  BillingPortalSession,
  BillingProvider,
  CreateBillingPortalSessionInput,
  CreateCheckoutSessionInput,
  CreateCustomerInput,
} from './billing-provider'
