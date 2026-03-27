#!/usr/bin/env node
/**
 * NexoPro — Setup Automatizado Completo
 * ======================================
 * O que este script faz:
 *   1. Resolve projeto Supabase (cria novo OU usa existente via NEXOPRO_SUPABASE_URL)
 *   2. Aguarda o projeto ficar pronto (só se criou novo)
 *   3. Obtém API keys (Management API ou usa as fornecidas em secrets)
 *   4. Aplica todas as migrations (001-007) via Management API
 *   5. Cria .env.local com todas as credenciais
 *   6. Adiciona vars faltantes no Vercel + faz deploy
 *   7. Adiciona credencial Supabase NexoPro ao n8n + importa workflow
 *
 * Pré-requisitos:
 *   npm i -g vercel
 *   Preencher scripts/setup-secrets.json
 *
 * Uso:
 *   npm run setup
 *
 * Se o projeto Supabase já existe:
 *   Preencha NEXOPRO_SUPABASE_URL + NEXOPRO_SUPABASE_SERVICE_KEY em setup-secrets.json
 *   O script pula a criação e vai direto para as migrations.
 */

import { execSync, spawnSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const green  = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red    = (s) => `\x1b[31m${s}\x1b[0m`
const bold   = (s) => `\x1b[1m${s}\x1b[0m`
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`

const log   = (msg) => console.log(green(`✅ ${msg}`))
const warn  = (msg) => console.log(yellow(`⚠️  ${msg}`))
const info  = (msg) => console.log(cyan(`ℹ️  ${msg}`))
const step  = (msg) => console.log(bold(`\n▶ ${msg}`))
const fail  = (msg) => { console.error(red(`❌ ${msg}`)); process.exit(1) }

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function supabaseMgmt(path, method = 'GET', body = null, token) {
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN é necessário para esta operação')
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

async function n8nApi(path, method = 'GET', body = null, baseUrl, apiKey) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`n8n API ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

// Extrai o ref do projeto a partir da URL: https://abcdef1234.supabase.co → abcdef1234
function extractRef(url) {
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/)
  if (!match) throw new Error(`URL Supabase inválida: "${url}". Esperado: https://xxxxx.supabase.co`)
  return match[1]
}

// ─── Carregar secrets ─────────────────────────────────────────────────────────

const secretsPath = join(__dirname, 'setup-secrets.json')
if (!existsSync(secretsPath)) {
  fail(
    'Arquivo scripts/setup-secrets.json não encontrado.\n' +
    '  → Copie setup-secrets.example.json para setup-secrets.json e preencha.'
  )
}

const s = JSON.parse(readFileSync(secretsPath, 'utf8'))

// Secrets — Supabase Management API (para criar projeto novo ou aplicar migrations)
const SUPABASE_TOKEN   = s.SUPABASE_ACCESS_TOKEN || ''
const SUPABASE_ORG     = s.SUPABASE_ORG_ID || ''

// Secrets — Projeto existente (pula criação se fornecido)
const EXISTING_URL     = (s.NEXOPRO_SUPABASE_URL || '').trim()
const EXISTING_SVC_KEY = (s.NEXOPRO_SUPABASE_SERVICE_KEY || '').trim()
const EXISTING_ANON    = (s.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

// Secrets — Outros serviços
const ANTHROPIC_KEY    = s.ANTHROPIC_API_KEY || ''
const N8N_KEY          = s.N8N_API_KEY || ''
const N8N_URL          = s.N8N_URL || 'https://automacao.db8intelligence.com.br'
const DB8_URL          = s.DB8_AGENT_URL || 'https://api.db8intelligence.com.br'
const N8N_WEBHOOK_TOK  = s.N8N_WEBHOOK_TOKEN || 'nexopro-webhook-secret'
const STRIPE_SK        = s.STRIPE_SECRET_KEY || ''
const STRIPE_PK        = s.STRIPE_PUBLISHABLE_KEY || ''
const RESEND_KEY       = s.RESEND_API_KEY || ''
const FAL_KEY          = s.FAL_KEY || ''
const ELEVEN_KEY       = s.ELEVENLABS_API_KEY || ''

// Validações mínimas
if (!ANTHROPIC_KEY) fail('ANTHROPIC_API_KEY é obrigatório em setup-secrets.json')
if (!EXISTING_URL && !SUPABASE_TOKEN) fail('Forneça SUPABASE_ACCESS_TOKEN (para criar projeto novo) OU NEXOPRO_SUPABASE_URL (projeto existente)')
if (!EXISTING_URL && !SUPABASE_ORG)   fail('SUPABASE_ORG_ID é obrigatório quando não há NEXOPRO_SUPABASE_URL')

const modoExistente = Boolean(EXISTING_URL)

console.log(bold('\n╔══════════════════════════════════════════╗'))
console.log(bold('║   NexoPro — Setup Automatizado Completo  ║'))
console.log(bold('╚══════════════════════════════════════════╝'))
if (modoExistente) {
  info(`Modo: PROJETO EXISTENTE (${EXISTING_URL})`)
} else {
  info('Modo: CRIAR PROJETO NOVO no Supabase')
}

// ─── PASSO 1: Resolver projeto Supabase ──────────────────────────────────────

step('1/7 — Resolvendo projeto Supabase...')

let project    // { ref: string, name: string }
let projetoCriado = false

if (modoExistente) {
  // Usar projeto existente
  const ref = extractRef(EXISTING_URL)
  project = { ref, name: 'nexopro' }
  log(`Usando projeto existente → ref: ${ref}`)

  // Verificar se está acessível via Management API
  if (SUPABASE_TOKEN) {
    try {
      const p = await supabaseMgmt(`/projects/${ref}`, 'GET', null, SUPABASE_TOKEN)
      log(`Status no Supabase: ${p.status}`)
      project.name = p.name || 'nexopro'
    } catch (e) {
      warn(`Não foi possível verificar projeto via Management API: ${e.message.slice(0, 100)}`)
      warn('Continuando com os dados fornecidos...')
    }
  }
} else {
  // Criar projeto novo
  const dbPassword = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + 'Nx1!'
  try {
    project = await supabaseMgmt('/projects', 'POST', {
      name: 'nexopro',
      organization_id: SUPABASE_ORG,
      db_pass: dbPassword,
      region: 'sa-east-1',
      plan: 'free',
    }, SUPABASE_TOKEN)
    projetoCriado = true
    log(`Projeto criado → ref: ${project.ref}`)
  } catch (e) {
    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
      warn('Projeto já existe. Buscando ref...')
      const projects = await supabaseMgmt('/projects', 'GET', null, SUPABASE_TOKEN)
      project = projects.find(p => p.name === 'nexopro')
      if (!project) fail(`Projeto "nexopro" não encontrado na org "${SUPABASE_ORG}". Verifique SUPABASE_ORG_ID.`)
      log(`Usando projeto existente → ref: ${project.ref}`)
    } else {
      fail(`Erro ao criar projeto Supabase: ${e.message}`)
    }
  }
}

// ─── PASSO 2: Aguardar projeto pronto (só se criou novo) ─────────────────────

step('2/7 — Verificando status do projeto...')

if (projetoCriado && SUPABASE_TOKEN) {
  let ready = false
  for (let i = 0; i < 40; i++) {
    const p = await supabaseMgmt(`/projects/${project.ref}`, 'GET', null, SUPABASE_TOKEN)
    if (p.status === 'ACTIVE_HEALTHY') { ready = true; break }
    process.stdout.write('.')
    await sleep(6000)
  }
  console.log('')
  if (!ready) warn('Projeto demorou para ficar pronto. Continuando mesmo assim...')
  else log('Projeto ativo!')
} else {
  log('Pulando aguardo (projeto existente ou sem access token)')
}

// ─── PASSO 3: Obter API keys ──────────────────────────────────────────────────

step('3/7 — Obtendo chaves da API...')

let anonKey    = EXISTING_ANON
let serviceKey = EXISTING_SVC_KEY
const supabaseUrl = EXISTING_URL || `https://${project.ref}.supabase.co`

if ((!anonKey || !serviceKey) && SUPABASE_TOKEN) {
  try {
    const keys = await supabaseMgmt(`/projects/${project.ref}/api-keys`, 'GET', null, SUPABASE_TOKEN)
    if (!anonKey)    anonKey    = keys.find(k => k.name === 'anon')?.api_key || ''
    if (!serviceKey) serviceKey = keys.find(k => k.name === 'service_role')?.api_key || ''
    log('Chaves obtidas via Management API')
  } catch (e) {
    warn(`Não foi possível obter chaves via API: ${e.message.slice(0, 100)}`)
  }
}

if (!anonKey) {
  warn('anon key não disponível. Adicione NEXT_PUBLIC_SUPABASE_ANON_KEY em setup-secrets.json ou forneça SUPABASE_ACCESS_TOKEN.')
}
if (!serviceKey) {
  fail('service_role key não disponível. Adicione NEXOPRO_SUPABASE_SERVICE_KEY em setup-secrets.json.')
}

log(`URL: ${supabaseUrl}`)
if (anonKey) log(`Anon key: ${anonKey.slice(0, 20)}...`)
log(`Service key: ${serviceKey.slice(0, 20)}...`)

// ─── PASSO 4: Aplicar migrations ─────────────────────────────────────────────

step('4/7 — Aplicando migrations (001–007)...')

if (!SUPABASE_TOKEN) {
  warn('SUPABASE_ACCESS_TOKEN não fornecido. Pulando migrations automáticas.')
  warn('Execute as migrations manualmente via: supabase db push (ou pelo painel Supabase → SQL Editor)')
} else {
  const migrationsDir = join(ROOT, 'supabase', 'migrations')
  const migrations = [
    '001_initial_schema.sql',
    '002_accounting_module.sql',
    '003_schema_improvements.sql',
    '004_imob_module.sql',
    '005_content_ai.sql',
    '006_billing.sql',
    '007_stock_courses.sql',
  ]

  for (const file of migrations) {
    const filePath = join(migrationsDir, file)
    if (!existsSync(filePath)) { warn(`Pulando (não encontrado): ${file}`); continue }
    const sql = readFileSync(filePath, 'utf8')
    try {
      await supabaseMgmt(
        `/projects/${project.ref}/database/query`,
        'POST',
        { query: sql },
        SUPABASE_TOKEN
      )
      log(`Aplicada: ${file}`)
    } catch (e) {
      // Erros "already exists" são normais em re-execuções
      const msg = e.message.slice(0, 150)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        info(`Já aplicada (idempotente): ${file}`)
      } else {
        warn(`${file}: ${msg}`)
      }
    }
    await sleep(500)
  }
}

// ─── PASSO 5: Criar .env.local ───────────────────────────────────────────────

step('5/7 — Criando .env.local...')
const envLocal = `# ============================================================
# NexoPro — .env.local
# Gerado automaticamente em ${new Date().toISOString()}
# NUNCA commitar este arquivo
# ============================================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}

# Anthropic
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# Railway services
DB8_AGENT_URL=${DB8_URL}
N8N_WEBHOOK_TOKEN=${N8N_WEBHOOK_TOK}

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NexoPro

# Stripe (preencher quando ativar)
STRIPE_SECRET_KEY=${STRIPE_SK}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PK}
STRIPE_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=${RESEND_KEY}

# ContentAI
FAL_KEY=${FAL_KEY}
ELEVENLABS_API_KEY=${ELEVEN_KEY}
`
writeFileSync(join(ROOT, '.env.local'), envLocal)
log('.env.local criado')

// ─── PASSO 6: Configurar Vercel ───────────────────────────────────────────────

step('6/7 — Configurando variáveis no Vercel + deploy...')

// Todas as vars que devem existir no Vercel
const vercelEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL:          supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:     anonKey,
  SUPABASE_SERVICE_ROLE_KEY:         serviceKey,
  ANTHROPIC_API_KEY:                 ANTHROPIC_KEY,
  DB8_AGENT_URL:                     DB8_URL,
  N8N_WEBHOOK_TOKEN:                 N8N_WEBHOOK_TOK,
  NEXT_PUBLIC_APP_NAME:              'NexoPro',
  ...(STRIPE_SK   && { STRIPE_SECRET_KEY:                    STRIPE_SK }),
  ...(STRIPE_PK   && { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:   STRIPE_PK }),
  ...(RESEND_KEY  && { RESEND_API_KEY:                       RESEND_KEY }),
  ...(FAL_KEY     && { FAL_KEY }),
  ...(ELEVEN_KEY  && { ELEVENLABS_API_KEY:                   ELEVEN_KEY }),
}

let deployUrl = ''
try {
  // Adicionar/atualizar cada env var no Vercel (production)
  // --force sobrescreve se já existir; sem --force pode pedir confirmação
  for (const [key, value] of Object.entries(vercelEnvVars)) {
    if (!value) continue
    const r = spawnSync(
      'vercel',
      ['env', 'add', key, 'production'],
      { input: value + '\n', encoding: 'utf8', cwd: ROOT, timeout: 30000 }
    )
    if (r.status === 0) {
      info(`  Var adicionada: ${key}`)
    } else {
      // Tentar com --force se já existe
      const r2 = spawnSync(
        'vercel',
        ['env', 'rm', key, 'production', '--yes'],
        { encoding: 'utf8', cwd: ROOT, timeout: 15000 }
      )
      spawnSync(
        'vercel',
        ['env', 'add', key, 'production'],
        { input: value + '\n', encoding: 'utf8', cwd: ROOT, timeout: 30000 }
      )
      info(`  Var atualizada: ${key}`)
    }
  }
  log('Variáveis de ambiente configuradas no Vercel')

  // Deploy
  const result = spawnSync('vercel', ['--prod', '--yes'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  })
  const output = (result.stdout || '') + (result.stderr || '')
  const urlMatch = output.match(/https:\/\/[a-z0-9\-]+\.vercel\.app/)
  deployUrl = urlMatch ? urlMatch[0] : ''
  log(`Deploy concluído → ${deployUrl || 'verificar no painel Vercel'}`)

  // Atualizar NEXT_PUBLIC_APP_URL com a URL real
  if (deployUrl) {
    const r = spawnSync(
      'vercel',
      ['env', 'rm', 'NEXT_PUBLIC_APP_URL', 'production', '--yes'],
      { encoding: 'utf8', cwd: ROOT, timeout: 15000 }
    )
    spawnSync('vercel', ['env', 'add', 'NEXT_PUBLIC_APP_URL', 'production'], {
      input: deployUrl + '\n',
      encoding: 'utf8',
      cwd: ROOT,
      timeout: 30000,
    })
    log(`NEXT_PUBLIC_APP_URL → ${deployUrl}`)
  }
} catch (e) {
  warn(`Vercel: ${e.message}\n  → Execute manualmente: vercel --prod`)
}

// ─── PASSO 7: Configurar n8n ──────────────────────────────────────────────────

step('7/7 — Configurando n8n...')

if (!N8N_KEY) {
  warn('N8N_API_KEY não fornecida. Pulando configuração do n8n.')
  warn('Para configurar manualmente: importe scripts/n8n-nexopro-workflow.json no n8n.')
} else {
  try {
    // Criar credencial Supabase NexoPro no n8n
    let credId
    try {
      const cred = await n8nApi('/credentials', 'POST', {
        name: 'Supabase NexoPro',
        type: 'supabaseApi',
        data: {
          host: supabaseUrl,
          serviceRole: serviceKey,
        },
      }, N8N_URL, N8N_KEY)
      credId = cred.id
      log(`Credencial n8n criada → ID: ${credId}`)
    } catch (e) {
      // Pode já existir
      warn(`Credencial n8n: ${e.message.slice(0, 100)}`)
      // Tentar buscar existente
      try {
        const creds = await n8nApi('/credentials?type=supabaseApi', 'GET', null, N8N_URL, N8N_KEY)
        const existing = (creds.data || creds).find(c => c.name === 'Supabase NexoPro')
        if (existing) { credId = existing.id; info(`Usando credencial existente → ID: ${credId}`) }
      } catch {}
    }

    // Importar workflow
    const wfPath = join(__dirname, 'n8n-nexopro-workflow.json')
    if (existsSync(wfPath) && credId) {
      const workflow = JSON.parse(readFileSync(wfPath, 'utf8'))

      // Atualizar referências de credenciais e webhook path único
      workflow.nodes = workflow.nodes.map(node => {
        if (node.credentials?.supabaseApi) {
          node.credentials.supabaseApi = { id: credId, name: 'Supabase NexoPro' }
        }
        if (node.type === 'n8n-nodes-base.webhook' && node.parameters?.httpMethod) {
          node.parameters.path = `nexopro-content-${project.ref.slice(0, 6)}`
        }
        // Injetar chave Anthropic no nó HTTP
        if (node.type === 'n8n-nodes-base.httpRequest' && node.parameters?.url?.includes('anthropic')) {
          node.parameters.headerParameters = {
            parameters: [
              { name: 'x-api-key', value: ANTHROPIC_KEY },
              { name: 'anthropic-version', value: '2023-06-01' },
              { name: 'content-type', value: 'application/json' },
            ],
          }
        }
        return node
      })

      const created = await n8nApi('/workflows', 'POST', workflow, N8N_URL, N8N_KEY)
      log(`Workflow criado → ID: ${created.id}`)

      // Ativar workflow
      await n8nApi(`/workflows/${created.id}/activate`, 'POST', {}, N8N_URL, N8N_KEY)
      log('Workflow ativado!')

      // Salvar webhook URL no .env.local
      const webhookPath = `nexopro-content-${project.ref.slice(0, 6)}`
      const webhookUrl  = `${N8N_URL}/webhook/${webhookPath}`
      const currentEnv  = readFileSync(join(ROOT, '.env.local'), 'utf8')
      writeFileSync(
        join(ROOT, '.env.local'),
        currentEnv + `\n# n8n ContentAI Webhook (gerado pelo setup)\nN8N_CONTENT_WEBHOOK_URL=${webhookUrl}\n`
      )
      log(`Webhook URL: ${webhookUrl}`)

      // Adicionar ao Vercel também
      spawnSync('vercel', ['env', 'rm', 'N8N_CONTENT_WEBHOOK_URL', 'production', '--yes'], {
        encoding: 'utf8', cwd: ROOT, timeout: 15000,
      })
      spawnSync('vercel', ['env', 'add', 'N8N_CONTENT_WEBHOOK_URL', 'production'], {
        input: webhookUrl + '\n', encoding: 'utf8', cwd: ROOT, timeout: 30000,
      })
      log('N8N_CONTENT_WEBHOOK_URL adicionada ao Vercel')
    } else if (!credId) {
      warn('Não foi possível criar/encontrar credencial n8n. Importe o workflow manualmente.')
    }
  } catch (e) {
    warn(`n8n: ${e.message.slice(0, 150)}`)
    warn('Configure o n8n manualmente importando scripts/n8n-nexopro-workflow.json')
  }
}

// ─── Salvar resultado ─────────────────────────────────────────────────────────

const result = {
  gerado_em:    new Date().toISOString(),
  modo:         modoExistente ? 'projeto_existente' : 'projeto_criado',
  supabase: {
    url:      supabaseUrl,
    ref:      project.ref,
    anon_key: anonKey ? anonKey.slice(0, 20) + '...' : 'não disponível',
  },
  vercel_url:   deployUrl || 'ver painel Vercel',
  env_local:    join(ROOT, '.env.local'),
}
writeFileSync(join(__dirname, 'setup-result.json'), JSON.stringify(result, null, 2))

// ─── Sumário ──────────────────────────────────────────────────────────────────

console.log(bold('\n╔══════════════════════════════════════════════════════════════╗'))
console.log(bold('║               NexoPro Setup Concluído! 🚀                   ║'))
console.log(bold('╠══════════════════════════════════════════════════════════════╣'))
console.log(`║  Supabase URL:   ${supabaseUrl.padEnd(44)}║`)
console.log(`║  Supabase Ref:   ${project.ref.padEnd(44)}║`)
console.log(`║  Deploy URL:     ${(deployUrl || 'ver painel Vercel').padEnd(44)}║`)
console.log(`║  .env.local:     ${green('✅ criado').padEnd(53)}║`)
console.log(`║  Migrations:     ${(SUPABASE_TOKEN ? green('✅ 007 aplicadas') : yellow('⚠️  manual')).padEnd(53)}║`)
console.log(`║  n8n:            ${(N8N_KEY ? green('✅ configurado') : yellow('⚠️  pular')).padEnd(53)}║`)
console.log(bold('╠══════════════════════════════════════════════════════════════╣'))
console.log(bold('║  PRÓXIMOS PASSOS:                                            ║'))
console.log('║  1. Testar localmente: npm run dev                            ║')
console.log('║  2. Criar webhook Stripe → cole em STRIPE_WEBHOOK_SECRET      ║')
console.log('║  3. Adicionar domínios customizados no Vercel                  ║')
console.log('║  4. Ativar Supabase Auth → Email provider                     ║')
console.log(bold('╚══════════════════════════════════════════════════════════════╝\n'))
