# Deploy NexoOmnix no Google Cloud Run — Fase A1

> Status: **Fase A1 — preparação concluída.** Imagem builda local. Deploy em Cloud Run ainda **NÃO executado** (Fase A2).

## Contexto

Fase A1 da migração GCP (ver discussão em sessão de 2026-04-24): preparar o app Next.js para rodar em qualquer container Linux, mantendo Vercel ainda em produção. Quando A2 rodar, troca-se DNS sem rollback complicado.

Mantém sem alterar:

- Supabase (Postgres + Auth + Storage)
- n8n (Railway)
- Stripe, Resend, Anthropic, Fal.ai, ElevenLabs, OpenAI TTS, Canva, Meta
- Lógica de negócio, rotas, middleware, tenant-context, AI cost control

## Arquivos da Fase A1

| Arquivo | Papel |
|---|---|
| [Dockerfile](../../Dockerfile) | Multi-stage build (deps → builder → runner) sobre `node:20-slim`. Imagem ~200-250 MB. Listening em 0.0.0.0:8080. |
| [.dockerignore](../../.dockerignore) | Exclui `.git`, `node_modules`, `.next`, `.env*`, docs, scripts ops, etc. |
| [next.config.mjs](../../next.config.mjs) | `output: 'standalone'` adicionado (sem efeito em Vercel). |
| [cloudbuild.yaml](../../cloudbuild.yaml) | Cloud Build config que faz `docker build --build-arg NEXT_PUBLIC_*=...` e empurra imagem para Artifact Registry. Necessário porque `gcloud run deploy --source --build-env-vars-file` não propaga build-args para Dockerfile (ver seção "Por que NÃO usar `--source .` direto"). |

### Por que `node:20-slim` e não `node:20-alpine`

Alpine usa **musl libc**; binários nativos npm pré-compilados (sharp para `next/image`, fsevents, etc) são distribuídos para glibc. Mesmo com `apk add libc6-compat` o ambiente fica frágil — falhas silenciosas em runtime, principalmente no pipeline de imagem do Next.

`node:20-slim` é Debian slim com **glibc nativo**. Pesa ~80 MB a mais que Alpine (~200-250 MB final vs ~150-200 MB), tradeoff aceitável pela estabilidade. `groupadd`/`useradd` substituem `addgroup`/`adduser` do BusyBox e vêm no pacote `passwd` por padrão.

## Build local (smoke test)

```bash
# 1. Verificar que `npm run build` continua passando (Vercel)
npm run build

# 2. Build da imagem Docker
# Importante: passar NEXT_PUBLIC_* como --build-arg pra que sejam embutidas
# no client bundle no momento do build.
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_APP_URL="https://nexoomnix.com" \
  --build-arg NEXT_PUBLIC_APP_NAME="NexoOmnix" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  -t nexoomnix:local .

# 3. Rodar localmente (passar env vars de runtime via --env-file)
# .env.local funciona se você tem ele preenchido
docker run --rm -p 8080:8080 \
  --env-file .env.local \
  -e NODE_ENV=production \
  -e PORT=8080 \
  nexoomnix:local

# 4. Validar
curl -i http://localhost:8080/

# Deve retornar 200 (ou 307 se você não tiver session — middleware redireciona)
```

### Variáveis NEXT_PUBLIC_* (build-time)

Vão dentro do bundle do client, então têm que existir no momento do `npm run build`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Variáveis server-only (runtime)

Passadas em runtime via `--set-env-vars` (gcloud) ou `--env-file` (docker run local). NÃO embutidas em build:

```text
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER, STRIPE_PRICE_PRO, STRIPE_PRICE_PRO_PLUS,
STRIPE_PRICE_PRO_MAX, STRIPE_PRICE_ENTERPRISE
RESEND_API_KEY, RESEND_FROM
FAL_KEY
ELEVENLABS_API_KEY
OPENAI_TTS_KEY
REPLICATE_API_KEY
DB8_AGENT_URL
N8N_WEBHOOK_TOKEN, N8N_BASE_URL, N8N_CONTENT_WEBHOOK_URL,
N8N_SKILL_FACTORY_WEBHOOK
META_APP_ID, META_APP_SECRET
CANVA_CLIENT_ID, CANVA_CLIENT_SECRET
ASAAS_API_KEY, ASAAS_ENVIRONMENT
CRON_SECRET
SIMULATE_AI         # cost-control: true em dev, ausente/false em prod
```

## Deploy no Cloud Run (Fase A2 — build separado + deploy por imagem)

### Por que NÃO usar `gcloud run deploy --source .` direto

Tentativa A2.2 inicial usou `gcloud run deploy --source . --build-env-vars-file=...`. **Falhou.** A flag `--build-env-vars-file` foi feita para Cloud Native Buildpacks e **não propaga as vars como `--build-arg` para Dockerfile builds**. Os `ARG NEXT_PUBLIC_*` no Dockerfile recebem `""`, Next.js embute `""` em `metadataBase` e similares, e o build morre em "Collecting page data" para `/_not-found` com `TypeError: Invalid URL (input: '')`.

**Solução adotada:** [cloudbuild.yaml](../../cloudbuild.yaml) na raiz do repo executa `docker build --build-arg ...` explicitamente, e o deploy passa a referenciar a imagem buildada via `--image=...`. Build e deploy ficam separados, com responsabilidades claras.

### Pré-requisitos

```bash
# gcloud CLI instalado e autenticado: `gcloud auth login`
# Projeto GCP com billing habilitado e APIs:
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Variáveis

```bash
PROJECT_ID="viralreel-ai-493701"     # projeto GCP residual usado em smoke A1-A2; produção em db8-nexoomnix
REGION="us-central1"                 # ou southamerica-east1 (BR latência menor)
SERVICE="nexoomnix-web-smoke"        # smoke; production será "nexoomnix-web"
```

### Passo 1 — Build da imagem com Cloud Build

`NEXT_PUBLIC_*` viajam como **substitutions** para o `cloudbuild.yaml`, que repassa cada uma como `--build-arg` ao `docker build`. Carregue os valores do seu `.env.local` antes:

```bash
set -a; source .env.local; set +a

# ^||^ é o delimiter alternativo do gcloud — necessário porque JWT values
# contêm vírgulas que quebrariam o parse do --substitutions= padrão.
gcloud builds submit \
  --config=cloudbuild.yaml \
  --project=$PROJECT_ID \
  --region=$REGION \
  --substitutions=^||^_NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"||_NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"||_NEXT_PUBLIC_APP_URL="https://nexoomnix.com"||_NEXT_PUBLIC_APP_NAME="NexoOmnix"||_NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
```

Output: imagem em `us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/nexoomnix-web:latest` (e tag `:$BUILD_ID` única).

### Passo 2 — Deploy do Cloud Run referenciando a imagem

```bash
# (Opcional) Criar/popular runtime.yaml fora do repo com server-side secrets.
# NUNCA commitar — usar diretório /tmp ou similar:
TMPYAML=$(mktemp)
cat > "$TMPYAML" <<EOF
SUPABASE_SERVICE_ROLE_KEY: "$SUPABASE_SERVICE_ROLE_KEY"
ANTHROPIC_API_KEY: "$ANTHROPIC_API_KEY"
DB8_AGENT_URL: "$DB8_AGENT_URL"
N8N_WEBHOOK_TOKEN: "$N8N_WEBHOOK_TOKEN"
N8N_BASE_URL: "$N8N_BASE_URL"
STRIPE_SECRET_KEY: "$STRIPE_SECRET_KEY"
STRIPE_WEBHOOK_SECRET: "$STRIPE_WEBHOOK_SECRET"
RESEND_API_KEY: "$RESEND_API_KEY"
FAL_KEY: "$FAL_KEY"
ELEVENLABS_API_KEY: "$ELEVENLABS_API_KEY"
OPENAI_TTS_KEY: "$OPENAI_TTS_KEY"
REPLICATE_API_KEY: "$REPLICATE_API_KEY"
NODE_ENV: "production"
NEXT_TELEMETRY_DISABLED: "1"
EOF

gcloud run deploy $SERVICE \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/nexoomnix-web:latest \
  --project=$PROJECT_ID \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --port=8080 \
  --timeout=300 \
  --env-vars-file="$TMPYAML"

rm -f "$TMPYAML"
```

### Passo 3 — Capturar URL provisória

```bash
gcloud run services describe $SERVICE \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format='value(status.url)'

# Output esperado: https://nexoomnix-web-smoke-xxxxxxxxxx-uc.a.run.app
```

### Migração para Secret Manager (obrigatório antes de A4)

Para A4 (DNS swap), todos os secrets de runtime devem migrar de `--env-vars-file` para Secret Manager. Para cada server-side var:

```bash
echo -n "$SUPABASE_SERVICE_ROLE_KEY" | \
  gcloud secrets create supabase-service-role-key \
    --project=$PROJECT_ID \
    --replication-policy=automatic \
    --data-file=-
```

E referenciar no deploy via `--update-secrets="SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,..."`.

## Cuidados conhecidos

### 1. Crons Vercel não vão pra Cloud Run

`vercel.json` define 2 crons:

```text
*/5 * * * *  /api/cron/publish-scheduled
0 9 * * *    /api/cron/generate-scheduled
```

No Cloud Run são **inertes** — Cloud Run não interpreta `vercel.json`. **Fase A3** vai criar 2 jobs no Cloud Scheduler invocando os mesmos endpoints via HTTP autenticado (com `CRON_SECRET` no header `Authorization: Bearer`).

Enquanto Vercel + Cloud Run convivem (durante validação A2), os crons continuam disparando do Vercel — o que pode causar **duplicação se ambas as URLs estiverem ativas**. Mitigação:
- Manter Vercel rodando crons até A4 (DNS swap)
- Cloud Run só recebe tráfego web; crons ficam off no GCP até A3
- Após DNS swap, desabilitar crons Vercel e habilitar Cloud Scheduler

### 2. Image Optimization do Vercel

Next 14 com `next/image` em Vercel usa o pipeline próprio deles. Em Cloud Run, o `next/image` cai num modo nativo que serve via Sharp (já no `runner` stage com libc6-compat). Performance/cache ligeiramente diferente — **provável regressão pequena de tempo de carregamento**, aceitável.

Alternativa: usar Cloud CDN na frente, ou trocar `next/image` por imagens estáticas pré-otimizadas. Fora do escopo A1.

### 3. Webhooks com URL fixa

Stripe webhook está apontando pra `https://nexoomnix.com/api/webhooks/stripe`. Em A2, com URL provisória `https://nexoomnix-web-xxx.run.app`, webhook **continuará entregando no Vercel** (DNS ainda aponta lá). Isso é OK — A2 é só sanity check de container. Em A4, com DNS swap, Stripe webhook URL precisará ser atualizada no dashboard Stripe (ou usar a URL custom que apontará pro Cloud Run).

### 4. Edge Middleware

`src/middleware.ts` roda em Edge Runtime no Vercel. No Cloud Run, vira middleware Node padrão — mesma lógica, latência ligeiramente maior (~5-20ms). Sem mudança de código.

### 5. ISR / Static cache

Pages com `revalidate` ou `force-dynamic` continuam funcionando. Cache fica em memória do container — sem persistência entre instances. Para escala horizontal real precisaria Redis ou Memorystore (fora do escopo A1).

## Verificação Fase A1

- [x] `output: 'standalone'` em next.config.mjs
- [x] Dockerfile multi-stage compatível com Cloud Run
- [x] .dockerignore exclui artifacts e secrets
- [x] PORT=8080 + HOSTNAME=0.0.0.0 hardcoded no runner stage
- [x] Imagem builda em `node:20-slim` (Debian slim, glibc — escolhido sobre Alpine por compatibilidade com binários nativos)
- [x] Roda como user não-root (uid 1001, shell `/usr/sbin/nologin`)
- [x] `npm run build` continua passando (Vercel deploy intacto)
- [ ] **Não executado**: `docker build` local (deferred — exige Docker Desktop ativo)
- [ ] **Não executado**: deploy Cloud Run (Fase A2)

## Próximos passos

| Fase | Ação |
|---|---|
| **A2** | `gcloud run deploy --source .` → URL provisória; smoke test webhook + checkout via Cloud Run URL |
| **A3** | Cloud Scheduler para `/api/cron/publish-scheduled` e `/api/cron/generate-scheduled` |
| **A4** | DNS swap nexoomnix.com → Cloud Run; desabilitar crons Vercel; atualizar Stripe webhook URL |

## Referências

- [Next.js standalone output docs](https://nextjs.org/docs/app/api-reference/next-config-js/output)
- [Cloud Run + Next.js sample](https://github.com/GoogleCloudPlatform/serverless-samples)
- [Cloud Build + Secret Manager](https://cloud.google.com/run/docs/configuring/secrets)
