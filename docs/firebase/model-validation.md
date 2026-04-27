# Firebase V2 — Model Validation

> **Status:** validação de design. **Não aplicado.** Regras Firestore/Storage continuam `deny-all`. Nenhum documento foi criado. App V1 (Supabase) inalterado.

Valida o [data model proposto](data-model.md) contra 3 fluxos reais do V1: cadastro/onboarding, geração de reel, e billing webhook. Identifica reads/writes, ACL, riscos e lacunas — propõe ajustes pontuais ao data-model.

---

## Fluxo 1 — Cadastro / onboarding de tenant

### Comportamento V1 (Supabase, hoje)

User entra em `/cadastro` → cria conta (email/senha ou Google OAuth) → escolhe nicho → informa nome do negócio + WhatsApp → escolhe plano (default `trial`) → `setupTenant()` executa transaction Postgres criando: `tenants`, `profiles`, `tenant_settings`, `tenant_modules`, `contas_bancarias` (caixa default) → redirect `/dashboard`.

### Sequência V2 proposta

```
[Client]                       [Firebase Auth]      [Cloud Function]      [Firestore]
   │                                  │                    │                   │
   │── signUp(email, pw) ────────────▶│                    │                   │
   │◀──── { uid, idToken } ───────────│                    │                   │
   │                                  │                    │                   │
   │── set users/{uid} (self) ────────────────────────────────────────────────▶│  [✓ rules: isSelf]
   │                                  │                    │                   │
   │── createTenantWithOwner(payload) ───────────────────▶ │                   │
   │                                  │                    │── txn:            │
   │                                  │                    │   reserve slug   ─▶  slugs/{slug}
   │                                  │                    │   create tenant  ─▶  tenants/{tid}
   │                                  │                    │   create memb    ─▶  memberships/{uid}__{tid}
   │                                  │                    │   audit log      ─▶  audit_logs/{lid}
   │                                  │                    │                   │
   │                                  │◀── setCustomUserClaims(uid, …) ────────│
   │                                  │                    │                   │
   │◀──── { tenantId } ──────────────────────────────────── │                   │
   │                                                                            │
   │── user.getIdToken(true) ─────────▶│                                        │
   │◀──── refreshed token w/ tenants:[…], roles:{…} ─────                       │
   │                                                                            │
   │── update users/{uid}.defaultTenantId (self) ────────────────────────────▶  │
```

### Reads

| Doc | Quando | Quem |
|---|---|---|
| `users/{uid}` | self read após signup | client |
| `slugs/{slug}` | dentro da transaction (verificar disponibilidade) | server |

### Writes

| Doc | Operação | Quem | Notas |
|---|---|---|---|
| `users/{uid}` | create + update (defaultTenantId) | client | rules: `isSelf` |
| `slugs/{slug}` | create | server (Cloud Function, dentro de transaction) | **nova collection sugerida** |
| `tenants/{tid}` | create | server | server-only (rules) |
| `memberships/{uid}__{tid}` | create | server | server-only |
| `audit_logs/{lid}` | create | server | server-only; `action=tenant.created` |
| Custom claims (`tenants`, `roles`) | setCustomUserClaims | server | via Admin SDK |

### Regras Firestore necessárias

- `users/{uid}`: `allow create, update: if isSelf(uid)` (limitando campos via `hasOnly`)
- `slugs/{slug}`: `allow read: if isAuth()` (para checar disponibilidade pré-call); `allow write: if false`
- `tenants`, `memberships`, `audit_logs`: write server-only (já no design)

### Riscos custo/performance

- **Slug uniqueness**: query `where('slug','==',...)` resolve, mas tem race condition. Solução com transaction reservando `slugs/{slug}` é segura
- **Custom claims sync**: máximo ~1KB no token JWT — limite de ~10-20 tenants por user. Aceitável para SaaS (user típico tem 1-2 tenants)
- **Token refresh** explícito é UX-impactante (1-2s). Aceitável após signup
- **Cold start de Cloud Function**: ~500ms-2s. Crítico em primeira impressão; considerar Cloud Run em vez de Cloud Function se latência importar

### Lacunas detectadas

| # | Lacuna | Severidade | Ajuste recomendado |
|---|---|---|---|
| 1.1 | Firestore não tem **unique constraint** nativo (slug duplicado é race condition) | alto | Adicionar collection **`slugs/{slug}`** com referência a `tenantId`; usar Firestore transaction para reservar+criar atomicamente |
| 1.2 | `users/{uid}` precisa existir antes de qualquer ação; se Auth user existe mas Firestore doc não, app quebra | médio | Cloud Function trigger **`functions.auth.user().onCreate(...)`** que cria `users/{uid}` automaticamente |
| 1.3 | Onboarding pode falhar entre `tenants.create` e `memberships.create` — fica órfão | crítico | Cloud Function deve usar **`db.runTransaction()`** englobando todos os writes |
| 1.4 | Token claims fora-de-sincronia se Cloud Function falha após criar memberships mas antes de `setCustomUserClaims` | médio | Tornar a sync de claims **idempotente**, executável a partir de trigger `onWrite` em `memberships` (recupera estado se função primária falhar) |

---

## Fluxo 2 — Geração de reel/conteúdo com IA

### Comportamento V1 (Supabase, hoje)

User no tenant T navega para `/conteudo` → insere link/texto/nicho → click "Gerar". Cliente chama `/api/content-ai/analyze` (passa por `guardAICall` rate limit + plan gate). Backend chama Anthropic, retorna `analysis`. Cliente chama `/api/content-ai/generate-package` → múltiplas chamadas Fal.ai + ElevenLabs/OpenAI TTS → FFmpeg assembly no db8-agent → URL final retornada. Status persistido em `content_projects` row.

### Sequência V2 proposta

```
[Client]                      [Cloud Run worker]               [Firestore]              [Storage]      [External APIs]
   │                                  │                            │                       │              │
   │── create job (member) ───────────────────────────────────────▶│  [✓ rules: member, userId==self, status=pending]
   │                                  │                            │                       │              │
   │── POST /jobs/{id}/start ────────▶│                            │                       │              │
   │                                  │── read tenants/{tid} ─────▶│                       │              │
   │                                  │── count ai_usage today ───▶│  [rate limit gate]    │              │
   │                                  │── update job.status='analyzing' ▶                  │              │
   │                                  │                                                                 ▶│ Anthropic
   │                                  │── update job.analysis, status='generating' ▶                    │              │
   │                                  │── create ai_usage/{uid} ──▶│                       │              │
   │                                  │   for each scene:                                              ▶│ Fal.ai
   │                                  │      upload PNG ──────────────────────────────────────────────▶│              │
   │                                  │      update job.scenes[i] ▶│                       │              │
   │                                  │   upload audio ────────────────────────────────────────────────▶│              │
   │                                  │   FFmpeg assembly via db8-agent ─────────────────────────────────────────────▶│
   │                                  │── update job.videoUrl, status='complete' ▶                      │              │
   │                                  │                            │                       │              │
   │◀── onSnapshot job updates ───────────────────────────────────│                       │              │
```

### Reads

| Doc | Quando | Quem | Frequência |
|---|---|---|---|
| `tenants/{tid}` | start (plan check) | server | 1× por job |
| `ai_usage` (count agregado) | start (rate limit) + cada chamada IA | server | 3-5× por job |
| `memberships/{uid}__{tid}` ou claim | rules check | implícito | dezenas (cada read/write) |
| `content_jobs/{jid}` | onSnapshot UI | client | 1 read por update do server |

### Writes

| Doc | Operação | Quem | Notas |
|---|---|---|---|
| `content_jobs/{jid}` | create | client | rules: member && userId==self && status=='pending' |
| `content_jobs/{jid}` | update | server | client **não pode** mudar status/analysis/results |
| `ai_usage/{uid}` | create | server | 1 por chamada externa |
| `assets/{aid}` | create | server | refs aos uploads em Storage |
| `audit_logs/{lid}` | create | server | só em failures críticas |
| Storage `tenants/{tid}/content_jobs/{jid}/...` | upload | server | via Admin SDK |

### Regras necessárias

- `content_jobs.create`: `if isMember(tid) && request.resource.data.userId == request.auth.uid && request.resource.data.status == 'pending'`
- `content_jobs.update / delete`: `if false` (server-only after creation)
- `ai_usage`: write server-only
- Storage `tenants/{tid}/content_jobs/**`: write server-only

### Riscos custo/performance

- **Rate limit count agregado** com `count()` agg ou `where('createdAt','>=',startOfDay)` requer índice composto `(kind, createdAt)`. OK até ~1000 calls/tenant/dia; acima disso, considerar **counter doc** atualizado por trigger
- **`onSnapshot` no job** custa 1 read por update. Se backend faz 10 updates (5 scenes + analysis + voice + video + 2 status), são 10 reads/sessão ativa. Mitigação: **bundle updates** em transitions importantes apenas
- **Storage uploads** via server: bandwidth Cloud Run 1GB/min limite. Considerar uploads diretos client→Storage via signed URLs para imagens grandes
- **Cold start Cloud Run**: jobs sequenciais reaproveitam container quente; OK
- **Plan gate sem sync**: se tenant.plan muda durante geração de job, gate pode estar stale. Aceitar — preço é checado no início

### Lacunas detectadas

| # | Lacuna | Severidade | Ajuste recomendado |
|---|---|---|---|
| 2.1 | **Job travado em `analyzing`/`generating`** se backend crashar | alto | Adicionar campos `lastHeartbeatAt` (server atualiza a cada N segundos) e `expireAt` (timeout); watcher Cloud Function marca como `failed` quando heartbeat para |
| 2.2 | **Sem retry policy** — se Anthropic/Fal falhar transitoriamente, job inteiro vai pra `failed` | médio | Adicionar `attempts`, `maxAttempts`, `nextAttemptAt` (mesmo padrão do `scheduled_posts` V1) |
| 2.3 | **Storage cleanup em jobs falhados** — uploads em job que terminou em `failed` ficam órfãos | médio | Storage Lifecycle policy + Cloud Function `onWrite` em jobs (status='failed') que apaga `tenants/{tid}/content_jobs/{jid}/**` |
| 2.4 | **Rate limit por count() pode ficar pesado** em alto volume | baixo (futuro) | Considerar collection `daily_usage_counters/{tid}_{date}` com `runTransaction(increment)` se passar 1000 calls/dia/tenant |
| 2.5 | **Atomicidade de update job + ai_usage** — se ai_usage foi gravado mas job update falhou, contagem fica inflada | baixo | Aceitar; rate limit é janela móvel, divergência mínima |

---

## Fluxo 3 — Billing webhook / atualização de plano

### Comportamento V1 (Supabase, hoje)

Stripe envia POST `/api/webhooks/stripe`. Route valida HMAC. Identifica tenant via `stripeCustomerId` ou `stripeSubscriptionId`. Atualiza `tenants.plan`, `tenants.stripe_subscription_id`, etc. Insere `stripe_webhook_events` para idempotency. Possível: dispara Resend email. Retorna 200.

### Sequência V2 proposta

```
[Stripe]                     [Cloud Run handler]              [Firestore]
   │                                  │                            │
   │── POST /webhook + sig ──────────▶│                            │
   │                                  │── validate HMAC            │
   │                                  │── read billing_events/{ev_id} ▶│
   │                                  │   if exists → return 200 (idempotent)
   │                                  │                            │
   │                                  │── txn:                     │
   │                                  │   read stripe_customer_index/{cusId} ▶
   │                                  │   read tenants/{tid} ─────▶│
   │                                  │   write tenants/{tid}       (plan, sub_id, trialEndsAt)
   │                                  │   write billing_events/{ev_id}  (received, payload)
   │                                  │   write audit_logs/{lid}    (action=tenant.plan_changed, before/after)
   │                                  │                            │
   │                                  │── update billing_events/{ev_id}.processedAt ▶
   │                                  │                            │
   │◀──── 200 OK ─────────────────────│                            │
```

### Reads

| Doc | Quando | Quem |
|---|---|---|
| `billing_events/{ev_id}` | idempotency check (1× no início) | server |
| `stripe_customer_index/{cusId}` | lookup tenant por customer (1×) | server |
| `tenants/{tid}` | dentro da transaction | server |

### Writes

| Doc | Operação | Quem | Notas |
|---|---|---|---|
| `billing_events/{ev_id}` | create | server | doc id = stripeEventId (idempotency natural) |
| `billing_events/{ev_id}` | update | server | `processedAt`, `outcome` |
| `tenants/{tid}` | update (campos billing-only) | server | server-only fields |
| `audit_logs/{lid}` | create | server | before/after diff |

### Regras necessárias

- `billing_events`: write server-only ✅
- `tenants` campos `plan`/`stripe*`/`trialEndsAt`: write server-only ✅ (já no design)
- `audit_logs`: write server-only ✅

### Riscos custo/performance

- **Lookup tenant por stripeCustomerId**: sem índice direcionado, exige `where('stripeCustomerId','==',cusId)` que é eficiente mas custa 1 read. Coleção dedicada **`stripe_customer_index/{cusId}`** com doc `{tenantId}` reduz para get O(1) sem índice composto
- **Race condition em webhooks concorrentes** (`subscription.updated` + `invoice.payment_succeeded` chegando simultaneamente): última escrita ganha. Solução: **transação** garantindo read-then-write atômico
- **Order of arrival**: Stripe não garante ordem. `subscription.updated` pode chegar antes de `checkout.session.completed`. State machine deve ser idempotente e converter eventos para estado final consistente (não delta)
- **Webhook timeout**: Stripe espera 200 em ≤30s. Cloud Run handler deve completar trabalho em <20s (deixar margem). Operações longas (envio de email) devem ser **enfileiradas** (Pub/Sub ou Cloud Tasks), não inline

### Lacunas detectadas

| # | Lacuna | Severidade | Ajuste recomendado |
|---|---|---|---|
| 3.1 | **Lookup tenant por stripeCustomerId** sem doc dedicado custa 1 query + lê doc | médio | Adicionar collection **`stripe_customer_index/{stripeCustomerId}`** → `{ tenantId }` para get O(1). Mantida em sync pela própria Cloud Function que cria customer no Stripe |
| 3.2 | **Falha de processamento sem retry** | médio | Adicionar campos `retryCount`, `nextRetryAt`, `lastError` em `billing_events`. Cron/scheduler reprocessa events com `outcome='error' AND nextRetryAt<=now()` |
| 3.3 | **Race condition em updates concorrentes em tenants** | médio | Documentar uso de **`db.runTransaction()`** para qualquer update de campos billing |
| 3.4 | **Email transacional inline** estoura timeout webhook | médio (futuro) | Quando Resend for ativado: enfileirar em Pub/Sub, processar via Cloud Function async — fora do escopo deste validation |
| 3.5 | **Auditoria de payload completo** em `billing_events` pode ficar grande | baixo | Stripe events ~5-50 KB; OK até ~200 events/tenant/mês. Se passar, cortar campos verbosos antes de salvar |

---

## Lacunas comuns — padrões a adotar

Três padrões resolvem ~80% das lacunas dos 3 fluxos:

### Padrão A — Shadow collections para unicidade

Firestore não tem unique constraint. Para campos que precisam ser únicos, criar collection auxiliar com o valor único como document ID:

```text
slugs/{slug}                     → { tenantId }     # garante slug único
stripe_customer_index/{cusId}    → { tenantId }     # garante customer ↔ tenant 1:1 + lookup O(1)
```

Operações com transaction garantem atomicidade:

```javascript
await db.runTransaction(async (txn) => {
  const slugDoc = await txn.get(db.doc(`slugs/${slug}`))
  if (slugDoc.exists) throw new Error('slug taken')
  txn.create(db.doc(`slugs/${slug}`), { tenantId })
  txn.create(db.doc(`tenants/${tenantId}`), { ..., slug })
  txn.create(db.doc(`memberships/${uid}__${tenantId}`), { role: 'owner', ... })
})
```

### Padrão B — Heartbeat + timeout em jobs longos

Para qualquer job que possa durar minutos (content_jobs, billing_event reprocessing):

```typescript
{
  status: 'generating',
  lastHeartbeatAt: <Timestamp>,    // server atualiza a cada 10s
  expireAt: <Timestamp>,           // createdAt + maxDuration
  attempts: 0,
  maxAttempts: 3,
  nextAttemptAt: <Timestamp>?,
}
```

Cloud Function watcher (Cloud Scheduler a cada 1min) varre jobs com `lastHeartbeatAt < now-30s AND status IN [analyzing, generating]` e marca como `failed` com `error: 'timeout'`.

### Padrão C — Transactions para writes multi-doc

Qualquer operação que crie/atualize 2+ docs relacionados deve usar `db.runTransaction()`:

| Fluxo | Multi-doc write |
|---|---|
| Onboarding | `slugs` + `tenants` + `memberships` + (claim sync) |
| Plan change | `tenants` + `audit_logs` (+ `billing_events` update) |
| Membership invite/accept | `memberships` + (claim sync) |

---

## Recomendações de ajuste em `data-model.md`

A validação revelou **6 ajustes pontuais** ao data-model. Não é rewrite — é adição de patterns descobertos:

| # | Ajuste | Onde no doc |
|---|---|---|
| 1 | Adicionar collection **`slugs`** (root, doc-id = slug, write server-only) | nova seção 10 |
| 2 | Adicionar collection **`stripe_customer_index`** (root, doc-id = stripeCustomerId, write server-only) | nova seção 11 |
| 3 | Estender `content_jobs` com `lastHeartbeatAt`, `expireAt`, `attempts`, `maxAttempts`, `nextAttemptAt` | seção 7 |
| 4 | Estender `billing_events` com `retryCount`, `nextRetryAt`, `lastError` | seção 8 |
| 5 | Documentar uso obrigatório de `runTransaction()` em writes multi-doc | princípios |
| 6 | Mencionar **Auth `onCreate` trigger** que cria `users/{uid}` automaticamente | seção 1 |

Esses ajustes serão aplicados em commit separado de `data-model.md` (resumido no relatório, sem mudar a essência do design).

---

## Cobertura ACL — checklist por fluxo

| Operação | Quem pode | Status no design |
|---|---|---|
| Signup + create users/{uid} (self) | client (isSelf) | ✅ |
| Create tenant + membership + slug reservation | server (Cloud Function txn) | ✅ |
| Read membros do meu tenant | member ativo | ✅ |
| Read próprios memberships | self | ✅ |
| Update tenant.name/branding | role admin+ | ✅ |
| Update tenant.plan/stripe* | server (webhook) | ✅ |
| Create content_job (status=pending) | member, userId=self | ✅ |
| Update content_job (status, results) | server | ✅ |
| Read content_job no meu tenant | member | ✅ (refinar: member vê só próprios? ou admin vê todos?) — decidir |
| Write ai_usage | server | ✅ |
| Read ai_usage | admin+ | ✅ |
| Process billing webhook | server (HMAC + idempotent) | ✅ |
| Read billing_events do meu tenant | role owner | ✅ |
| Read audit_logs do meu tenant | admin+ | ✅ |

Sem buracos críticos detectados nas regras conceituais propostas.

---

## Riscos remanescentes (após ajustes propostos)

| Risco | Severidade | Mitigação |
|---|---|---|
| Cold start Cloud Function em onboarding (primeira impressão UX) | médio | Considerar Cloud Run sempre-quente para handlers críticos; min-instances=1 (custo +) |
| Custom claims sync race condition (sequência: write membership → set claim) | médio | Idempotência da Cloud Function + trigger `onWrite` em memberships como backup |
| Webhook order não-determinística (Stripe) | baixo | State machine convergente — calcular estado a partir do snapshot atual da subscription via Stripe API, não aplicar deltas |
| Storage uploads custosos por roundtrip Cloud Run | médio | Signed URLs para uploads diretos client→Storage em assets grandes |
| Schema drift entre clients e backend ao longo do tempo | médio | Validators Zod compartilhados em monorepo; versionamento de schema em campo `_schemaVersion` por doc |

---

## Próximos passos

1. **Aplicar ajustes 1-6** em `data-model.md` (commit separado)
2. **Documentar Cloud Functions necessárias** em novo doc (`docs/firebase/cloud-functions.md`):
   - `auth.user().onCreate` → cria `users/{uid}`
   - `firestore.document('memberships/{id}').onWrite` → sync custom claims
   - `firestore.document('tenants/{tid}/content_jobs/{jid}').onWrite(status='failed')` → cleanup Storage
   - `pubsub.schedule('every 1 minutes').onRun` → watcher de jobs com heartbeat parado
3. **Escrever rules em `firebase/firestore.rules`** evoluindo do `deny-all` (este doc + data-model = especificação)
4. **Setup Firebase Emulator + suite de testes** de regras antes de qualquer release real
5. **Decidir** se Cloud Functions ou Cloud Run para handlers (custo cold start vs ergonomia)
