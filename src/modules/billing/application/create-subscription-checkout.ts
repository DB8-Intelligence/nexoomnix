/**
 * Use case: inicia um checkout de assinatura.
 *
 * Encapsula a orquestração que antes vivia inline em
 * src/app/api/stripe/create-checkout/route.ts:
 *
 *   1. Resolve priceId a partir do slug do plano
 *   2. Carrega dados do tenant no Supabase
 *   3. Cria Stripe customer se o tenant ainda não tem um vinculado
 *   4. Persiste stripe_customer_id de volta no tenant (first-time)
 *   5. Cria a sessão de checkout com metadata propagada para a subscription
 *
 * Dependências:
 *   - `BillingProvider` (contract) — nunca o SDK do Stripe diretamente
 *   - Supabase server client — única integração de persistência
 *   - PLAN_PRICE_IDS — mapeamento plan slug → Stripe Price ID (ainda em
 *     `@/lib/stripe` até a Sprint que mover price mapping para billing/)
 *
 * Não depende de Next.js: testável isolado em Node.
 */

import { createClient } from '@/lib/supabase/server'
import { PLAN_PRICE_IDS } from '@/lib/stripe'
import { getBillingProvider } from '@/modules/platform/integrations/billing'

export interface CreateSubscriptionCheckoutInput {
  tenantId: string
  plan: string
  /** Fallback pro Stripe customer email quando o tenant não tem email próprio. */
  userEmail?: string
  /** Base URL da app — usada em success_url e cancel_url do checkout. */
  appUrl: string
}

export interface CreateSubscriptionCheckoutResult {
  url: string | null
}

export class InvalidPlanError extends Error {
  constructor(public readonly plan: string) {
    super(`invalid-plan:${plan}`)
    this.name = 'InvalidPlanError'
  }
}

export class TenantNotFoundError extends Error {
  constructor() {
    super('tenant-not-found')
    this.name = 'TenantNotFoundError'
  }
}

export async function createSubscriptionCheckout(
  input: CreateSubscriptionCheckoutInput,
): Promise<CreateSubscriptionCheckoutResult> {
  const priceId = PLAN_PRICE_IDS[input.plan]
  if (!priceId) throw new InvalidPlanError(input.plan)

  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, email, stripe_customer_id')
    .eq('id', input.tenantId)
    .single()

  if (!tenant) throw new TenantNotFoundError()

  const billing = getBillingProvider()

  let customerId = tenant.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await billing.createCustomer({
      email: tenant.email ?? input.userEmail,
      name: tenant.name,
      metadata: { tenant_id: tenant.id },
    })
    customerId = customer.id
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id)
  }

  const session = await billing.createCheckoutSession({
    customerId,
    priceId,
    successUrl: `${input.appUrl}/assinatura?success=true&plan=${input.plan}`,
    cancelUrl: `${input.appUrl}/assinatura?canceled=true`,
    metadata: { tenant_id: tenant.id, plan: input.plan },
    subscriptionMetadata: { tenant_id: tenant.id, plan: input.plan },
    locale: 'pt-BR',
    allowPromotionCodes: true,
    submitMessage: 'Ao assinar, você concorda com os termos de uso do NexoOmnix.',
  })

  return { url: session.url }
}
