#!/usr/bin/env node
/**
 * NexoOmnix — Stripe smoke test (headless E2E)
 *
 * Executa o fluxo completo sem browser:
 *   1. Cria tenant de teste no Supabase
 *   2. Cria customer + subscription Pro no Stripe (bypass UI de checkout)
 *   3. Assina evento checkout.session.completed e POSTa no webhook local
 *   4. Verifica que tenant foi atualizado no banco
 *   5. Cleanup (subscription + customer + tenant)
 *
 * Uso:
 *   node scripts/smoke-stripe.mjs
 *
 * Opcional:
 *   SMOKE_DEV_URL=http://localhost:3000 node scripts/smoke-stripe.mjs
 *     (default: http://localhost:3002)
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// ── Load .env.local (sem sobrescrever vars já presentes) ──────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_PRO,
  STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env

// 127.0.0.1 em vez de localhost: Node 18+ no Windows resolve localhost → ::1
// primeiro, mas Next.js dev só escuta em IPv4. Forçar IPv4 evita "fetch failed".
let DEV_URL = process.env.SMOKE_DEV_URL || 'http://127.0.0.1:3002'

function assertEnv(name, v) {
  if (!v) {
    console.error(`❌ ${name} não definida (.env.local ou env do shell)`)
    process.exit(1)
  }
}
assertEnv('STRIPE_SECRET_KEY', STRIPE_SECRET_KEY)
assertEnv('STRIPE_PRICE_PRO', STRIPE_PRICE_PRO)
assertEnv('STRIPE_WEBHOOK_SECRET', STRIPE_WEBHOOK_SECRET)
assertEnv('NEXT_PUBLIC_SUPABASE_URL', NEXT_PUBLIC_SUPABASE_URL)
assertEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)

if (!STRIPE_SECRET_KEY.startsWith('sk_test_') && !STRIPE_SECRET_KEY.startsWith('rk_test_')) {
  console.error('❌ STRIPE_SECRET_KEY não parece ser de TEST mode. Abortando.')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const log  = (emoji, msg) => console.log(`${emoji} ${msg}`)
const ok   = (msg) => log('✅', msg)
const info = (msg) => log('ℹ️ ', msg)
const fail = (msg) => log('❌', msg)
const step = (n, msg) => console.log(`\n🔹 ${n}. ${msg}`)

const cleanup = { tenantId: null, customerId: null, subscriptionId: null, devProcess: null }

async function runCleanup() {
  console.log('\n🧹 Cleanup')
  if (cleanup.subscriptionId) {
    try {
      await stripe.subscriptions.cancel(cleanup.subscriptionId)
      ok(`Subscription cancelada: ${cleanup.subscriptionId}`)
    } catch (e) { info(`Subscription cancel: ${e.message}`) }
  }
  if (cleanup.customerId) {
    try {
      await stripe.customers.del(cleanup.customerId)
      ok(`Customer deletado: ${cleanup.customerId}`)
    } catch (e) { info(`Customer del: ${e.message}`) }
  }
  if (cleanup.tenantId) {
    try {
      const { error } = await sb.from('tenants').delete().eq('id', cleanup.tenantId)
      if (error) throw error
      ok(`Tenant deletado: ${cleanup.tenantId}`)
    } catch (e) { info(`Tenant del: ${e.message}`) }
  }
  if (cleanup.devProcess) {
    try {
      // Windows: kill da árvore inteira (npm → next → node) com taskkill /T
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(cleanup.devProcess.pid), '/T', '/F'], { stdio: 'ignore' })
      } else {
        cleanup.devProcess.kill('SIGTERM')
      }
      await new Promise((r) => setTimeout(r, 500))
      ok('Dev server derrubado')
    } catch (e) { info(`Dev kill: ${e.message}`) }
  }
}

async function probeDev(url, timeoutMs = 1500) {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), timeoutMs)
    await fetch(url, { signal: ctl.signal })
    clearTimeout(t)
    return true
  } catch { return false }
}

async function ensureDevServer() {
  step(0, `Garantir dev server (probing ${DEV_URL})`)
  if (await probeDev(DEV_URL)) {
    ok(`Dev já rodando em ${DEV_URL}`)
    return
  }
  info('Não detectado — startando "npm run dev" como filho')

  const proc = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    shell: true,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  cleanup.devProcess = proc

  let buf = ''
  const onChunk = (chunk) => { buf += chunk.toString() }
  proc.stdout.on('data', onChunk)
  proc.stderr.on('data', onChunk)

  const start = Date.now()
  const TIMEOUT_MS = 60_000
  while (Date.now() - start < TIMEOUT_MS) {
    // Procura "Local:        http://localhost:3002"
    const m = buf.match(/Local:\s+http:\/\/[^:]+:(\d+)/)
    if (m && /Ready in/.test(buf)) {
      const port = m[1]
      DEV_URL = `http://127.0.0.1:${port}`
      ok(`Dev pronto em ${DEV_URL} (após ${((Date.now() - start) / 1000).toFixed(1)}s)`)
      return
    }
    if (proc.exitCode != null) {
      throw new Error(`Dev server saiu prematuramente (code ${proc.exitCode})\n--- output ---\n${buf}`)
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Dev server timeout (${TIMEOUT_MS / 1000}s). Output:\n${buf}`)
}

async function main() {
  console.log('━'.repeat(60))
  console.log('  NexoOmnix — Stripe Smoke Test')
  console.log('━'.repeat(60))
  console.log(`\n🌐 Dev URL:     ${DEV_URL}`)
  console.log(`💳 Price (Pro): ${STRIPE_PRICE_PRO}`)
  console.log(`🔑 Mode:        TEST`)

  await ensureDevServer()

  // ── 1. Create test tenant ──────────────────────────────────────────────
  step(1, 'Criar tenant de teste no Supabase')
  const uniq = Date.now().toString(36)
  const testEmail = `smoke+${uniq}@test.local`
  const testSlug = `smoke-test-${uniq}`
  const { data: tenant, error: tenantErr } = await sb
    .from('tenants')
    .insert({
      name: 'Smoke Test Tenant',
      slug: testSlug,
      niche: 'beleza',
      plan: 'trial',
      email: testEmail,
      trial_ends_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    })
    .select()
    .single()
  if (tenantErr) throw new Error(`Tenant insert: ${tenantErr.message}`)
  cleanup.tenantId = tenant.id
  ok(`Tenant: ${tenant.id}`)
  ok(`Email:  ${testEmail}`)
  ok(`Plan:   trial`)

  // ── 2. Create Stripe customer ──────────────────────────────────────────
  step(2, 'Criar Stripe customer')
  const customer = await stripe.customers.create({
    email: testEmail,
    name: tenant.name,
    metadata: { tenant_id: tenant.id, smoke_test: 'true' },
  })
  cleanup.customerId = customer.id
  ok(`Customer: ${customer.id}`)
  await sb.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenant.id)

  // ── 3. Create subscription (bypass checkout UI) ────────────────────────
  step(3, 'Criar subscription Pro (bypass da UI de checkout)')
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: STRIPE_PRICE_PRO }],
    metadata: { tenant_id: tenant.id, plan: 'pro' },
    trial_period_days: 14,
  })
  cleanup.subscriptionId = subscription.id
  ok(`Subscription: ${subscription.id}`)
  ok(`Status:       ${subscription.status}`)

  // ── 4. Sign & POST checkout.session.completed ──────────────────────────
  step(4, 'Assinar e postar checkout.session.completed no webhook local')
  const fakeSession = {
    id: 'cs_test_smoke_' + crypto.randomBytes(8).toString('hex'),
    object: 'checkout.session',
    customer: customer.id,
    subscription: subscription.id,
    metadata: { tenant_id: tenant.id, plan: 'pro' },
    payment_status: 'paid',
    status: 'complete',
    mode: 'subscription',
    customer_email: testEmail,
  }
  const event = {
    id: 'evt_smoke_' + crypto.randomBytes(8).toString('hex'),
    object: 'event',
    api_version: '2026-03-25.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: { object: fakeSession },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  }
  const payload = JSON.stringify(event)
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex')
  const stripeSig = `t=${timestamp},v1=${signature}`

  let res
  try {
    res = await fetch(`${DEV_URL}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': stripeSig },
      body: payload,
    })
  } catch (e) {
    throw new Error(`Fetch falhou (servidor dev está rodando em ${DEV_URL}?): ${e.message}`)
  }
  const resBody = await res.text()
  if (!res.ok) throw new Error(`Webhook ${res.status}: ${resBody}`)
  ok(`Webhook response: ${res.status} ${resBody}`)

  // Dá 1.5s pro handler terminar writes + email
  await new Promise((r) => setTimeout(r, 1500))

  // ── 5. Verify DB ───────────────────────────────────────────────────────
  step(5, 'Verificar atualização do tenant no banco')
  const { data: updated, error: readErr } = await sb
    .from('tenants')
    .select(
      'id, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, cancel_at_period_end',
    )
    .eq('id', tenant.id)
    .single()
  if (readErr) throw new Error(`Tenant read: ${readErr.message}`)

  console.log()
  const checks = [
    ['plan === pro',                  updated.plan === 'pro',                       `got: ${updated.plan}`],
    ['stripe_customer_id set',        updated.stripe_customer_id === customer.id,   `got: ${updated.stripe_customer_id}`],
    ['stripe_subscription_id set',    updated.stripe_subscription_id === subscription.id, `got: ${updated.stripe_subscription_id}`],
    ['stripe_price_id === PRO',       updated.stripe_price_id === STRIPE_PRICE_PRO, `got: ${updated.stripe_price_id}`],
    ['cancel_at_period_end === false', updated.cancel_at_period_end === false,      `got: ${updated.cancel_at_period_end}`],
  ]
  let failed = 0
  for (const [label, pass, got] of checks) {
    if (pass) ok(label)
    else { fail(`${label} — ${got}`); failed++ }
  }
  if (failed > 0) throw new Error(`${failed} check(s) falharam`)
}

main()
  .then(async () => {
    await runCleanup()
    console.log('\n' + '━'.repeat(60))
    console.log('  ✅ Smoke test PASSOU')
    console.log('━'.repeat(60) + '\n')
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(`\n❌ ${e.message}`)
    await runCleanup()
    console.log('\n' + '━'.repeat(60))
    console.log('  ❌ Smoke test FALHOU')
    console.log('━'.repeat(60) + '\n')
    process.exit(1)
  })
