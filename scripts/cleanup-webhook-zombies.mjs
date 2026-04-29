#!/usr/bin/env node
/**
 * NexoOmnix — Stripe webhook zombie cleanup
 *
 * Ferramenta operacional (manual, NÃO automática) para marcar como
 * `failed` eventos Stripe que ficaram presos em `status = 'processing'`
 * além do threshold. Esses zombies ocorrem quando o processo crashou
 * após registrar o evento mas antes de chamar `markProcessed` ou
 * `markFailed` (ver Sprint 7 e `docs/operations/billing-webhooks.md`).
 *
 * Por design:
 *   - Modo padrão é dry-run (nenhuma mudança no banco)
 *   - Exige flag `--apply` explícita para executar o UPDATE
 *   - Só age em `status = 'processing'` + `received_at` antigo
 *   - Não chama Stripe, Resend, ou qualquer outro side effect externo
 *   - Não altera eventos `processed` ou `failed`
 *   - Não reprocessa, não reenfileira, não dispara retry
 *
 * Uso:
 *   node scripts/cleanup-webhook-zombies.mjs                    # dry-run, threshold 10min
 *   node scripts/cleanup-webhook-zombies.mjs --minutes=15       # dry-run, threshold 15min
 *   node scripts/cleanup-webhook-zombies.mjs --apply            # aplica, threshold 10min
 *   node scripts/cleanup-webhook-zombies.mjs --minutes=30 --apply
 *
 * Variáveis de ambiente lidas de .env.local (ou do shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     (bypassa RLS da tabela)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// ── Load .env.local (sem sobrescrever shell) ──────────────────────
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias')
  process.exitCode = 1
  process.exit(1)
}

// ── Args ──────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply')
const minutesArg = process.argv.find((a) => a.startsWith('--minutes='))
const MINUTES = minutesArg ? parseInt(minutesArg.split('=')[1], 10) : 10

if (!Number.isFinite(MINUTES) || MINUTES < 1) {
  console.error(`❌ --minutes precisa ser inteiro >= 1 (got "${minutesArg ?? 'default'}")`)
  process.exitCode = 1
  process.exit(1)
}

// ── Main ──────────────────────────────────────────────────────────
const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log('━'.repeat(60))
console.log('  Stripe Webhook Zombie Cleanup')
console.log('━'.repeat(60))
console.log(`🎯 Threshold: eventos processing > ${MINUTES} min atrás`)
console.log(`🔑 Mode:      ${APPLY ? 'APPLY (altera banco)' : 'DRY-RUN (read-only)'}`)
console.log(`🗄️  DB URL:    ${NEXT_PUBLIC_SUPABASE_URL}`)
console.log()

async function main() {
  const cutoff = new Date(Date.now() - MINUTES * 60 * 1000).toISOString()

  const { data: candidates, error } = await sb
    .from('stripe_webhook_events')
    .select('id, type, received_at')
    .eq('status', 'processing')
    .lt('received_at', cutoff)
    .order('received_at', { ascending: true })

  if (error) throw new Error(`Query error: ${error.message}`)

  if (!candidates || candidates.length === 0) {
    console.log(`✅ Nenhum zombie encontrado (processing > ${MINUTES} min).`)
    return
  }

  console.log(`🧟 ${candidates.length} evento(s) zombie:`)
  console.log()
  for (const c of candidates) {
    const ageMs = Date.now() - new Date(c.received_at).getTime()
    const ageMin = Math.floor(ageMs / 60000)
    console.log(`  ${c.id}`)
    console.log(`    type:        ${c.type}`)
    console.log(`    received_at: ${c.received_at}`)
    console.log(`    age:         ${ageMin} min`)
    console.log()
  }

  if (!APPLY) {
    console.log('━'.repeat(60))
    console.log(`ℹ️  DRY-RUN — nenhuma alteração feita no banco.`)
    console.log(`    Para marcar estes ${candidates.length} evento(s) como 'failed':`)
    console.log(`    node scripts/cleanup-webhook-zombies.mjs --minutes=${MINUTES} --apply`)
    return
  }

  // APPLY — UPDATE defensivo: só age em rows ainda em 'processing'
  // (se outro processo marcou como processed/failed entre SELECT e UPDATE,
  // não desfaz).
  const errorMessage = `Marked failed by zombie cleanup after ${MINUTES} minutes`
  const ids = candidates.map((c) => c.id)

  const { data: updated, error: upErr } = await sb
    .from('stripe_webhook_events')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .in('id', ids)
    .eq('status', 'processing')
    .select('id')

  if (upErr) throw new Error(`Update error: ${upErr.message}`)

  const updatedCount = updated?.length ?? 0
  console.log('━'.repeat(60))
  console.log(`✅ ${updatedCount} evento(s) marcado(s) como 'failed'.`)
  console.log(`   error_message: "${errorMessage}"`)
  if (updatedCount < candidates.length) {
    const skipped = candidates.length - updatedCount
    console.log(
      `ℹ️  ${skipped} evento(s) não foi(ram) alterado(s) — já haviam transicionado em paralelo.`,
    )
  }
}

// `process.exitCode` em vez de `process.exit()` deixa o event loop drenar
// conexões abertas do Supabase client, evitando a assertion "UV_HANDLE_CLOSING"
// conhecida do Node no Windows.
main()
  .then(() => { process.exitCode = 0 })
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  })
