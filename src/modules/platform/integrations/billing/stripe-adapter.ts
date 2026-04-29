import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import type {
  BillingCheckoutSession,
  BillingCustomer,
  BillingPortalSession,
  BillingProvider,
  CreateBillingPortalSessionInput,
  CreateCheckoutSessionInput,
  CreateCustomerInput,
} from './billing-provider'

/**
 * Adapter concreto usando o SDK da Stripe.
 *
 * Reusa o cliente lazy `getStripe()` de `@/lib/stripe` para não duplicar
 * a lógica de instanciação + apiVersion. Quando `src/lib/stripe.ts` for
 * desmontado em sprint futura, o cliente pode passar a viver aqui.
 */
export class StripeBillingProvider implements BillingProvider {
  async createCustomer(input: CreateCustomerInput): Promise<BillingCustomer> {
    const stripe = getStripe()
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: input.metadata,
    })
    return { id: customer.id }
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<BillingCheckoutSession> {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      customer: input.customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      subscription_data: input.subscriptionMetadata
        ? { metadata: input.subscriptionMetadata }
        : undefined,
      locale: input.locale as Stripe.Checkout.SessionCreateParams.Locale | undefined,
      allow_promotion_codes: input.allowPromotionCodes,
      custom_text: input.submitMessage
        ? { submit: { message: input.submitMessage } }
        : undefined,
    })
    return { id: session.id, url: session.url }
  }

  async createBillingPortalSession(
    input: CreateBillingPortalSessionInput,
  ): Promise<BillingPortalSession> {
    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    })
    return { id: session.id, url: session.url }
  }
}
