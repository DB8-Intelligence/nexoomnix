import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripe, planFromPriceId } from '@/lib/stripe'
import {
  sendPaymentFailedNotice,
  sendSubscriptionWelcome,
} from '@/modules/billing/application/send-billing-notification'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const plan = session.metadata?.plan
      if (!tenantId || !plan) break

      const subscription = session.subscription
        ? await stripe.subscriptions.retrieve(session.subscription as string)
        : null

      await supabase
        .from('tenants')
        .update({
          plan,
          plan_expires_at: subscription?.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null,
          stripe_subscription_id: subscription?.id ?? null,
          stripe_price_id: subscription?.items.data[0]?.price.id ?? null,
          cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
        })
        .eq('id', tenantId)

      // Send welcome email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, email')
        .eq('id', tenantId)
        .single()

      if (tenant?.email) {
        await sendSubscriptionWelcome({
          to: tenant.email,
          tenantName: tenant.name,
          plan,
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) break

      const plan = planFromPriceId(sub.items.data[0]?.price.id ?? '')

      await supabase
        .from('tenants')
        .update({
          plan,
          plan_expires_at: sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : null,
          stripe_price_id: sub.items.data[0]?.price.id ?? null,
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        .eq('id', tenantId)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) break

      await supabase
        .from('tenants')
        .update({
          plan: 'trial',
          plan_expires_at: null,
          stripe_subscription_id: null,
          stripe_price_id: null,
          cancel_at_period_end: false,
        })
        .eq('id', tenantId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (!customerId) break

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, name, email')
        .eq('stripe_customer_id', customerId)
        .single()

      if (tenant?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        await sendPaymentFailedNotice({
          to: tenant.email,
          tenantName: tenant.name,
          retryUrl: `${appUrl}/assinatura`,
        })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
