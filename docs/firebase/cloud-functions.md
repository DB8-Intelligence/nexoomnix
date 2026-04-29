# Firebase V2 — Cloud Functions / Run Handlers Design

> **Status:** design. **Não implementado.** Nenhuma função foi criada. Nenhum código foi escrito. Regras Firestore/Storage continuam `deny-all`. App V1 (Supabase) inalterado.

Define os handlers server-side necessários para implementar o [data model V2](data-model.md) com os ajustes da [validation](model-validation.md). Cada handler é especificado em **trigger, inputs, reads, writes, idempotência, retry, riscos** — sem código.

---

## Princípios

1. **Server-only writes em dados sensíveis** — Admin SDK no backend bypassa regras Firestore. Único caminho legítimo para escrever em `memberships`, `ai_usage`, `billing_events`, `audit_logs`, e em campos críticos de `tenants` (`plan`, `stripe*`, `trialEndsAt`)
2. **Idempotência por design** — todo handler que pode ser invocado múltiplas vezes (triggers, webhooks externos, retries) deve ser idempotente. Não confiar em "vai rodar uma vez só"
3. **Transações para writes multi-doc** — `db.runTransaction()` em qualquer operação que crie/atualize 2+ docs relacionados (princípio 8 do [data-model](data-model.md))
4. **Single Responsibility por handler** — uma função, um propósito. Composição via Pub/Sub ou Eventarc para fluxos complexos
5. **Observability mínima viável** — toda função emite log estruturado em entry/exit + erro. Cloud Logging coleta automaticamente

---

## Cloud Functions vs Cloud Run — quando usar cada

Cloud Functions Gen 2 roda em cima de Cloud Run, mas a interface é diferente:

| Aspecto | Cloud Functions | Cloud Run |
|---|---|---|
| **Triggers automáticos** Firestore/Auth/Storage/Scheduler | ✅ nativo | ❌ requer Eventarc + Pub/Sub manual |
| **HTTP endpoints customizados** | OK (1 por função) | ✅ ergonomia melhor (multi-route) |
| **Cold start** | tipicamente 500ms-2s | mesma magnitude; pode `min-instances=1` para evitar (custo +) |
| **Long-running jobs** (>9min) | limite 9min Gen 2 | até 60min com timeout config |
| **Concurrency por instance** | 1 (Gen 1), 80 (Gen 2) | configurável até 1000 |
| **Setup overhead** | menor (zero infra) | maior (Dockerfile, deploy, custom domain) |
| **Pricing** | mesmo modelo (req + GB-s + GB-out) | mesmo |
| **Deploy** | `firebase deploy --only functions` ou `gcloud functions deploy` | `gcloud run deploy --source` ou `gcloud builds submit` |

**Heurística adotada:**

- **Trigger nativo** (Auth/Firestore/Storage/Scheduler) → **Cloud Functions** (custo de setup mínimo, padrão da plataforma)
- **HTTP público sensível a cold start** (Stripe webhook que tem 30s timeout) → **Cloud Run** com `min-instances≥1`
- **Worker assíncrono longo** (geração de reel — múltiplas chamadas IA + FFmpeg) → **Cloud Run** (timeout maior, concorrência controlada)
- **Callable HTTP do client** (createTenant, etc) → **Cloud Functions callable** (auth integrada via `request.auth`, ergonomia client-side)

---

## Funções e handlers necessários

8 handlers — 6 do escopo direto + 2 derivados da [validation](model-validation.md) (jobs watcher, billing retry).

### 1. `auth-on-create`

**Tipo:** Cloud Function — trigger `functions.auth.user().onCreate(handler)`

**Propósito:** garantir que `users/{uid}` exista no Firestore após signup no Firebase Auth.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | `user` (UserRecord do Firebase Auth) |
| **Reads** | `users/{uid}` (verificar se já existe) |
| **Writes** | `users/{uid}` (create se não existir) |
| **Idempotência** | natural — `if (existsDoc) return` no início. Trigger `onCreate` só roda 1× por user em condições normais, mas re-deploy/replays são possíveis |
| **Retry** | Cloud Functions retry automático até 7 dias para erros transitórios (configurar `retry: true` no SDK) |
| **Riscos** | Falha silenciosa: se função crashar permanentemente, user fica sem doc Firestore. Mitigar com fallback: client cria `users/{uid}` se não existir (defesa em profundidade) |
| **Latência aceitável** | <2s (não bloqueante para signup) |
| **Decisão** | **Cloud Function** (trigger Auth nativo) |

---

### 2. `memberships-on-write` (claim sync)

**Tipo:** Cloud Function — trigger `functions.firestore.document('memberships/{id}').onWrite(handler)`

**Propósito:** sincronizar `request.auth.token.tenants[]` e `request.auth.token.roles{}` com membership ativos do user. Sem isso, regras Firestore que dependem de claims falham.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | `change` (before/after snapshots do membership doc), `context` |
| **Reads** | `memberships` where `userId == affected.userId AND status == 'active'` (query agregada) |
| **Writes** | `admin.auth().setCustomUserClaims(uid, { tenants: [...], roles: {...} })` |
| **Idempotência** | natural — sempre calcula estado completo a partir do snapshot atual; chamada N vezes converge no mesmo estado |
| **Retry** | retry automático em falhas transientes |
| **Riscos** | (a) Claims tem limite ~1KB JWT — user com muitos tenants pode estourar; mitigar limitando ou comprimindo. (b) Token só atualiza após `getIdToken(true)` — client deve forçar refresh após membership change |
| **Latência aceitável** | <5s (assíncrono ao membership write) |
| **Decisão** | **Cloud Function** (trigger Firestore nativo) |

---

### 3. `create-tenant` (HTTP callable) ✅ IMPLEMENTADA

**Tipo:** Cloud Function **Gen 1** HTTPS callable — [`functions/src/tenants/create-tenant.ts`](../../functions/src/tenants/create-tenant.ts)

**Propósito:** orquestrar onboarding atômico — criar tenant + reservar slug + criar membership owner — em transaction. Suporta múltiplos tenants por user.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | `{ tenantName, slug, niche? }` validados (regex slug, enum niche, length tenantName); `context.auth.uid` injetado |
| **Reads** (em txn) | `slugs/{slug}` (uniqueness) · `users/{uid}` (verificar `defaultTenantId`) |
| **Writes** (em txn) | `slugs/{slug}` create · `tenants/{tid}` create · `memberships/{uid}__{tid}` create · `users/{uid}` update (`defaultTenantId` apenas se for primeiro tenant) · `audit_logs/log_{date}_{nanoid}` create |
| **Outputs** | `{ tenantId, membershipId, isFirstTenant }` |
| **Múltiplos tenants** | Permitidos. Cada chamada cria novo tenant + membership com `role=owner`. Apenas o primeiro define `users/{uid}.defaultTenantId`; chamadas seguintes preservam o default. |
| **Pós-txn** | trigger #2 (`memberships-on-write`) sincroniza custom claims automaticamente |
| **Idempotência** | parcial — slug duplicado retorna `HttpsError('already-exists', ...)`. Mesma chamada com slug diferente cria outro tenant (intencional). |
| **Retry** | client-side: tentar de novo se conexão cair. Server: sem retry automático para callable (chamada explícita) |
| **Riscos** | (a) Slug taken é UX-impactante; cliente deve check disponibilidade pré-call (`slugs/{slug}` permite read autenticado quando rules forem evoluídas). (b) Custom claims só ficam ativos após `getIdToken(true)` no client — fluxo precisa esperar antes de redirect. (c) `users/{uid}` deve já existir (criado por `authOnCreate`) — handler retorna `failed-precondition` se ainda não foi criado. |
| **Latência observada** | ~3-5s end-to-end no smoke test |
| **Decisão** | **Cloud Function Gen 1 callable** (consistência com gotcha #3 do CLAUDE.md — Gen 2 callable via gcloud também é viável, mas mantive Gen 1 para padronizar) |

**Como chamar via REST direto** (sem Firebase Web SDK):

```bash
curl -X POST "https://us-central1-db8-nexoomnix.cloudfunctions.net/createTenant" \
  -H "Authorization: Bearer <Firebase ID Token>" \
  -H "Content-Type: application/json" \
  -d '{"data":{"tenantName":"Salão Bella","slug":"salao-bella","niche":"beleza"}}'

# Response: { "result": { "tenantId": "tnt_...", "membershipId": "...__...", "isFirstTenant": true } }
```

Para obter o ID Token sem Web App registrado: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<Browser API key>` (key auto-criada pelo Firebase em `addFirebase`, recuperada via `gcloud services api-keys get-key-string`).

---

### 4. `content-job-worker` (HTTP async)

**Tipo:** Cloud Run handler (HTTP) — invocado pelo client após criar `content_jobs/{jid}` em status `pending`

**Propósito:** processar job de geração de conteúdo IA — análise → scenes → voz → vídeo. Long-running (1-5 min típico), múltiplas chamadas externas pagas.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | `{ jobId, tenantId }` no body; `Authorization: Bearer <id token>` para validar membership |
| **Reads** | `content_jobs/{jid}` (estado atual) · `tenants/{tid}` (plan + branding) · `ai_usage` count agregado por dia (rate limit) · membership (ACL) |
| **Writes** | `content_jobs/{jid}` updates de progresso (status, analysis, scenes[], voiceUrl, videoUrl, lastHeartbeatAt, completedAt) · `ai_usage/{aid}` 1 por chamada externa · Storage uploads em `tenants/{tid}/content_jobs/{jid}/...` |
| **Idempotência** | parcial — se cliente disparar 2× para mesmo job, segundo deve detectar `status != 'pending'` no início e retornar 409 sem reprocessar |
| **Retry** | server: tentativas internas com backoff em chamadas IA (configurável via `attempts/maxAttempts/nextAttemptAt` no doc). Client: pode retomar via novo POST se job ficou em `failed` com `attempts < maxAttempts` |
| **Heartbeat** | atualiza `content_jobs/{jid}.lastHeartbeatAt = serverTimestamp()` a cada ~10s durante execução. Watcher (#5) detecta jobs travados |
| **Riscos** | (a) Cold start no primeiro request do dia: aceitar ou `min-instances=1`. (b) Cloud Run timeout máx 60min — caber em <30min com margem. (c) FFmpeg precisa servidor persistente — delegar ao db8-agent (Railway) ou rodar em sub-processo do container |
| **Latência aceitável** | resposta inicial <1s (apenas valida + dispara async); job total 1-5min visível via `onSnapshot` |
| **Decisão** | **Cloud Run** (long-running, FFmpeg, controle de concurrency, min-instances opcional) |

---

### 5. `content-job-watcher` (scheduled)

**Tipo:** Cloud Function — trigger `functions.pubsub.schedule('every 1 minutes').onRun(handler)` ou Cloud Scheduler → Cloud Run

**Propósito:** detectar jobs travados (worker crashed, timeout) e marcá-los como `failed` para liberar UX e permitir retry.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | nenhum (scheduled) |
| **Reads** | `collectionGroup('content_jobs')` where `status IN ['analyzing','generating'] AND lastHeartbeatAt < now-30s` |
| **Writes** | `content_jobs/{jid}.status = 'failed'`, `error = 'timeout: heartbeat lost'` |
| **Idempotência** | natural — query só pega jobs ainda travados; após update saem da query |
| **Retry** | scheduler invoca a cada 1 min independente; se uma execução falhar, próxima cobre |
| **Riscos** | (a) Falso positivo se tráfego espasmódico atrasar heartbeat — manter threshold ≥30s. (b) Race com worker que estava prestes a atualizar heartbeat — usar transaction com `if (lastHeartbeatAt < threshold) update` |
| **Latência aceitável** | <30s execução (varre <100 jobs travados, raro) |
| **Decisão** | **Cloud Function scheduled** (overhead mínimo) |

---

### 6. `storage-cleanup-on-job-failed`

**Tipo:** Cloud Function — trigger `functions.firestore.document('tenants/{tid}/content_jobs/{jid}').onUpdate(handler)`

**Propósito:** apagar uploads em Storage quando um job termina em `failed`, evitando arquivos órfãos custarem armazenamento indefinidamente.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | `change` (before/after do job doc) |
| **Reads** | nenhum (lê apenas o doc do trigger) |
| **Writes** | apaga `gs://db8-nexoomnix-default/tenants/{tid}/content_jobs/{jid}/**` (Cloud Storage delete recursivo) |
| **Condição** | só age se `before.status != 'failed' AND after.status == 'failed'` (transition específica) |
| **Idempotência** | natural — delete em GCS é idempotente; arquivos já apagados retornam 404 que ignoramos |
| **Retry** | retry automático Cloud Functions em falhas de I/O |
| **Riscos** | (a) Race com worker que ainda está fazendo upload na hora do `failed` — improvável mas possível; aceitar log warning. (b) Backup: complementar com **Cloud Storage Lifecycle policy** que apaga `tenants/*/content_jobs/*` mais antigos que N dias se status no Firestore não for `complete` (defesa em profundidade) |
| **Latência aceitável** | <5s |
| **Decisão** | **Cloud Function** (trigger Firestore nativo) + lifecycle como backup |

---

### 7. `billing-webhook` (HTTP)

**Tipo:** Cloud Run handler (HTTP)

**Propósito:** receber webhooks do Stripe (checkout completed, subscription updated/deleted, invoice failed) e atualizar tenant + audit + billing_events.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | POST com body raw + header `Stripe-Signature` |
| **Validação** | HMAC SHA-256 do body com `STRIPE_WEBHOOK_SECRET` (no route handler, antes de qualquer outra coisa) |
| **Reads** (em txn) | `billing_events/{stripeEventId}` (idempotency check) · `stripe_customer_index/{customerId}` (lookup tenant) · `tenants/{tid}` (estado atual) |
| **Writes** (em txn) | `billing_events/{stripeEventId}` create (com payload) · `tenants/{tid}` update campos billing · `audit_logs/{lid}` create (action=tenant.plan_changed, before/after) · `billing_events/{stripeEventId}` update `processedAt`, `outcome` |
| **Idempotência** | natural — `billing_events/{stripeEventId}` doc-id é o eventId do Stripe; primeira escrita ganha, retornos subsequentes para mesmo eventId retornam 200 sem reprocessar |
| **Retry** | Stripe retenta webhook até 3 dias se receber 5xx ou timeout. Internamente também: cron `billing-retry-cron` (#8) reprocessa events com `outcome='error'` |
| **State machine convergente** | nunca aplicar deltas — sempre buscar snapshot atual da subscription via Stripe API e calcular estado final. Webhooks chegam fora-de-ordem; só último estado importa |
| **Riscos** | (a) Cold start estoura timeout do Stripe (30s). Mitigar com `min-instances=1` no Cloud Run service. (b) Race em updates concorrentes (sub.updated + invoice.paid simultâneos) → resolver com transaction. (c) Email transacional inline pode estourar timeout — enfileirar em Pub/Sub para Cloud Function async (fora deste doc) |
| **Latência aceitável** | <10s p95 (deixar margem de 20s do timeout Stripe) |
| **Decisão** | **Cloud Run** (HTTP customizado, controle de cold start crítico, min-instances) |

---

### 8. `billing-retry-cron` (scheduled)

**Tipo:** Cloud Function — trigger `functions.pubsub.schedule('every 15 minutes').onRun(handler)`

**Propósito:** reprocessar `billing_events` que falharam (`outcome='error'`) com backoff.

| Aspecto | Detalhe |
|---|---|
| **Inputs** | nenhum (scheduled) |
| **Reads** | `billing_events` where `outcome == 'error' AND nextRetryAt <= now() AND retryCount < 5` |
| **Writes** | re-invoca lógica do `billing-webhook` (handler #7) para cada event; atualiza `retryCount`, `nextRetryAt` (backoff exponencial: 5min → 25min → 2h → 12h → 24h), `lastError` |
| **Idempotência** | natural — handler chamado é o mesmo (#7) que é idempotente por design |
| **Retry** | scheduler garante próxima execução |
| **Riscos** | (a) Loop infinito se evento sempre falhar — `retryCount < 5` corta. (b) Storm se muitos events failed simultaneamente — limit de batch (10 por execução) |
| **Latência aceitável** | <2 min execução (batch pequeno) |
| **Decisão** | **Cloud Function scheduled** |

---

## Stack proposto / monorepo structure

Sugestão de organização quando for implementar:

```text
firebase/
├── firestore.rules              # já existe (deny-all)
├── storage.rules                # já existe (deny-all)
└── firestore.indexes.json       # composite indexes (a ser criado)

functions/                       # Cloud Functions (Gen 2, TypeScript)
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                 # exports
    ├── auth/
    │   └── on-create.ts         # função 1
    ├── memberships/
    │   └── on-write.ts          # função 2
    ├── content-jobs/
    │   ├── watcher.ts           # função 5
    │   └── cleanup-failed.ts    # função 6
    └── billing/
        └── retry-cron.ts        # função 8

services/                        # Cloud Run handlers (TypeScript ou Go)
├── create-tenant/               # função 3 (callable wrapped em HTTP)
│   ├── Dockerfile
│   └── src/index.ts
├── content-job-worker/          # função 4
│   ├── Dockerfile
│   └── src/index.ts
└── billing-webhook/             # função 7
    ├── Dockerfile
    └── src/index.ts

shared/                          # código compartilhado
└── src/
    ├── schemas/                 # Zod schemas (validation client+server)
    ├── firebase-admin.ts        # singleton init
    └── types/                   # types gerados de schemas
```

`shared/` é importado tanto por `functions/` quanto por `services/` via path mapping ou monorepo (npm workspaces).

---

## Idempotency patterns gerais

Reutilizáveis em todas as funções:

### Padrão 1 — Document ID determinístico

Quando o evento externo carrega um ID natural (Stripe eventId, Firebase Auth uid), usar como document ID em Firestore. Segunda escrita falha com `ALREADY_EXISTS` ou faz no-op.

```typescript
// billing-webhook
await db.doc(`billing_events/${event.id}`).create(payload)  // throws if exists
```

### Padrão 2 — Transactional check-then-write

Para operações multi-doc:

```typescript
await db.runTransaction(async (txn) => {
  const existing = await txn.get(slugRef)
  if (existing.exists) throw HttpsError('already-exists', 'slug taken')
  txn.create(slugRef, {...})
  txn.create(tenantRef, {...})
  txn.create(membershipRef, {...})
})
```

### Padrão 3 — Convergent state from snapshot

Em vez de aplicar delta do evento, calcular estado final a partir de snapshot atual:

```typescript
// billing webhook — em vez de "subscription.updated → set plan='pro'"
// fazer: ler subscription atual via Stripe API → mapear pra plan → set
const sub = await stripe.subscriptions.retrieve(subId)
const plan = planFromPriceId(sub.items.data[0].price.id)
await tenantRef.update({ plan, stripeSubscriptionId: sub.id, ... })
```

### Padrão 4 — Conditional update via transaction

Para watcher/cleanup que podem racing com worker ativo:

```typescript
await db.runTransaction(async (txn) => {
  const job = await txn.get(jobRef)
  if (job.data().lastHeartbeatAt > thresholdMs) return  // worker still alive
  txn.update(jobRef, { status: 'failed', error: 'timeout' })
})
```

---

## Recomendação — primeira função a implementar

**`auth-on-create`** (função 1).

### Por que essa primeiro

| Critério | Razão |
|---|---|
| **Mínima superfície** | trigger Auth → 1 read + 1 write em Firestore. Zero dependências externas |
| **Valida pipeline completo** | tooling Firebase CLI/Functions, deploy, Cloud Logging, observability básica, Admin SDK init, IAM da function service account |
| **Idempotência natural** | só `if (existsDoc) return` |
| **Sem risco de side effects externos** | sem Stripe, Anthropic, Storage uploads — só Firestore |
| **Desbloqueia próximo passo** | depois de `auth-on-create` funcionando, próxima é `memberships-on-write` que tem mesmo padrão (Firestore trigger), reusa pipeline |

### Tarefas da implementação (fora do escopo deste doc)

1. `npm init` em `functions/` + setup TypeScript + Firebase Functions SDK
2. Implementar handler com schema Zod do `users` doc (validação defensiva)
3. Adicionar teste unitário com Firestore Emulator
4. Deploy em `db8-nexoomnix`: `firebase deploy --only functions:auth-on-create`
5. Smoke test: criar Firebase Auth user manualmente via Console → verificar `users/{uid}` aparece em Firestore
6. Cloud Logging entry sample: `→ [auth-on-create] uid=abc123 created users doc`

### Status de implementação

| # | Função | Status | Notas |
|---|---|---|---|
| 1 | `auth-on-create` | ✅ implementada | Gen 1 Auth trigger; cria `users/{uid}` |
| 2 | `memberships-on-write` | ✅ implementada | Gen 1 Firestore trigger; sync custom claims |
| 3 | `create-tenant` (callable) | ✅ implementada | Gen 1 HTTPS callable; onboarding atômico (txn 5 docs) |
| 4 | `content-job-worker` | ⬜ pendente | Pipeline IA (depende de #1, #2, #3) |
| 5 | `content-job-watcher` | ⬜ pendente | Defesa contra jobs travados (entra com #4) |
| 6 | `storage-cleanup-on-job-failed` | ⬜ pendente | Higiene operacional (entra com #4 ou depois) |
| 7 | `billing-webhook` | ⬜ pendente | Bloqueado até Stripe ser re-conectado em V2 (decisão pendente) |
| 8 | `billing-retry-cron` | ⬜ pendente | Junto com #7 |

---

## Próximos passos

Cada um requer decisão explícita.

1. **Decisão arquitetural macro** ainda pendente (mesmo da [validation](model-validation.md)) — Firebase V2 vai prosseguir? Em paralelo? Como migração?
2. Se prosseguir, **decisão sobre repo**: monorepo único (atual nexoomnix) ou novo repo `nexoomnix-v2`?
3. **Definir runtime das functions** — TypeScript Node 20 default; preference por Go/Python possível
4. **Setup Firebase Emulator suite** + CI tests antes de qualquer deploy real
5. **Implementar `auth-on-create`** seguindo a recomendação acima
6. **Definir Web App** Firebase (`firebase apps:create web`) — gera config do client, necessário antes do `create-tenant` callable
7. **Cost forecast** — para 100 tenants ativos, ~50k invocations/mês total (longe do free tier de 2M); custo desprezível em fase de validação
