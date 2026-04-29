#!/usr/bin/env node
/**
 * NexoOmnix V2 — Firebase base provisioning
 *
 * Garante que o projeto GCP db8-nexoomnix tem uma base Firebase limpa:
 *   - Firebase associado ao projeto
 *   - Firestore Native em us-central1 (database `(default)`)
 *   - Firebase Authentication com Email/Password habilitado
 *   - Cloud Storage for Firebase com bucket default
 *   - Regras `deny-all` ativas em Firestore e Storage
 *
 * Idempotente — cada step verifica estado atual e só age se necessário.
 *
 * NÃO toca em:
 *   - app V1 (Supabase / Cloud Run nexoomnix-web)
 *   - APIs externas (Stripe, Resend, Anthropic, etc)
 *   - Web Apps no Firebase (não cria registro de app web aqui)
 *
 * Uso:
 *   node scripts/provision-firebase-base.mjs
 *
 * Override projeto (default: db8-nexoomnix):
 *   FIREBASE_PROJECT=outro-projeto node scripts/provision-firebase-base.mjs
 *
 * Override gcloud binary (Windows com path com espaços):
 *   GCLOUD_BIN="/c/Users/.../gcloud.cmd" node scripts/provision-firebase-base.mjs
 *
 * Override token (CI/CD):
 *   ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/provision-firebase-base.mjs
 *
 * Requer: gcloud autenticado (ou ACCESS_TOKEN env), Node 20+ (fetch nativo).
 */

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT = process.env.FIREBASE_PROJECT ?? 'db8-nexoomnix'
const LOCATION = 'us-central1'
const STORAGE_BUCKET = `${PROJECT}-default`
const GCLOUD = process.env.GCLOUD_BIN ?? 'gcloud'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const FIRESTORE_RULES = join(REPO_ROOT, 'firebase', 'firestore.rules')
const STORAGE_RULES = join(REPO_ROOT, 'firebase', 'storage.rules')

const REQUIRED_APIS = [
  'firebase.googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebaserules.googleapis.com',
]

// ───────────────────────────────────────────────────────────────────────────
// helpers
// ───────────────────────────────────────────────────────────────────────────

function log(stage, msg, kind = 'info') {
  const icon = { info: '→', ok: '✓', skip: '·', warn: '!', err: '✗' }[kind] ?? '→'
  console.log(`${icon} [${stage}] ${msg}`)
}

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch (e) {
    // Some gcloud wrappers (notably on Windows) emit valid stdout but exit non-zero
    // due to harmless errors during shutdown. Recover stdout when present.
    if (e.stdout && String(e.stdout).trim().length > 0) {
      return String(e.stdout).trim()
    }
    throw new Error(`Command failed: ${cmd}\n${e.stderr || e.message}`)
  }
}

let TOKEN = null
function getToken() {
  if (TOKEN) return TOKEN
  if (process.env.ACCESS_TOKEN) {
    TOKEN = process.env.ACCESS_TOKEN.trim()
    return TOKEN
  }
  TOKEN = sh(`"${GCLOUD}" auth print-access-token`)
  return TOKEN
}

async function api(method, url, body = null) {
  const headers = {
    Authorization: `Bearer ${getToken()}`,
    'X-Goog-User-Project': PROJECT,
    'Content-Type': 'application/json',
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  return { ok: res.ok, status: res.status, data }
}

async function pollOperation(opName, base) {
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await api('GET', `${base}/${opName}`)
    if (r.data?.done) {
      if (r.data.error) {
        throw new Error(`Operation failed: ${JSON.stringify(r.data.error)}`)
      }
      return r.data
    }
  }
  throw new Error(`Operation ${opName} did not complete in 120s`)
}

// ───────────────────────────────────────────────────────────────────────────
// steps
// ───────────────────────────────────────────────────────────────────────────

async function ensureApis() {
  log('apis', 'checking enabled services...')
  const raw = sh(`"${GCLOUD}" services list --enabled --project=${PROJECT} --format=json`)
  const enabled = JSON.parse(raw).map(s => s.config?.name).filter(Boolean)
  const missing = REQUIRED_APIS.filter(a => !enabled.includes(a))
  if (missing.length === 0) {
    log('apis', 'all 5 required APIs already enabled', 'skip')
    return
  }
  log('apis', `enabling: ${missing.join(', ')}`)
  for (const apiName of missing) {
    sh(`"${GCLOUD}" services enable ${apiName} --project=${PROJECT}`)
  }
  log('apis', 'waiting 30s for propagation...')
  await new Promise(r => setTimeout(r, 30000))
  log('apis', 'enabled', 'ok')
}

async function ensureFirebase() {
  log('firebase', 'checking project association...')
  const r = await api('GET', `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}`)
  if (r.ok && r.data?.projectId === PROJECT) {
    log('firebase', `Firebase already attached to '${PROJECT}'`, 'skip')
    return
  }
  if (r.status !== 404) {
    throw new Error(`Unexpected status ${r.status}: ${JSON.stringify(r.data)}`)
  }
  log('firebase', 'adding Firebase to GCP project...')
  const add = await api(
    'POST',
    `https://firebase.googleapis.com/v1beta1/projects/${PROJECT}:addFirebase`,
    { locationId: 'us-central' }
  )
  if (!add.ok) throw new Error(`addFirebase failed: ${JSON.stringify(add.data)}`)
  if (add.data?.name) {
    log('firebase', `polling operation ${add.data.name.split('/').pop()}...`)
    await pollOperation(add.data.name, 'https://firebase.googleapis.com/v1beta1')
  }
  log('firebase', 'attached', 'ok')
}

async function ensureFirestore() {
  log('firestore', 'checking database...')
  let dbs = []
  try {
    const raw = sh(`"${GCLOUD}" firestore databases list --project=${PROJECT} --format=json`)
    dbs = JSON.parse(raw)
  } catch {
    dbs = []
  }
  const defaultDb = dbs.find(d => d.name?.endsWith('/(default)'))
  if (defaultDb) {
    if (defaultDb.type === 'FIRESTORE_NATIVE') {
      log('firestore', `(default) already Native in ${defaultDb.locationId}`, 'skip')
      return
    }
    if (defaultDb.type === 'DATASTORE_MODE') {
      log('firestore', '(default) is in DATASTORE_MODE — manual fix required', 'err')
      console.error(`
   To convert, run:

     "${GCLOUD}" firestore databases delete --database='(default)' --project=${PROJECT} --quiet
     # wait ~5min for cooldown, then re-run this script

`)
      throw new Error('Firestore in wrong mode (DATASTORE_MODE); see message above')
    }
    log('firestore', `(default) exists with unexpected type ${defaultDb.type}`, 'warn')
    return
  }
  log('firestore', `creating Native database in ${LOCATION}...`)
  sh(
    `"${GCLOUD}" firestore databases create --project=${PROJECT} --location=${LOCATION} --type=firestore-native --database='(default)'`
  )
  log('firestore', 'created', 'ok')
}

async function ensureAuth() {
  log('auth', 'checking Identity Platform config...')
  let r = await api(
    'GET',
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`
  )
  if (r.status === 404) {
    log('auth', 'initializing Identity Platform...')
    const projectNumber = sh(
      `"${GCLOUD}" projects describe ${PROJECT} --format=value(projectNumber)`
    )
    const init = await api(
      'POST',
      `https://identitytoolkit.googleapis.com/v2/projects/${projectNumber}/identityPlatform:initializeAuth`,
      {}
    )
    if (!init.ok) throw new Error(`initializeAuth failed: ${JSON.stringify(init.data)}`)
    r = await api(
      'GET',
      `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config`
    )
  }
  if (!r.ok) throw new Error(`Auth config GET failed: ${JSON.stringify(r.data)}`)
  if (r.data?.signIn?.email?.enabled === true) {
    log('auth', 'Email/Password already enabled', 'skip')
    return
  }
  log('auth', 'enabling Email/Password...')
  const patch = await api(
    'PATCH',
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
    { signIn: { email: { enabled: true, passwordRequired: true } } }
  )
  if (!patch.ok) throw new Error(`PATCH config failed: ${JSON.stringify(patch.data)}`)
  log('auth', 'enabled', 'ok')
}

async function ensureStorage() {
  log('storage', `checking Firebase Storage bucket gs://${STORAGE_BUCKET}...`)
  const list = await api(
    'GET',
    `https://firebasestorage.googleapis.com/v1beta/projects/${PROJECT}/buckets`
  )
  const linked = (list.data?.buckets ?? []).find(b => b.name?.endsWith(`/${STORAGE_BUCKET}`))
  if (linked) {
    log('storage', `${STORAGE_BUCKET} already linked to Firebase`, 'skip')
    return
  }
  // Cloud Storage bucket may exist but not yet linked.
  let inGcs = false
  try {
    sh(
      `"${GCLOUD}" storage buckets describe gs://${STORAGE_BUCKET} --project=${PROJECT} --format=value(name)`
    )
    inGcs = true
  } catch {
    inGcs = false
  }
  if (!inGcs) {
    log('storage', `creating Cloud Storage bucket gs://${STORAGE_BUCKET} (${LOCATION})...`)
    sh(
      `"${GCLOUD}" storage buckets create gs://${STORAGE_BUCKET} --project=${PROJECT} --location=${LOCATION} --uniform-bucket-level-access`
    )
  } else {
    log('storage', 'GCS bucket exists but not linked to Firebase — linking...', 'warn')
  }
  const link = await api(
    'POST',
    `https://firebasestorage.googleapis.com/v1beta/projects/${PROJECT}/buckets/${STORAGE_BUCKET}:addFirebase`,
    {}
  )
  if (!link.ok) throw new Error(`addFirebase storage failed: ${JSON.stringify(link.data)}`)
  log('storage', 'linked', 'ok')
}

/** Cria um ruleset com `content` e o associa ao `releaseName` (criando ou atualizando). */
async function applyRuleset(label, releaseName, rulesContent, fileName) {
  const create = await api(
    'POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`,
    { source: { files: [{ name: fileName, content: rulesContent }] } }
  )
  if (!create.ok) throw new Error(`${label} ruleset create failed: ${JSON.stringify(create.data)}`)
  const rulesetName = create.data.name
  log('rules', `${label} ruleset created: ${rulesetName.split('/').pop()}`)

  // Try POST first (creates new release); on 409 (exists), PATCH update.
  const post = await api(
    'POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`,
    { name: `projects/${PROJECT}/releases/${releaseName}`, rulesetName }
  )
  if (post.ok) {
    log('rules', `${label} release created (${releaseName})`, 'ok')
    return
  }
  if (post.status !== 409) {
    throw new Error(`${label} release create failed: ${JSON.stringify(post.data)}`)
  }
  // Already exists — update it
  const upd = await api(
    'PATCH',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/${releaseName}?updateMask=rulesetName`,
    {
      release: {
        name: `projects/${PROJECT}/releases/${releaseName}`,
        rulesetName,
      },
    }
  )
  if (!upd.ok) throw new Error(`${label} release update failed: ${JSON.stringify(upd.data)}`)
  log('rules', `${label} release updated (${releaseName})`, 'ok')
}

async function applyRules() {
  if (!existsSync(FIRESTORE_RULES)) {
    throw new Error(`Missing rules file: ${FIRESTORE_RULES}`)
  }
  if (!existsSync(STORAGE_RULES)) {
    throw new Error(`Missing rules file: ${STORAGE_RULES}`)
  }
  await applyRuleset(
    'firestore',
    'cloud.firestore',
    readFileSync(FIRESTORE_RULES, 'utf8'),
    'firestore.rules'
  )
  await applyRuleset(
    'storage',
    `firebase.storage/${STORAGE_BUCKET}`,
    readFileSync(STORAGE_RULES, 'utf8'),
    'storage.rules'
  )
}

// ───────────────────────────────────────────────────────────────────────────
// main
// ───────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nFirebase base provisioning — project: ${PROJECT}\n`)
  await ensureApis()
  await ensureFirebase()
  await ensureFirestore()
  await ensureAuth()
  await ensureStorage()
  await applyRules()
  console.log(`\n✓ Firebase base ready in ${PROJECT} (${LOCATION}).`)
  console.log(`  Validate at: https://console.firebase.google.com/project/${PROJECT}/overview\n`)
}

main().catch(err => {
  console.error(`\n✗ FAILED: ${err.message}`)
  process.exit(1)
})
