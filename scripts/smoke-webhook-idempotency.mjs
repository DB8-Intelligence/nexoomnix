#!/usr/bin/env node
/**
 * NexoOmnix — Stripe webhook idempotency smoke test
 *
 * Valida Sprint 7: o mesmo event.id entregue duas vezes NÃO re-executa
 * side effects. A segunda entrega deve retornar `{ received: true,
 * duplicate: true }` e o banco não deve mudar.
 *
 * Cenário:
 *   1. Cria tenant + customer + subscription reais no Stripe
 *      (bypass do UI de checkout, como o smoke-stripe.mjs original)
 *   2. Assina HMAC e POSTa evento checkout.session.completed no webhook local
 *   3. Verifica 200 {received:true} (sem duplicate:true)
 *   4. Verifica tenant foi atualizado no DB
 *   5. Captura estado atual do tenant (plan, stripe_price_id, etc)
 *   6. POSTa o MESMO evento (mesmo event.id, mesma assinatura)
 *   7. Verifica 200 {received:true, duplicate:true}
 *   8. Verifica tenant NÃO mudou (valores idênticos ao step 5)
 *   9. Verifica stripe_webhook_events tem exatamente 1 row com status='processed'
 *  10. Cleanup
 *
 * Uso:
 *   node scripts/smoke-webhook-idempotency.mjs
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// ── Load .env.local ──────────────────────────────────────────────
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

let DEV_URL = process.env.SMOKE_DEV_URL || 'http://127.0.0.1:3002'

function assertEnv(name, v) {
  if (!v) { console.error(`❌ ${name} não definida`); process.exit(1) }
}
assertEnv('STRIPE_SECRET_KEY', STRIPE_SECRET_KEY)
assertEnv('STRIPE_PRICE_PRO', STRIPE_PRICE_PRO)
assertEnv('STRIPE_WEBHOOK_SECRET', STRIPE_WEBHOOK_SECRET)
assertEnv('NEXT_PUBLIC_SUPABASE_URL', NEXT_PUBLIC_SUPABASE_URL)
assertEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)

if (!STRIPE_SECRET_KEY.startsWith('sk_test_') && !STRIPE_SECRET_KEY.startsWith('rk_test_')) {
  console.error('❌ STRIPE_SECRET_KEY não é de TEST mode. Abortando.')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ok   = (m) => console.log(`✅ ${m}`)
const info = (m) => console.log(`ℹ️  ${m}`)
const fail = (m) => console.log(`❌ ${m}`)
const step = (n, m) => console.log(`\n🔹 ${n}. ${m}`)

const cleanup = { tenantId: null, customerId: null, subscriptionId: null, devProcess: null, eventId: null }

async function runCleanup() {
  console.log('\n🧹 Cleanup')
  if (cleanup.eventId) {
    try {
      await sb.from('stripe_webhook_events').delete().eq('id', cleanup.eventId)
      ok(`Event row deletado: ${cleanup.eventId}`)
    } catch (e) { info(`Event del: ${e.message}`) }
  }
  if (cleanup.subscriptionId) {
    try { await stripe.subscriptions.cancel(cleanup.subscriptionId); ok(`Sub cancelada: ${cleanup.subscriptionId}`) }
    catch (e) { info(`Sub cancel: ${e.message}`) }
  }
  if (cleanup.customerId) {
    try { await stripe.customers.del(cleanup.customerId); ok(`Customer deletado: ${cleanup.customerId}`) }
    catch (e) { info(`Customer del: ${e.message}`) }
  }
  if (cleanup.tenantId) {
    try {
      await sb.from('tenants').delete().eq('id', cleanup.tenantId)
      ok(`Tenant deletado: ${cleanup.tenantId}`)
    } catch (e) { info(`Tenant del: ${e.message}`) }
  }
  if (cleanup.devProcess) {
    try {
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
  step(0, `Dev server probe em ${DEV_URL}`)
  if (await probeDev(DEV_URL)) { ok(`Dev já rodando em ${DEV_URL}`); return }
  info('Não detectado — spawn "npm run dev"')
  const proc = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), shell: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
  cleanup.devProcess = proc
  let buf = ''
  proc.stdout.on('data', (c) => { buf += c.toString() })
  proc.stderr.on('data', (c) => { buf += c.toString() })
  const start = Date.now()
  const TIMEOUT_MS = 60_000
  while (Date.now() - start < TIMEOUT_MS) {
    const m = buf.match(/Local:\s+http:\/\/[^:]+:(\d+)/)
    if (m && /Ready in/.test(buf)) {
      DEV_URL = `http://127.0.0.1:${m[1]}`
      ok(`Dev pronto em ${DEV_URL} (${((Date.now()-start)/1000).toFixed(1)}s)`)
      return
    }
    if (proc.exitCode != null) throw new Error(`Dev saiu code ${proc.exitCode}\n${buf}`)
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Dev timeout\n${buf}`)
}

function signAndBuildRequest(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  return { header: `t=${timestamp},v1=${signature}`, body: payload }
}

async function postWebhook(eventPayload) {
  const { header, body } = signAndBuildRequest(eventPayload, STRIPE_WEBHOOK_SECRET)
  const res = await fetch(`${DEV_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': header },
    body,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, body: text, json }
}

async function main() {
  console.log('━'.repeat(60))
  console.log('  NexoOmnix — Stripe Webhook Idempotency Smoke Test')
  console.log('━'.repeat(60))
  console.log(`💳 Price: ${STRIPE_PRICE_PRO}`)
  console.log(`🔑 Mode:  TEST`)

  await ensureDevServer()

  // ── Setup ──────────────────────────────────────────────────────
  step(1, 'Criar tenant de teste no Supabase')
  const uniq = Date.now().toString(36)
  const testEmail = `idem+${uniq}@test.local`
  const testSlug = `idem-smoke-${uniq}`
  const { data: tenant, error: tErr } = await sb.from('tenants').insert({
    name: 'Idempotency Smoke',
    slug: testSlug,
    niche: 'beleza',
    plan: 'trial',
    email: testEmail,
    trial_ends_at: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
  }).select().single()
  if (tErr) throw new Error(`Tenant insert: ${tErr.message}`)
  cleanup.tenantId = tenant.id
  ok(`Tenant: ${tenant.id}`)

  step(2, 'Criar Stripe customer + subscription (bypass UI)')
  const customer = await stripe.customers.create({
    email: testEmail, name: tenant.name, metadata: { tenant_id: tenant.id, smoke_test: 'idem' },
  })
  cleanup.customerId = customer.id
  await sb.from('tenants').update({ stripe_customer_id: customer.id }).eq('id', tenant.id)

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: STRIPE_PRICE_PRO }],
    metadata: { tenant_id: tenant.id, plan: 'pro' },
    trial_period_days: 14,
  })
  cleanup.subscriptionId = subscription.id
  ok(`Customer ${customer.id} + sub ${subscription.id}`)

  // ── Build signed event ─────────────────────────────────────────
  step(3, 'Montar evento checkout.session.completed')
  const eventId = 'evt_idem_' + crypto.randomBytes(8).toString('hex')
  cleanup.eventId = eventId
  const fakeSession = {
    id: 'cs_test_idem_' + crypto.randomBytes(8).toString('hex'),
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
    id: eventId,
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
  ok(`event.id: ${eventId}`)

  // ── First delivery ─────────────────────────────────────────────
  step(4, 'PRIMEIRA entrega do webhook')
  const r1 = await postWebhook(payload)
  if (r1.status !== 200) throw new Error(`1ª entrega ${r1.status}: ${r1.body}`)
  ok(`${r1.status} ${r1.body}`)
  if (r1.json?.duplicate === true) throw new Error('1ª entrega já veio como duplicate — inesperado')
  ok('Flag duplicate ausente na 1ª entrega ✓')

  // Dá 1s pro handler concluir side effects (DB update, etc)
  await new Promise((r) => setTimeout(r, 1200))

  step(5, 'Capturar estado do tenant após 1ª entrega')
  const { data: afterFirst, error: rErr1 } = await sb
    .from('tenants')
    .select('plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, cancel_at_period_end')
    .eq('id', tenant.id)
    .single()
  if (rErr1) throw new Error(`Tenant read 1: ${rErr1.message}`)
  if (afterFirst.plan !== 'pro') throw new Error(`plan esperado pro, got ${afterFirst.plan}`)
  ok(`plan=pro, sub=${afterFirst.stripe_subscription_id}, price=${afterFirst.stripe_price_id}`)

  step(6, 'Verificar registro em stripe_webhook_events')
  const { data: evRow1 } = await sb
    .from('stripe_webhook_events')
    .select('id, type, status, received_at, processed_at, failed_at')
    .eq('id', eventId)
    .single()
  if (!evRow1) throw new Error('Evento não registrado em stripe_webhook_events')
  if (evRow1.status !== 'processed') throw new Error(`Status esperado processed, got ${evRow1.status}`)
  if (!evRow1.processed_at) throw new Error('processed_at vazio')
  if (evRow1.failed_at) throw new Error('failed_at deveria ser null')
  ok(`Status=processed, processed_at=${evRow1.processed_at}`)

  // ── Second delivery (DUPLICATE) ────────────────────────────────
  step(7, 'SEGUNDA entrega do MESMO evento')
  const r2 = await postWebhook(payload)
  if (r2.status !== 200) throw new Error(`2ª entrega ${r2.status}: ${r2.body}`)
  ok(`${r2.status} ${r2.body}`)
  if (r2.json?.duplicate !== true) throw new Error(`Esperado duplicate:true na 2ª entrega, got ${JSON.stringify(r2.json)}`)
  ok('Flag duplicate:true presente na 2ª entrega ✓')

  // Dá tempo pra qualquer side effect hipotético (não deveria ter nenhum)
  await new Promise((r) => setTimeout(r, 800))

  step(8, 'Verificar tenant NÃO mudou')
  const { data: afterSecond, error: rErr2 } = await sb
    .from('tenants')
    .select('plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, cancel_at_period_end')
    .eq('id', tenant.id)
    .single()
  if (rErr2) throw new Error(`Tenant read 2: ${rErr2.message}`)

  const fields = ['plan', 'stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id', 'cancel_at_period_end']
  for (const f of fields) {
    if (afterFirst[f] !== afterSecond[f]) {
      throw new Error(`Campo ${f} mudou! antes=${afterFirst[f]} depois=${afterSecond[f]}`)
    }
  }
  ok('Todos os campos idênticos entre 1ª e 2ª entrega ✓')

  step(9, 'Verificar que stripe_webhook_events continua com 1 row')
  const { data: allEvents, error: eErr } = await sb
    .from('stripe_webhook_events')
    .select('id, status')
    .eq('id', eventId)
  if (eErr) throw new Error(`Events read: ${eErr.message}`)
  if (allEvents.length !== 1) throw new Error(`Esperado 1 row, got ${allEvents.length}`)
  if (allEvents[0].status !== 'processed') throw new Error(`Status mudou para ${allEvents[0].status}`)
  ok(`1 row, status=processed (sem mutação na 2ª entrega)`)

  // ── Bonus: Third delivery ──────────────────────────────────────
  step(10, 'TERCEIRA entrega (dupla duplicação) — confirma estabilidade')
  const r3 = await postWebhook(payload)
  if (r3.status !== 200 || r3.json?.duplicate !== true) {
    throw new Error(`3ª entrega inesperada: ${r3.status} ${r3.body}`)
  }
  ok(`3ª entrega também retornou duplicate:true ✓`)

  console.log('\n' + '━'.repeat(60))
  console.log('  ✅ TODOS OS CHECKS PASSARAM')
  console.log('━'.repeat(60))
}

main()
  .then(async () => {
    await runCleanup()
    console.log('\n✅ Smoke test PASSOU\n')
    process.exit(0)
  })
  .catch(async (e) => {
    fail(`\n${e.message}`)
    await runCleanup()
    console.log('\n❌ Smoke test FALHOU\n')
    process.exit(1)
  })
