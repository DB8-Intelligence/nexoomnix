# DB8Intelligence — Arquitetura do Ecossistema
**Referência:** DB8-ECOSYSTEM-MASTER.md v4.0
**Data:** Março 2026

---

## 🗺️ MAPEAMENTO: Código Atual → Destino Final

### Estado atual (monolito)
```
~/nexopro/                          ← tudo em um repositório
  src/app/(auth)/                   → vai para: apps/dashboard (mantém)
  src/app/(dashboard)/              → vai para: apps/dashboard (mantém)
  src/app/(nichos)/                 → vai para: apps/web (landing pages)
  src/app/s/[slug]/                 → vai para: apps/dashboard (mantém)
  src/app/api/ai/contador/          → vai para: api.db8intelligence.com.br
  src/app/api/ai/gerar-conteudo/    → vai para: api.db8intelligence.com.br
  src/app/api/auth/callback/        → mantém no dashboard
  supabase/migrations/              → schema único (sem mudança)
```

---

## 🏗️ ARQUITETURA DEFINITIVA

```
REPOSITÓRIOS                         DOMÍNIO                      STATUS
─────────────────────────────────────────────────────────────────────────
nexopro (atual)      →  app.nexopro.com.br      dashboard tenants    🔶 em desenvolvimento
nexopro (atual)      →  nexopro.com.br          landing pages        🔶 parcial (3/10)
db8-api (novo)       →  api.db8intelligence.com.br  IA + auth + fiscal  ⬜ criar
db8-admin (futuro)   →  db8intelligence.com     painel admin db8     ⬜ fase 4
automacao (existente)→  automacao.db8...        n8n workflows        ✅ rodando
```

---

## 📦 O QUE CRIAR: apps/api → api.db8intelligence.com.br

### Repositório: `db8-api`
Stack: **Next.js 14 API Routes + TypeScript** (deploy Vercel)

```
db8-api/
├── src/app/api/
│   ├── ai/
│   │   ├── gerar-conteudo/route.ts   ← MIGRAR de nexopro
│   │   ├── contador/route.ts          ← MIGRAR de nexopro
│   │   ├── peticao/route.ts           ← novo (nicho juridico)
│   │   └── material-didatico/route.ts ← novo (nicho educacao)
│   ├── auth/
│   │   ├── setup-tenant/route.ts      ← extrair de useAuth.ts
│   │   └── me/route.ts                ← novo
│   ├── fiscal/
│   │   ├── nfse/
│   │   │   ├── emitir/route.ts        ← novo (Focus NFe)
│   │   │   └── [id]/route.ts          ← novo
│   │   └── das/calcular/route.ts      ← novo
│   ├── webhooks/
│   │   ├── stripe/route.ts            ← novo (Fase 5)
│   │   └── n8n/route.ts               ← novo
│   └── health/route.ts                ← health check
├── src/middleware/
│   ├── auth.ts        ← valida JWT Supabase
│   ├── tenant.ts      ← injeta tenant_id
│   └── rateLimit.ts   ← 10 req/min por tenant (Redis/Upstash)
├── src/lib/
│   ├── supabase.ts    ← service role client
│   ├── anthropic.ts   ← instância Anthropic
│   └── n8n.ts         ← trigger de workflows
├── .env.example
└── package.json
```

### Variáveis de ambiente exclusivas do db8-api
```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=    # acesso total, nunca no frontend
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FOCUS_NFE_TOKEN=
ASAAS_API_KEY=
ZAPI_TOKEN=
RESEND_API_KEY=
DB8_ADMIN_SECRET=
UPSTASH_REDIS_URL=            # rate limiting em produção
UPSTASH_REDIS_TOKEN=
```

---

## 🔄 MIGRAÇÃO DAS ROTAS DE IA (sem quebrar nada)

### Fase atual: nexopro chama API internamente
```
Dashboard → /api/ai/contador (interno Next.js)
         → ANTHROPIC_API_KEY no .env.local do nexopro
```

### Após migração: nexopro chama api.db8intelligence.com.br
```
Dashboard → https://api.db8intelligence.com.br/ai/contador
         → Authorization: Bearer <supabase_jwt>
         → ANTHROPIC_API_KEY SOMENTE no db8-api
         → nexopro não precisa mais de ANTHROPIC_API_KEY
```

### Estratégia de migração com zero downtime
```
Passo 1: Criar db8-api com as rotas copiadas de nexopro
Passo 2: Adicionar NEXT_PUBLIC_API_URL=https://api.db8intelligence.com.br no nexopro
Passo 3: Trocar chamadas internas (/api/ai/*) por chamadas externas
Passo 4: Remover ANTHROPIC_API_KEY do nexopro
Passo 5: Remover rotas /api/ai/* do nexopro
```

---

## 🗄️ BANCO DE DADOS: Schema Separation

### Situação atual (schema public)
```sql
public.tenants
public.profiles
public.clients
public.appointments
... (tudo no schema padrão)
```

### Destino (schemas separados — migration futura)
```sql
-- Schema: core (compartilhado entre produtos futuros)
core.tenants
core.profiles
core.subscriptions    ← Stripe
core.activity_logs

-- Schema: nexopro (exclusivo do produto)
nexopro.tenant_settings
nexopro.tenant_modules
nexopro.clients
nexopro.services
nexopro.appointments
nexopro.transactions
nexopro.notas_fiscais
nexopro.obrigacoes_fiscais
nexopro.social_content
nexopro.editorial_calendar

-- Schema: admin (painel db8intelligence — fase 4)
admin.mrr_snapshots
admin.feature_flags
admin.n8n_flows
```

> ⚠️ **Decisão de timing:** Migração de schemas quebra RLS e todas as queries.
> Fazer SOMENTE quando o banco estiver em produção estável e com plano de rollback.
> Por agora, manter no schema `public` é a decisão correta para MVP.

---

## ⚙️ N8N — automacao.db8intelligence.com.br

**Já rodando.** Workflows a configurar por fase:

### Fase Atual (configurar agora — sem código)
```
Workflow 1: ONBOARDING
  Trigger: Supabase webhook → INSERT em tenants
  Ações:
    → Resend: email de boas-vindas
    → Slack: notificação #novos-clientes

Workflow 2: TRIAL EXPIRANDO
  Trigger: Cron — todo dia às 9h
  Ações:
    → Busca tenants com trial_ends_at = hoje + 3 dias
    → Resend: sequência de conversão por nicho
```

### Fase 5 (junto com Stripe)
```
Workflow 3: BILLING
  Trigger: Webhook Stripe → invoice.payment_failed
  → Notifica tenant (email + WhatsApp)
  → Grace period 3 dias
  → Downgrade para trial se não pagar
```

### Fase 6 (integrações)
```
Workflow 4: AGENDAMENTOS
  Trigger: Supabase webhook → INSERT em appointments
  → WhatsApp de confirmação (Z-API)
  → Lembrete 24h antes
  → Lembrete 2h antes

Workflow 5: FISCAL
  Trigger: Cron — todo dia às 8h
  → Busca obrigações com vencimento em 7 dias
  → Alerta no dashboard + email + WhatsApp
```

---

## 📍 PLANO DE EXECUÇÃO (sem retrabalho)

```
HOJE (sem mudar nexopro):
  ✅ Documentar esta arquitetura (este arquivo)
  ✅ Atualizar CLAUDE.md com contexto do ecossistema

PRÓXIMA SESSÃO — Criar db8-api:
  → Novo repositório: github.com/DB8-Intelligence/db8-api
  → Copiar rotas de IA do nexopro
  → Adicionar middleware de auth e tenant
  → Deploy Vercel → api.db8intelligence.com.br

SESSÃO SEGUINTE — Conectar nexopro ao db8-api:
  → Adicionar NEXT_PUBLIC_API_URL ao nexopro
  → Trocar /api/ai/* por chamadas ao db8-api
  → Remover ANTHROPIC_API_KEY do nexopro

FASE 4 (módulos funcionais) — continua no nexopro atual:
  → CalendarView, ClientTable, TransactionForm
  → Sem bloqueio para este trabalho

FASE 5 (Stripe) — no db8-api:
  → Webhook Stripe centralizado no db8-api
  → nexopro apenas lê plan do Supabase
```

---

## ✅ DECISÕES ARQUITETURAIS CONFIRMADAS

| Decisão | Escolha | Razão |
|---------|---------|-------|
| API IA/Auth/Fiscal | db8-api (novo repo) | Isola ANTHROPIC_API_KEY, escala independente |
| Automações | n8n (já rodando) | Sem código, configuração visual |
| Dashboard tenants | nexopro (atual) | Já funciona, não quebrar |
| Landing pages | nexopro (atual) até Fase 3 | Baixo custo de manter junto |
| Schema separados | Adiado (public por agora) | MVP primeiro, refactor depois |
| Monorepo Turborepo | Adiado (fase 4+) | Premature optimization para MVP |
| Rate limiting IA | Upstash Redis no db8-api | Map em memória é suficiente até 50 tenants |

---

*Arquitetura validada contra DB8-ECOSYSTEM-MASTER.md v4.0*
*Próximo passo: criar repositório db8-api*
