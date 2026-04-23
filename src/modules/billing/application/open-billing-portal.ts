/**
 * Use case: abre uma sessão do Billing Portal para o tenant gerenciar
 * a própria assinatura (cancel, update método de pagamento, invoices).
 *
 * Requer que o tenant já tenha um `stripe_customer_id` vinculado —
 * criado automaticamente no primeiro checkout. Tenants sem customer
 * ainda (nunca passaram pelo checkout) recebem `NoBillingCustomerError`.
 *
 * Dependências:
 *   - `BillingProvider` (contract) — nunca o SDK do Stripe diretamente
 *   - Supabase server client — única integração de persistência
 *
 * Não depende de Next.js: testável isolado em Node.
 */

import { createClient } from '@/lib/supabase/server'
import { getBillingProvider } from '@/modules/platform/integrations/billing'

export interface OpenBillingPortalInput {
  tenantId: string
  /** Base URL da app — usada no return_url do portal. */
  appUrl: string
}

export interface OpenBillingPortalResult {
  url: string
}

export class NoBillingCustomerError extends Error {
  constructor() {
    super('no-billing-customer')
    this.name = 'NoBillingCustomerError'
  }
}

export async function openBillingPortal(
  input: OpenBillingPortalInput,
): Promise<OpenBillingPortalResult> {
  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', input.tenantId)
    .single()

  if (!tenant?.stripe_customer_id) {
    throw new NoBillingCustomerError()
  }

  const billing = getBillingProvider()
  const session = await billing.createBillingPortalSession({
    customerId: tenant.stripe_customer_id,
    returnUrl: `${input.appUrl}/assinatura`,
  })

  return { url: session.url }
}
