#!/usr/bin/env node
/**
 * NexoOmnix — Stripe setup script
 *
 * Cria (ou reutiliza) os 5 produtos de assinatura, preços recorrentes em BRL
 * com trial de 14 dias, e o webhook endpoint apontando para o Next.js.
 *
 * Idempotente: rodar duas vezes não duplica.
 * Use a mesma ferramenta em modo Test e depois em Live — basta trocar a key.
 *
 * Uso:
 *   STRIPE_SECRET_KEY=rk_test_xxx node scripts/stripe-setup.mjs
 *
 * Flags:
 *   --recreate-webhook    Deleta o webhook existente no mesmo URL e cria um
 *                         novo (para obter um whsec_ fresco). Sem o flag, se
 *                         o webhook já existir o script só avisa.
 *
 * Opcional:
 *   STRIPE_WEBHOOK_URL=https://staging.nexoomnix.com/api/webhooks/stripe
 *     (default: https://nexoomnix.com/api/webhooks/stripe)
 */

import Stripe from 'stripe'

// ── Config ────────────────────────────────────────────────────────────────────

const SECRET = process.env.STRIPE_SECRET_KEY
const WEBHOOK_URL =
  process.env.STRIPE_WEBHOOK_URL || 'https://nexoomnix.com/api/webhooks/stripe'
const RECREATE_WEBHOOK = process.argv.includes('--recreate-webhook')

const TRIAL_DAYS = 14

const PLANS = [
  { key: 'starter',    name: 'NexoOmnix Starter',    amount: 9900 },
  { key: 'pro',        name: 'NexoOmnix Pro',        amount: 19900 },
  { key: 'pro_plus',   name: 'NexoOmnix Pro Plus',   amount: 34900 },
  { key: 'pro_max',    name: 'NexoOmnix Pro Max',    amount: 49900 },
  { key: 'enterprise', name: 'NexoOmnix Enterprise', amount: 69900 },
]

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const line = (ch = '─') => console.log(ch.repeat(60))
const log  = (msg = '') => console.log(msg)
const step = (msg) => console.log(`\n🔹 ${msg}`)
const ok   = (msg) => console.log(`   ✅ ${msg}`)
const info = (msg) => console.log(`   ℹ️  ${msg}`)
const warn = (msg) => console.log(`   ⚠️  ${msg}`)

function brl(cents) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ── Guardrails ────────────────────────────────────────────────────────────────

if (!SECRET) {
  console.error('\n❌ STRIPE_SECRET_KEY não definida.')
  console.error(
    '   Uso: STRIPE_SECRET_KEY=rk_test_xxx node scripts/stripe-setup.mjs\n',
  )
  process.exit(1)
}

const MODE =
  SECRET.startsWith('sk_live_') || SECRET.startsWith('rk_live_') ? 'LIVE' : 'TEST'

const stripe = new Stripe(SECRET)

// ── Core ──────────────────────────────────────────────────────────────────────

async function findOrCreateProduct(plan) {
  // Lista e filtra por metadata.plan (evita Search API que tem indexação atrasada)
  const { data } = await stripe.products.list({ active: true, limit: 100 })
  const existing = data.find(
    (p) => p.metadata?.plan === plan.key && p.metadata?.nexoomnix === 'true',
  )
  if (existing) {
    info(`Produto já existe: ${existing.id}`)
    return existing
  }
  const created = await stripe.products.create({
    name: plan.name,
    metadata: { plan: plan.key, nexoomnix: 'true' },
  })
  ok(`Produto criado: ${created.id}`)
  return created
}

async function findOrCreatePrice(product, plan) {
  const lookupKey = `nexoomnix_${plan.key}_monthly_brl`
  const { data } = await stripe.prices.list({
    product: product.id,
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  })
  if (data.length > 0) {
    info(`Preço já existe: ${data[0].id}`)
    return data[0]
  }
  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount,
    currency: 'brl',
    recurring: { interval: 'month', trial_period_days: TRIAL_DAYS },
    lookup_key: lookupKey,
    metadata: { plan: plan.key },
  })
  ok(`Preço criado: ${created.id} (${brl(plan.amount)}/mês, trial ${TRIAL_DAYS}d)`)
  return created
}

async function findOrCreateWebhook(url) {
  const { data } = await stripe.webhookEndpoints.list({ limit: 100 })
  const match = data.find((e) => e.url === url)
  if (match) {
    if (RECREATE_WEBHOOK) {
      info(`Webhook encontrado: ${match.id} — deletando (flag --recreate-webhook)`)
      await stripe.webhookEndpoints.del(match.id)
      ok(`Webhook antigo deletado: ${match.id}`)
    } else {
      info(`Webhook já existe: ${match.id}`)
      warn('Stripe não retorna o signing secret depois da criação.')
      warn(
        '   Se você NÃO tem o whsec_... anotado, rode o script com ' +
          '--recreate-webhook para gerar um novo.',
      )
      return { endpoint: match, secret: null }
    }
  }
  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: WEBHOOK_EVENTS,
    description: 'NexoOmnix — subscription lifecycle',
  })
  ok(`Webhook criado: ${created.id}`)
  return { endpoint: created, secret: created.secret }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  line('━')
  log('  🚀 NexoOmnix — Stripe Setup')
  line('━')
  log(`\n🔑 Modo:        ${MODE}`)
  log(`🌐 Webhook URL: ${WEBHOOK_URL}`)
  log(`⏳ Trial:       ${TRIAL_DAYS} dias`)
  if (RECREATE_WEBHOOK) log(`♻️  Recreate:    webhook existente será deletado`)

  const results = {}

  step('1. Produtos + Preços')
  for (const plan of PLANS) {
    log(`\n   📦 ${plan.name} — ${brl(plan.amount)}/mês`)
    const product = await findOrCreateProduct(plan)
    const price = await findOrCreatePrice(product, plan)
    results[`STRIPE_PRICE_${plan.key.toUpperCase()}`] = price.id
  }

  step('2. Webhook endpoint')
  const { secret: whsec } = await findOrCreateWebhook(WEBHOOK_URL)
  if (whsec) results.STRIPE_WEBHOOK_SECRET = whsec

  line('━')
  log('  📋 Env vars para o Vercel')
  line('━')
  log('\nCopie e cole em:')
  log(
    '  https://vercel.com/db8-intelligence/nexoomnix/settings/environment-variables\n',
  )

  for (const plan of PLANS) {
    const key = `STRIPE_PRICE_${plan.key.toUpperCase()}`
    log(`  ${key}=${results[key]}`)
  }

  if (results.STRIPE_WEBHOOK_SECRET) {
    log(`  STRIPE_WEBHOOK_SECRET=${results.STRIPE_WEBHOOK_SECRET}`)
  } else {
    log('')
    warn('STRIPE_WEBHOOK_SECRET não foi impresso (webhook já existia).')
  }

  log('\n  # Adicione manualmente (pegue em dashboard.stripe.com/apikeys):')
  log('  STRIPE_SECRET_KEY=<sk_test_... ou rk_test_... do modo ' + MODE + '>')
  log(
    '  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_test_... do modo ' + MODE + '>',
  )

  log('\n✅ Setup Stripe concluído.\n')
}

main().catch((e) => {
  console.error('\n❌ Erro:', e.message)
  if (e.type === 'StripePermissionError') {
    console.error(
      '   Sua chave restrita não tem permissão suficiente. Revise:',
    )
    console.error(
      '   - Products: Gravação\n   - Prices: Gravação\n   - Webhook Endpoints: Gravação',
    )
  }
  if (e.raw?.message && e.raw.message !== e.message) {
    console.error('   Stripe:', e.raw.message)
  }
  process.exit(1)
})
