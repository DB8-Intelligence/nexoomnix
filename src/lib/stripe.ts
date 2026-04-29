import Stripe from 'stripe'

// Server-side only — never import in client components
// Lazy singleton to avoid crashing when STRIPE_SECRET_KEY is not set (e.g. build time)
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}
/** @deprecated use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  pro:        process.env.STRIPE_PRICE_PRO,
  pro_plus:   process.env.STRIPE_PRICE_PRO_PLUS,
  pro_max:    process.env.STRIPE_PRICE_PRO_MAX,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
}

export const PLAN_LABELS: Record<string, string> = {
  starter:    'Starter — R$ 99/mês',
  pro:        'Pro — R$ 199/mês',
  pro_plus:   'Pro Plus — R$ 399/mês',
  pro_max:    'PRO MAX — R$ 499/mês',
  enterprise: 'Enterprise — R$ 699/mês',
}

/** Maps a Stripe Price ID back to a plan slug */
export function planFromPriceId(priceId: string): string {
  return Object.entries(PLAN_PRICE_IDS).find(([, v]) => v === priceId)?.[0] ?? 'starter'
}
