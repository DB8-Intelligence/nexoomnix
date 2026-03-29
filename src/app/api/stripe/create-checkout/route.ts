import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, PLAN_PRICE_IDS, PLAN_LABELS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { plan } = await req.json() as { plan: string }
  const priceId = PLAN_PRICE_IDS[plan]
  if (!priceId) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

  // Get tenant data
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, email, stripe_customer_id')
    .eq('id', profile.tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create or reuse Stripe customer
  let customerId = tenant.stripe_customer_id ?? undefined

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.email ?? user.email ?? undefined,
      name: tenant.name,
      metadata: { tenant_id: tenant.id },
    })
    customerId = customer.id
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id)
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/assinatura?success=true&plan=${plan}`,
    cancel_url: `${appUrl}/assinatura?canceled=true`,
    metadata: { tenant_id: tenant.id, plan },
    subscription_data: {
      metadata: { tenant_id: tenant.id, plan },
    },
    locale: 'pt-BR',
    allow_promotion_codes: true,
    custom_text: {
      submit: { message: `Ao assinar, você concorda com os termos de uso do NexoOmnix.` },
    },
  })

  return NextResponse.json({ url: session.url })
}
