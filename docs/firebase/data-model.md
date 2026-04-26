# Firebase V2 — Data Model Design (proposta)

> **Status:** proposta de arquitetura. **Não aplicado.** Regras Firestore/Storage continuam `deny-all`. Nenhum documento foi criado. App V1 (Supabase) inalterado.

Este documento desenha o modelo Firestore + Storage inicial para o NexoOmnix V2. Toma como base [Firebase V2 Foundation](base.md) já provisionada em `db8-nexoomnix`.

---

## Princípios

1. **Tenant isolation por `tenantId`** — toda entidade pertencente a um tenant carrega o campo, e regras + queries sempre filtram por ele
2. **Many-to-many user ↔ tenant** via collection `memberships` — um usuário pode pertencer a múltiplos tenants com roles diferentes
3. **Subcollections para escopo de tenant** — dados naturalmente isolados ficam em `tenants/{tenantId}/...` (ACL simplifica, queries não cruzam tenants por acidente)
4. **Root collections para entidades globais ou auditáveis** — `users`, `plans`, `audit_logs`, `billing_events` ficam em root para queries cross-tenant (admin) ou imutabilidade
5. **Server-side writes only para dados sensíveis** — `ai_usage`, `billing_events`, `audit_logs`, `memberships` (criação/role-change) escrevem apenas via Admin SDK em backend confiável (Cloud Functions / Cloud Run)
6. **Optimistic local reads via SDK regras-protegidas** — clients leem via Firebase SDK direto, regras garantem ACL
7. **Schema-on-read disciplinado** — Firestore não impõe schema; convenção e validação client/server compensam

---

## Estratégia multi-tenant

### Modelo: Membership-based ACL

```
┌──────────┐   N..M     ┌──────────────┐    1..N   ┌──────────┐
│  users   │ ─────────▶ │ memberships  │ ────────▶ │ tenants  │
└──────────┘            └──────────────┘           └──────────┘
                              │
                              │ role: owner | admin | member
                              │ status: active | invited | revoked
```

**Decisão:** memberships como **root collection**, não subcollection.

- Vantagem: query "de quais tenants este user é membro" é direta (`where('userId','==',uid)`)
- Vantagem: query "quais users pertencem a este tenant" é direta (`where('tenantId','==',tid)`)
- Em subcollection do user OU do tenant, só uma direção é fácil — a outra exige collection group queries
- Custo: leitura extra por request para verificar membership (mitigado por custom claims, ver abaixo)

### Custom claims (otimização de leitura)

Sincronizar claims do JWT do Firebase Auth com membership ativos:

```typescript
// Estrutura claim (limit ~1KB)
{
  tenants: ["tnt_abc", "tnt_xyz"],          // tenant IDs do user
  roles: { tnt_abc: "owner", tnt_xyz: "member" }
}
```

**Quem mantém:** Cloud Function (trigger `onWrite` em `memberships/{id}`) chama `admin.auth().setCustomUserClaims(uid, ...)`.

**Quem usa:** regras Firestore (`request.auth.token.tenants.hasAny([tenantId])`) e clients (skip lookup quando claim diz que tem acesso).

**Tradeoff:** claims só atualizam após o user re-autenticar (ou force-refresh-token). Para membership recém-criado, fluxo correto é:
1. Criar `memberships/{id}` (server-side)
2. Cloud Function atualiza claims
3. Client chama `user.getIdToken(/*forceRefresh*/ true)`

---

## Estrutura de paths

```text
/users/{userId}                                      ← perfil global
/tenants/{tenantId}                                  ← entity tenant
/memberships/{membershipId}                          ← link many-to-many

/tenants/{tenantId}/assets/{assetId}                 ← arquivos do tenant
/tenants/{tenantId}/content_jobs/{jobId}             ← jobs de IA do tenant
/tenants/{tenantId}/ai_usage/{usageId}               ← rate limit + audit por tenant

/plans/{planId}                                      ← públicos (read-all)
/billing_events/{eventId}                            ← server-only write
/audit_logs/{logId}                                  ← server-only write
```

---

## Collections (detalhe)

### 1. `users` (root)

**Propósito:** perfil global do usuário, vinculado a UID do Firebase Auth.

**Document ID:** `{firebaseUid}` (mesmo do Auth)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `email` | string | espelhado de Firebase Auth para queries |
| `displayName` | string? | nullable |
| `photoURL` | string? | URL pública |
| `defaultTenantId` | string? | qual tenant abre por padrão na UI |
| `locale` | string | ex: `pt-BR` |
| `timezone` | string | ex: `America/Bahia` |
| `marketingOptIn` | boolean | LGPD-friendly |
| `createdAt` | Timestamp | server-set |
| `updatedAt` | Timestamp | server-set |

**Índices:** `email` (single-field, automático). Composto não previsto.

**ACL (regras conceituais):**
- Read: `request.auth.uid == userId` (próprio doc apenas)
- Write: `request.auth.uid == userId` (campos limitados — não pode mudar `createdAt`); writes de `defaultTenantId` requerem que o tenant esteja em claims/memberships

**Custo/performance:** baixo. Read por sessão, write esporádico (login + perfil edit).

---

### 2. `tenants` (root)

**Propósito:** entidade legal/organizacional. Cada tenant tem plano, configurações de marca, e zero ou mais membros.

**Document ID:** `tnt_{nanoid}` ou similar (não usar `tenant.slug` para evitar conflito quando renomear)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | nome de exibição |
| `slug` | string | URL-friendly, único — `where('slug','==',...)` |
| `niche` | string | enum: `imoveis\|beleza\|tecnico\|...` (ver V1) |
| `plan` | string | `trial\|starter\|pro\|pro_plus\|pro_max\|enterprise` |
| `planPriceId` | string? | Stripe price ID quando aplicável |
| `stripeCustomerId` | string? | quando entra checkout pela primeira vez |
| `stripeSubscriptionId` | string? | sub ativa |
| `trialEndsAt` | Timestamp? | quando trial expira |
| `branding` | map | `{ primaryColor, logoUrl, brandVoice }` (subset; campos ricos podem ir em subcollection) |
| `whatsappNumber` | string? | E.164 |
| `addonTalkingObjects` | boolean | add-on flag |
| `simulateAi` | boolean | analog ao `SIMULATE_AI` env mas por tenant (debug) |
| `createdAt` / `updatedAt` | Timestamp | server-set |
| `deletedAt` | Timestamp? | soft delete |

**Índices:**
- `slug` (single, automático para `where`)
- Composto `(niche, plan)` se houver dashboards admin filtrando

**ACL:**
- Read: membership ativo OU custom claim contém o tenantId
- Write fields like `name`, `branding`, `whatsappNumber`: role `owner` ou `admin`
- Write fields críticos (`plan`, `stripe*`, `trialEndsAt`): server-only (não permitir client write)

**Custo/performance:** documento "quente" — lido em quase toda request. Considerar cache no client (`onSnapshot` com TTL local) para reduzir reads.

---

### 3. `memberships` (root)

**Propósito:** link many-to-many entre user e tenant + role.

**Document ID:** `{userId}__{tenantId}` (composto determinístico — evita duplicatas)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `userId` | string | denormalizado para query |
| `tenantId` | string | denormalizado para query |
| `role` | string | `owner\|admin\|member` |
| `status` | string | `active\|invited\|revoked` |
| `invitedBy` | string? | userId do convidante |
| `invitedAt` | Timestamp? | |
| `acceptedAt` | Timestamp? | quando user aceitou convite |
| `createdAt` / `updatedAt` | Timestamp | server-set |

**Índices:**
- Composto `(userId, status)` — listar tenants ativos de um user
- Composto `(tenantId, status)` — listar membros de um tenant
- Composto `(tenantId, role)` — encontrar owner

**ACL:**
- Read: o próprio user (`userId == auth.uid`) OU member ativo do mesmo tenant
- Write: **server-only** (apenas Admin SDK). Razão: criar `owner` em tenant errado seria escalada de privilégio. Criação via Cloud Function que valida.

**Custo/performance:** read na maioria das requests para checar role. Mitigar com custom claims (descrito acima).

---

### 4. `plans` (root)

**Propósito:** catálogo de planos disponíveis (config). Pode ficar em código (`src/lib/plan-config.ts` no V1) ou em Firestore para edição runtime.

**Document ID:** `{planKey}` — `trial`, `starter`, `pro`, etc

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | display |
| `monthlyPriceBRL` | number | em centavos |
| `monthlyPriceUSD` | number? | quando aplicável |
| `stripePriceId` | string? | live ou test |
| `features` | array<string> | flags ou keys |
| `limits` | map | `{ aiTextDay: 20, aiImageDay: 10, aiTtsDay: 5, projects: 100 }` |
| `displayOrder` | number | para ordenação na UI |
| `active` | boolean | esconder planos descontinuados sem deletar |

**Índices:** `displayOrder` (orderBy), `active` filter.

**ACL:**
- Read: público (qualquer auth ou anonymous se exposto na landing). `allow read: if true`
- Write: server-only (provavelmente nunca via client; configuração via deploy)

**Custo/performance:** baixo. Pode ser cacheado agressivamente no client.

---

### 5. `ai_usage` (subcollection de `tenants`)

**Path:** `/tenants/{tenantId}/ai_usage/{usageId}`

**Propósito:** audit log + rate limit por tenant para chamadas a provedores de IA pagos. Análogo à tabela `ai_usage` (migration 023) do V1, mas com vantagens de Firestore (TTL automático).

**Document ID:** `{date}_{kind}_{routeHash}_{nanoid}` (sortable + buscável)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | string | `text\|image\|tts` |
| `route` | string | ex: `/api/ai/contador` |
| `plan` | string | snapshot do tenant.plan no momento |
| `provider` | string | `anthropic\|fal\|elevenlabs\|openai_tts\|replicate` |
| `costEstimate` | number? | USD aprox |
| `tokensIn` / `tokensOut` | number? | quando aplicável |
| `createdAt` | Timestamp | server-set, **TTL** field |
| `expireAt` | Timestamp | createdAt + 90 dias |

**Índices:**
- Composto `(kind, createdAt)` para queries de rate limit (count desde meia-noite)

**ACL:**
- Read: roles `owner`/`admin` do tenant + server
- Write: **server-only** (escrita só pelo wrapper `guardAICall()` análogo)

**TTL:** habilitar Firestore TTL no campo `expireAt` para purgar automaticamente após 90 dias (~$0/mês após setup).

**Custo/performance:** alto volume de writes (1 por chamada IA). Reads em rate-limit check são frequentes — usar query agregada `count()` em vez de listar.

---

### 6. `assets` (subcollection de `tenants`)

**Path:** `/tenants/{tenantId}/assets/{assetId}`

**Propósito:** metadata sobre arquivos no Storage (referência ao path GCS, dimensões, tipo, owner).

**Document ID:** `ast_{nanoid}`

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `kind` | string | `image\|video\|audio\|template\|reference` |
| `format` | string | `feed\|story\|reel_cover\|raw` |
| `storagePath` | string | `tenants/{tenantId}/assets/{assetId}/{filename}` |
| `mimeType` | string | |
| `sizeBytes` | number | |
| `width` / `height` | number? | |
| `durationSec` | number? | media |
| `originalFilename` | string | |
| `uploadedBy` | string | userId |
| `tags` | array<string> | facetagem |
| `createdAt` / `updatedAt` | Timestamp | |

**Índices:**
- `(kind, createdAt)` para galeria filtrada
- `(tags, createdAt)` para busca por tag (array-contains)

**ACL:**
- Read: membership ativo do tenant
- Write: roles `member+` para criar; `admin+` para deletar (ou owner do asset via `uploadedBy`)

**Custo/performance:** moderado. Pode crescer rápido com mídia. Considerar paginação em UI.

---

### 7. `content_jobs` (subcollection de `tenants`)

**Path:** `/tenants/{tenantId}/content_jobs/{jobId}`

**Propósito:** análogo ao `content_projects` do V1 — pipeline de geração de conteúdo (análise → script → imagens → voz → vídeo). Estado mutável durante execução.

**Document ID:** `job_{nanoid}`

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `status` | string | `pending\|analyzing\|generating\|complete\|failed` |
| `format` | string | `feed\|story\|reel\|carousel` |
| `niche` | string | snapshot do tenant.niche |
| `userId` | string | quem disparou |
| `sourceUrl` / `sourceText` | string? | input |
| `analysis` | map | resultado da análise |
| `scenes` | array<map> | scenes geradas |
| `images` | array<{path, generatedAt}> | refs em Storage |
| `voiceUrl` | string? | path em Storage |
| `videoUrl` | string? | path em Storage |
| `talkingObject` | map? | personagem selecionado |
| `error` | string? | quando status=failed |
| `costSummary` | map | breakdown {anthropic, fal, tts} |
| `createdAt` / `updatedAt` | Timestamp | |
| `completedAt` | Timestamp? | |

**Índices:**
- `(status, createdAt)` — fila de jobs pendentes
- `(userId, createdAt)` — histórico do user no tenant

**ACL:**
- Read: membership ativo. Member vê próprios jobs (`userId == auth.uid`); admin vê todos do tenant
- Write: criação via member; updates de status/result **server-only** (workers escrevem)

**Custo/performance:** real-time updates via `onSnapshot` para UI de progresso é tentador, mas custa um read por update — limitar a transitions importantes (status changes).

---

### 8. `billing_events` (root)

**Propósito:** log imutável de eventos do Stripe (checkout completed, subscription updated, payment failed) por tenant. Análogo ao `stripe_webhook_events` do V1 + idempotency.

**Document ID:** `{stripeEventId}` (idempotency natural — mesmo evento, mesmo doc)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `tenantId` | string | denormalizado para query |
| `stripeCustomerId` | string | |
| `eventType` | string | `checkout.session.completed\|customer.subscription.updated\|...` |
| `payload` | map | full event JSON do Stripe |
| `processedAt` | Timestamp? | quando handler completou |
| `outcome` | string | `success\|skipped\|error` |
| `error` | string? | |
| `receivedAt` | Timestamp | server-set |

**Índices:**
- `(tenantId, receivedAt)` — auditoria por tenant
- `(eventType, receivedAt)` — debug por tipo

**ACL:**
- Read: server-only + role `owner` do tenant pode ler os próprios (auditoria)
- Write: **server-only**

**Custo/performance:** writes raros (volume de webhooks Stripe). Imutável após write.

---

### 9. `audit_logs` (root)

**Propósito:** log imutável de ações relevantes (login, role change, billing change, deleted records). Compliance + investigação forense.

**Document ID:** `log_{date}_{nanoid}` (sortable por tempo)

**Campos principais:**

| Campo | Tipo | Notas |
|---|---|---|
| `tenantId` | string? | quando aplicável |
| `actorUserId` | string? | quem fez |
| `action` | string | enum: `user.login\|membership.created\|tenant.plan_changed\|asset.deleted\|...` |
| `resource` | map | `{ type, id, path }` |
| `before` / `after` | map? | snapshot diff (para mudanças críticas) |
| `ip` | string? | quando capturável |
| `userAgent` | string? | |
| `createdAt` | Timestamp | server-set, **TTL** field |
| `expireAt` | Timestamp | createdAt + 365 dias |

**Índices:**
- `(tenantId, createdAt)` — audit por tenant
- `(actorUserId, createdAt)` — audit por user
- `(action, createdAt)` — análise por tipo de ação

**ACL:**
- Read: role `owner`/`admin` do tenant lê os do tenant; super-admin do produto lê todos (custom claim)
- Write: **server-only**

**TTL:** retention 1 ano (configurável via `expireAt`).

**Custo/performance:** writes em quantidade considerável; reads esporádicos. Considerar exportar para BigQuery se volume crescer.

---

## Modelo Storage

Bucket: `gs://db8-nexoomnix-default` (já provisionado).

Convenção de paths:

```text
tenants/{tenantId}/assets/{assetId}/{filename}
tenants/{tenantId}/content_jobs/{jobId}/scenes/{sceneIdx}.png
tenants/{tenantId}/content_jobs/{jobId}/voice.mp3
tenants/{tenantId}/content_jobs/{jobId}/final.mp4
tenants/{tenantId}/branding/logo.png
tenants/{tenantId}/branding/reference/{idx}.jpg
users/{userId}/avatar.png
public/templates/{templateId}.png
```

Vantagens dessa estrutura:

1. **Tenant isolation**: regras Storage podem casar `tenants/{tenantId}/{...}` e checar membership
2. **Path-based GC**: ao deletar tenant, deletar prefix `tenants/{tenantId}/` em batch
3. **Mirror das collections Firestore**: `assets/{assetId}` no GCS bate com doc `tenants/{tenantId}/assets/{assetId}` no Firestore
4. **Quota & cost por tenant**: agregação de `du -s tenants/{tenantId}` via Cloud Storage Inventory

---

## Regras Firestore (conceituais)

> ⚠️ Não aplicar agora. Manter `deny-all` até modelo ser implementado e testado.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── helpers ────────────────────────────────────────────────
    function isAuth() {
      return request.auth != null;
    }
    function isSelf(uid) {
      return isAuth() && request.auth.uid == uid;
    }
    function tenantsInClaim() {
      // custom claims são injetadas pela Cloud Function on memberships write
      return request.auth.token.tenants != null
        ? request.auth.token.tenants
        : [];
    }
    function isMember(tenantId) {
      return tenantId in tenantsInClaim();
    }
    function hasRole(tenantId, role) {
      return isMember(tenantId)
        && request.auth.token.roles[tenantId] == role;
    }
    function isOwner(tenantId)  { return hasRole(tenantId, 'owner'); }
    function isAdminUp(tenantId) {
      return hasRole(tenantId, 'owner') || hasRole(tenantId, 'admin');
    }

    // ── users ──────────────────────────────────────────────────
    match /users/{userId} {
      allow read:   if isSelf(userId);
      allow update: if isSelf(userId)
        && request.resource.data.diff(resource.data).changedKeys()
            .hasOnly(['displayName','photoURL','defaultTenantId','locale','timezone','marketingOptIn','updatedAt']);
      allow create: if isSelf(userId);
      allow delete: if false;  // soft delete via server
    }

    // ── tenants ────────────────────────────────────────────────
    match /tenants/{tenantId} {
      allow read:   if isMember(tenantId);
      allow update: if isAdminUp(tenantId)
        && !request.resource.data.diff(resource.data).affectedKeys()
            .hasAny(['plan','planPriceId','stripeCustomerId','stripeSubscriptionId','trialEndsAt','createdAt']);
      allow create, delete: if false;  // server-only

      // ── subcollections ───────────────────────────────────────
      match /assets/{assetId} {
        allow read:   if isMember(tenantId);
        allow create: if isMember(tenantId)
          && request.resource.data.uploadedBy == request.auth.uid;
        allow update: if isAdminUp(tenantId)
          || (isMember(tenantId) && resource.data.uploadedBy == request.auth.uid);
        allow delete: if isAdminUp(tenantId);
      }

      match /content_jobs/{jobId} {
        allow read:   if isMember(tenantId);
        allow create: if isMember(tenantId)
          && request.resource.data.userId == request.auth.uid;
        allow update, delete: if false;  // server-only after creation
      }

      match /ai_usage/{usageId} {
        allow read:   if isAdminUp(tenantId);
        allow write:  if false;  // server-only
      }
    }

    // ── memberships ────────────────────────────────────────────
    match /memberships/{membershipId} {
      allow read:   if isAuth()
        && (resource.data.userId == request.auth.uid
            || isAdminUp(resource.data.tenantId));
      allow write:  if false;  // server-only — invite/accept via Cloud Function
    }

    // ── plans ──────────────────────────────────────────────────
    match /plans/{planId} {
      allow read:  if true;       // público
      allow write: if false;      // server/deploy
    }

    // ── billing_events / audit_logs ────────────────────────────
    match /billing_events/{eventId} {
      allow read:  if isOwner(resource.data.tenantId);
      allow write: if false;      // server-only
    }
    match /audit_logs/{logId} {
      allow read:  if isAdminUp(resource.data.tenantId);
      allow write: if false;      // server-only
    }
  }
}
```

**Padrões críticos:**

1. **Sempre validar `request.resource.data`** em writes para impedir injeção de campos não previstos
2. **`hasOnly()` em update** restringe quais campos podem mudar (impede client elevar `role` ou `plan`)
3. **Server-only fields** ficam atrás de `allow write: if false`. Backend usa Admin SDK que bypassa regras
4. **Custom claims sync** é responsabilidade do backend — falha de sync = user não consegue acessar tenant até re-login

---

## Regras Storage (conceituais)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function tenantsInClaim() {
      return request.auth.token.tenants != null
        ? request.auth.token.tenants
        : [];
    }
    function isMember(tenantId) {
      return tenantId in tenantsInClaim();
    }

    // tenant assets
    match /tenants/{tenantId}/{allPaths=**} {
      allow read:  if isMember(tenantId);
      allow write: if isMember(tenantId)
                   && request.resource.size < 50 * 1024 * 1024  // 50 MB max
                   && request.resource.contentType.matches('image/.*|video/.*|audio/.*');
    }

    // user avatars
    match /users/{userId}/{allPaths=**} {
      allow read:  if request.auth != null;  // qualquer auth pode ver avatar
      allow write: if request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024;
    }

    // public templates
    match /public/{allPaths=**} {
      allow read:  if true;
      allow write: if false;  // server-only
    }
  }
}
```

---

## Exemplos de documentos

### `users/abc123`
```json
{
  "email": "douglas@nexoomnix.com",
  "displayName": "Douglas Bonânzza",
  "photoURL": null,
  "defaultTenantId": "tnt_BRkz9p",
  "locale": "pt-BR",
  "timezone": "America/Bahia",
  "marketingOptIn": true,
  "createdAt": "2026-04-26T10:00:00Z",
  "updatedAt": "2026-04-26T10:00:00Z"
}
```

### `tenants/tnt_BRkz9p`
```json
{
  "name": "Salão Bella",
  "slug": "salao-bella",
  "niche": "beleza",
  "plan": "pro_plus",
  "stripeCustomerId": "cus_PqXyZ...",
  "stripeSubscriptionId": "sub_1NQRs...",
  "trialEndsAt": null,
  "branding": {
    "primaryColor": "#FF6B9D",
    "logoUrl": "gs://db8-nexoomnix-default/tenants/tnt_BRkz9p/branding/logo.png",
    "brandVoice": "Acolhedor, descontraído"
  },
  "whatsappNumber": "+5571999999999",
  "addonTalkingObjects": true,
  "simulateAi": false,
  "createdAt": "2026-04-01T08:00:00Z",
  "updatedAt": "2026-04-26T10:00:00Z"
}
```

### `memberships/abc123__tnt_BRkz9p`
```json
{
  "userId": "abc123",
  "tenantId": "tnt_BRkz9p",
  "role": "owner",
  "status": "active",
  "invitedBy": null,
  "invitedAt": null,
  "acceptedAt": "2026-04-01T08:00:00Z",
  "createdAt": "2026-04-01T08:00:00Z",
  "updatedAt": "2026-04-01T08:00:00Z"
}
```

### `tenants/tnt_BRkz9p/content_jobs/job_xpto`
```json
{
  "status": "complete",
  "format": "reel",
  "niche": "beleza",
  "userId": "abc123",
  "sourceUrl": "https://blog.example.com/dicas-cabelo",
  "analysis": { "title": "5 dicas pra cabelo cacheado", "hook": "..." },
  "scenes": [
    { "id": 1, "description": "...", "imagePath": "tenants/tnt_BRkz9p/content_jobs/job_xpto/scenes/1.png" }
  ],
  "voiceUrl": "tenants/tnt_BRkz9p/content_jobs/job_xpto/voice.mp3",
  "videoUrl": "tenants/tnt_BRkz9p/content_jobs/job_xpto/final.mp4",
  "talkingObject": { "id": "scissors", "name": "Tesoura Mágica" },
  "costSummary": { "anthropic": 0.012, "fal": 0.18, "tts": 0.05 },
  "createdAt": "2026-04-26T10:30:00Z",
  "completedAt": "2026-04-26T10:34:21Z",
  "updatedAt": "2026-04-26T10:34:21Z"
}
```

---

## Custos & performance

### Estimativa por tenant ativo (~30 jobs/mês, 5 users, uso médio)

| Operação | Volume mês | Reads | Writes | $/mês |
|---|---|---|---|---|
| Login + dashboard load | 5 users × 30 sessões | ~5 reads/sessão = 750 | 0 | ~$0 |
| Listagem assets/jobs | 30 sessões × 50 docs | 1500 | 0 | ~$0 |
| AI calls (rate-limit check) | ~150 chamadas | 150 (count agregado) | 150 | ~$0 |
| Realtime onSnapshot (jobs) | ~30 jobs × 10 updates | 300 | 0 | ~$0 |
| Storage 5 GB médios | — | — | — | ~$0.10 |
| **Total estimado** | | **~2.7k reads** | **~150 writes** | **<$0.50/tenant** |

Para 100 tenants ativos: ~$50/mês total. Comparável ao Supabase Pro tier.

### Hotspots a monitorar

1. **Membership lookups** — usar custom claims; sem claims, cada request tem 1 read extra
2. **Real-time listeners** em collections grandes — limit + paginação obrigatório
3. **Composite indexes** custam armazenamento; remover índices não usados

### Limites Firestore relevantes

- 1 MB por documento — content_jobs com muitas scenes pode esbarrar; mover scenes para subcollection se >50
- 1 write/segundo por documento (sustentado) — content_job pode ter rajadas; considerar batched writes ou eventual consistency
- 500 writes/segundo por collection — não preocupar nesse volume

---

## Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| **Schema-on-read sem validação** permite docs malformados | alto | Schema validators (Zod) em backend antes de qualquer write; testes de regras CI |
| **Custom claims fora-de-sincronia** após membership change | médio | Cloud Function `onWrite` em `memberships` + force token refresh no client |
| **Cobertura insuficiente de regras** no início | crítico | Manter `deny-all` até cada path estar coberto + testado com Firebase Emulator |
| **Vendor lock-in Firestore** ≠ Postgres do V1 | alto | Documentar inconsistências antes de migrar; Firestore não tem JOIN, transações cross-collection limitadas |
| **Custos descontrolados em real-time listeners** | médio | Cap de listeners por client; limit + paginate; `onSnapshot` somente em transitions críticas |
| **Falta de modelagem para BI/relatórios** | médio | Export contínuo para BigQuery (configurável via Firebase extensions) |
| **Storage sem TTL nativo** | baixo | Cloud Storage Lifecycle policies para limpar `tenants/{deleted}` após N dias |
| **Confusão entre V1 (Supabase) e V2 (Firebase)** durante coexistência | alto | Convenção rígida: V2 fica em rotas/clients separados; sem leitura cruzada de banco |

---

## Próximos passos (cada um requer decisão explícita)

1. **Decisão arquitetural macro** — Firebase V2 vai conviver com V1 indefinidamente, vai migrar fases, ou foi exploração descartada?
2. **Validar modelo com use cases reais** — pegar 3 fluxos do V1 (cadastro de tenant, geração de reel, billing webhook) e desenhar como ficariam neste modelo
3. **Implementar Cloud Function de membership sync** — gatilho `onWrite('memberships/{id}')` que atualiza custom claims via `admin.auth().setCustomUserClaims()`
4. **Escrever rules em `firebase/firestore.rules`** evoluindo do `deny-all` (este doc fica como referência)
5. **Configurar Firestore Emulator + suite de testes** de regras antes de qualquer release real
6. **Habilitar Firestore TTL** nos campos `expireAt` de `ai_usage` e `audit_logs`
7. **Aplicar Cloud Storage Lifecycle** para `tenants/{deleted}/**` (cleanup pós-delete)
8. **Configurar export contínuo para BigQuery** (analytics)
9. **Definir Web App Firebase** (`firebase apps:create web`) — gera config a ser consumida pelo client
10. **Plano de migração de dados Supabase → Firestore**, se aplicável (escopo separado, não trivial)
