/**
 * Use case: side effects ao receber `invoice.payment_failed`.
 *
 * Localiza o tenant pelo `stripe_customer_id` da invoice e dispara
 * email de pagamento recusado (reusa use case da Sprint 1).
 *
 * A route resolve o customerId a partir do objeto Invoice (que pode
 * trazer customer como string ou objeto) e entrega já normalizado.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendPaymentFailedNotice } from './send-billing-notification'

export interface InvoicePaymentFailedInput {
  customerId: string
  /** Base URL da app — compõe o retryUrl do email. */
  appUrl: string
}

export async function handleInvoicePaymentFailed(
  input: InvoicePaymentFailedInput,
): Promise<void> {
  const supabase = await createServiceClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, email')
    .eq('stripe_customer_id', input.customerId)
    .single()

  if (tenant?.email) {
    await sendPaymentFailedNotice({
      to: tenant.email,
      tenantName: tenant.name,
      retryUrl: `${input.appUrl}/assinatura`,
    })
  }
}
