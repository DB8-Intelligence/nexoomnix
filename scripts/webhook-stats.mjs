#!/usr/bin/env node
/**
 * NexoOmnix — Stripe webhook stats
 *
 * Observabilidade operacional leve, somente-leitura, para o fluxo de
 * webhook Stripe (tabela `stripe_webhook_events`, Sprint 7).
 *
 * Visibilidade mínima — não substitui dashboard. Útil para:
 *   - sanity check após deploy
 *   - investigar reclamação de cliente ("paguei e o plano não ativou")
 *   - detectar zombies antes de rodar cleanup
 *
 * Uso:
 *   node scripts/webhook-stats.mjs              # últimas 24h
 *   node scripts/webhook-stats.mjs --hours=1    # última 1h
 *   node scripts/webhook-stats.mjs --hours=168  # últimos 7 dias
 *
 * Variáveis de ambiente (.env.local ou shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (bypassa RLS da tabela)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// ── Load .env.local ───────────────────────────────────────────────
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
  process.exit(1)
}

// ── Args ──────────────────────────────────────────────────────────
const hoursArg = process.argv.find((a) => a.startsWith('--hours='))
const HOURS = hoursArg ? parseInt(hoursArg.split('=')[1], 10) : 24

if (!Number.isFinite(HOURS) || HOURS < 1) {
  console.error(`❌ --hours precisa ser inteiro >= 1 (got "${hoursArg ?? 'default'}")`)
  process.exit(1)
}

const ZOMBIE_THRESHOLD_MIN = 10

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Helpers ───────────────────────────────────────────────────────
function formatAge(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h${min % 60 > 0 ? ' ' + (min % 60) + 'min' : ''} atrás`
  const days = Math.floor(hr / 24)
  return `${days}d${hr % 24 > 0 ? ' ' + (hr % 24) + 'h' : ''} atrás`
}

function pad(s, n) {
  const str = String(s)
  return str.length >= n ? str : str + ' '.repeat(n - str.length)
}

function truncate(s, n) {
  const str = String(s ?? '')
  return str.length <= n ? str : str.slice(0, n - 1) + '…'
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const periodCutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString()
  const zombieCutoff = new Date(Date.now() - ZOMBIE_THRESHOLD_MIN * 60 * 1000).toISOString()

  console.log('━'.repeat(60))
  console.log(`  Stripe Webhook Stats — últimas ${HOURS}h`)
  console.log('━'.repeat(60))
  console.log()

  // Query 1: todos os eventos no período
  const { data: events, error: eErr } = await sb
    .from('stripe_webhook_events')
    .select('id, type, status, received_at, failed_at, error_message')
    .gt('received_at', periodCutoff)
    .order('received_at', { ascending: false })

  if (eErr) throw new Error(`Events query: ${eErr.message}`)

  // Query 2: zombies (independente de --hours — threshold fixo de 10min)
  const { data: zombies, error: zErr } = await sb
    .from('stripe_webhook_events')
    .select('id, type, received_at')
    .eq('status', 'processing')
    .lt('received_at', zombieCutoff)
    .order('received_at', { ascending: true })

  if (zErr) throw new Error(`Zombies query: ${zErr.message}`)

  const rows = events ?? []

  // ── Resumo geral ────────────────────────────────────────────────
  console.log(`📊 Resumo geral (${rows.length} evento${rows.length !== 1 ? 's' : ''})`)
  if (rows.length === 0) {
    console.log('   (sem eventos no período)')
  } else {
    const byStatus = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    for (const status of ['processed', 'failed', 'processing']) {
      const n = byStatus[status] ?? 0
      const emoji = status === 'processed' ? '✅' : status === 'failed' ? '❌' : '⏳'
      console.log(`   ${emoji} ${pad(status, 11)} ${n}`)
    }
  }
  console.log()

  // ── Top 5 event types ───────────────────────────────────────────
  if (rows.length > 0) {
    const byType = rows.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1
      return acc
    }, {})
    const sorted = Object.entries(byType).sort(([, a], [, b]) => b - a)
    const top5 = sorted.slice(0, 5)
    const rest = sorted.slice(5)
    const restSum = rest.reduce((s, [, n]) => s + n, 0)

    console.log(`📈 Top 5 event types`)
    for (const [type, n] of top5) {
      console.log(`   ${pad(type, 38)} ${n}`)
    }
    if (rest.length > 0) {
      console.log(`   ${pad('(demais ' + rest.length + ' tipo' + (rest.length > 1 ? 's' : '') + ')', 38)} ${restSum}`)
    }
    console.log()
  }

  // ── Últimos 5 eventos ───────────────────────────────────────────
  if (rows.length > 0) {
    const last5 = rows.slice(0, 5)
    console.log(`🕒 Últimos ${last5.length} evento${last5.length !== 1 ? 's' : ''}`)
    for (const r of last5) {
      const statusEmoji = r.status === 'processed' ? '✅' : r.status === 'failed' ? '❌' : '⏳'
      console.log(`   ${statusEmoji}  ${pad(truncate(r.id, 26), 28)} ${pad(truncate(r.type, 32), 34)} ${formatAge(r.received_at)}`)
    }
    console.log()
  }

  // ── Falhas ──────────────────────────────────────────────────────
  const failed = rows.filter((r) => r.status === 'failed').slice(0, 5)
  if (failed.length > 0) {
    console.log(`❌ Falhas (${failed.length}${rows.filter((r) => r.status === 'failed').length > 5 ? ' de ' + rows.filter((r) => r.status === 'failed').length : ''})`)
    for (const r of failed) {
      const when = r.failed_at ? formatAge(r.failed_at) : formatAge(r.received_at)
      console.log(`   ${truncate(r.id, 26)}  ${truncate(r.type, 32)}  ${when}`)
      if (r.error_message) {
        console.log(`     "${truncate(r.error_message, 70)}"`)
      }
    }
    console.log()
  }

  // ── Zombies ─────────────────────────────────────────────────────
  const zombieRows = zombies ?? []
  if (zombieRows.length > 0) {
    console.log(`🧟 Possíveis zombies (processing > ${ZOMBIE_THRESHOLD_MIN}min) — ${zombieRows.length}`)
    for (const z of zombieRows.slice(0, 5)) {
      console.log(`   ${truncate(z.id, 26)}  ${truncate(z.type, 32)}  ${formatAge(z.received_at)}`)
    }
    if (zombieRows.length > 5) {
      console.log(`   ... e mais ${zombieRows.length - 5}`)
    }
    console.log()
    console.log(`   💡 Rode: node scripts/cleanup-webhook-zombies.mjs --minutes=${ZOMBIE_THRESHOLD_MIN}`)
    console.log()
  } else {
    console.log(`🧟 Possíveis zombies: nenhum (threshold ${ZOMBIE_THRESHOLD_MIN}min)`)
    console.log()
  }
}

main()
  .then(() => { process.exitCode = 0 })
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : String(err)}`)
    process.exitCode = 1
  })
