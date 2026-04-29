# NEXOOMNIX — PROJECT MEMORY & AGENT INSTRUCTIONS
# Cole este arquivo na RAIZ do projeto Next.js
# O Claude Code lerá isso automaticamente em toda sessão
# Versão: 4.0 — Rebranding NexoOmnix (Março 2026)
# ============================================================

## 🎯 VISÃO DO PRODUTO

**NexoOmnix** (marca: **Omnix**) é a plataforma SaaS central da DB8-Intelligence que entrega:
- **Omnix Agenda** — agendamentos e ordens de serviço
- **Omnix CRM** — gestão de clientes e relacionamento
- **Omnix Reels** — geração de reels virais com IA
- **Omnix Social** — posts automáticos nas redes sociais
- **Omnix Sites** — site público por nicho com agendamento online
- **Omnix Content** — pacote completo ContentAI
- **Financeiro / Contabilidade** — DRE, NFS-e, Agente IA Contador 24h

Posicionamento: **"Plataforma completa para criar, automatizar e escalar o marketing digital de empresas"**

Cada cliente (tenant) tem instância isolada com módulos do seu nicho.

### Domínio único

**Só existe um domínio: [nexoomnix.com](https://nexoomnix.com)**

Toda a plataforma, todos os nichos, todas as landing pages e todas as features vivem sob a árvore de `nexoomnix.com`. Landing pages por nicho são rotas (`/salaopro`, etc.), não domínios separados.

> ⚠️ **Nota histórica:** versões anteriores deste CLAUDE.md mencionavam domínios alternativos (salaopro.app, nexopro.app) como parte de uma arquitetura multi-domínio. **Esses domínios nunca foram registrados e foram descartados.** O código em `src/lib/domain-config.ts` e o middleware de detecção de hostname são **legacy não utilizados** — podem ser removidos quando oportuno.

---

## 🏗️ STACK TÉCNICA — NUNCA ALTERAR SEM APROVAÇÃO

```
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend:    Cloud Run (Next.js standalone — App Router server actions + API routes)
Backend DB: Supabase (PostgreSQL + Auth + Storage + Realtime) — V1 ativo
Auth V2:    Firebase (db8-nexoomnix) — base paralela, sem conexão com V1
Automação:  n8n no Railway — uso parcial (skill factory; pipelines legacy removidos)
IA texto:   Anthropic API (via guardAICall — cost control wrapper)
IA imagem:  Fal.ai (Flux Pro) — via bridge AI cost control
IA voz:     ElevenLabs API — via bridge AI cost control
Pagamento:  Stripe — somente planos principais (sem add-ons)
Email:      Resend
```

---

## 🌐 INFRAESTRUTURA DB8 — NUNCA DESLIGAR

```
Railway Projeto 1 — db8-agent
  URL:   https://api.db8intelligence.com.br
  Stack: Python 3.11.8 / FastAPI / FFmpeg / 37 commits ATIVOS
  Endpoints em producao:
    GET  /health
    GET  /properties
    POST /properties
    PATCH /properties/{id}?status=X
    DELETE /properties/{id}
    POST /generate-caption        <- usa OpenAI (migrar para Claude na Fase 7)
    POST /generate-video          <- FFmpeg + Gemini Vision — NAO MEXER
    POST /webhook/whatsapp
  AVISO: FFmpeg precisa de servidor persistente. NUNCA migrar para serverless.

Railway Projeto 2 — db8-n8n
  URL:   https://automacao.db8intelligence.com.br
  Stack: n8n + PostgreSQL
  Workflows ativos: skill factory (geração de skills por nicho)

Supabase — banco principal (unificado)
  Ver secao de banco de dados abaixo.
```

---

## 📁 ESTRUTURA DE PASTAS — SEGUIR SEMPRE

```
nexopro/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    <- sidebar + topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── agenda/page.tsx
│   │   │   ├── clientes/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── financeiro/page.tsx
│   │   │   ├── contabilidade/page.tsx
│   │   │   ├── redes-sociais/page.tsx
│   │   │   ├── site-publico/page.tsx
│   │   │   ├── relatorios/page.tsx
│   │   │   └── conteudo/                     <- MODULO CONTENTAI (Fase 7)
│   │   │       ├── page.tsx                  <- wizard
│   │   │       ├── novo/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── gerar-conteudo/route.ts   <- EXISTE
│   │   │   │   └── contador/route.ts         <- EXISTE
│   │   │   ├── content-ai/                   <- ContentAI (Fase 7)
│   │   │   │   ├── analyze/route.ts
│   │   │   │   ├── generate-package/route.ts
│   │   │   │   ├── generate-images/route.ts
│   │   │   │   └── generate-voice/route.ts
│   │   │   ├── webhooks/
│   │   │   │   ├── stripe/route.ts
│   │   │   │   └── n8n/route.ts              <- callbacks do n8n
│   │   │   └── auth/
│   │   │       └── callback/route.ts
│   │   ├── s/[slug]/page.tsx                 <- site publico do cliente
│   │   ├── layout.tsx
│   │   └── page.tsx                          <- redirect para /dashboard
│   ├── components/
│   │   ├── ui/                               <- shadcn/ui components
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── KpiCard.tsx
│   │   ├── agenda/
│   │   │   ├── CalendarView.tsx
│   │   │   └── AppointmentModal.tsx
│   │   ├── clientes/
│   │   │   ├── ClientTable.tsx
│   │   │   └── ClientForm.tsx
│   │   ├── financeiro/
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── DREView.tsx
│   │   │   └── FluxoCaixaView.tsx
│   │   ├── contabilidade/
│   │   │   ├── NFSeForm.tsx
│   │   │   └── ObrigacoesList.tsx
│   │   ├── social/
│   │   │   ├── ContentCreator.tsx
│   │   │   ├── MediaUpload.tsx
│   │   │   └── CalendarioEditorial.tsx
│   │   ├── site/
│   │   │   └── SiteEditor.tsx
│   │   ├── content-ai/                       <- ContentAI (Fase 7)
│   │   │   ├── ContentWizard.tsx
│   │   │   ├── LinkInput.tsx
│   │   │   ├── AnalysisResult.tsx
│   │   │   ├── NichoConfig.tsx
│   │   │   ├── ImageGallery.tsx
│   │   │   ├── PackagePreview.tsx
│   │   │   └── DeliveryScreen.tsx
│   │   └── ai/
│   │       └── AgenteContador.tsx
│   ├── hooks/
│   │   ├── useAuth.ts           <- EXISTE
│   │   ├── useTenant.ts         <- EXISTE
│   │   ├── useClients.ts        <- criar Fase 4
│   │   ├── useAppointments.ts   <- criar Fase 4
│   │   ├── useFinanceiro.ts     <- criar Fase 4
│   │   ├── useSocial.ts         <- criar Fase 4
│   │   └── useContentAI.ts      <- criar Fase 7
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        <- EXISTE
│   │   │   ├── server.ts        <- EXISTE
│   │   │   └── types.ts         <- EXISTE
│   │   ├── niche-config.ts      <- EXISTE
│   │   ├── plan-config.ts       <- EXISTE
│   │   ├── utils.ts             <- EXISTE
│   │   ├── ai.ts                <- EXISTE (cliente Anthropic)
│   │   └── content-ai/
│   │       └── prompts.ts          <- criar Fase 7
│   ├── types/
│   │   └── database.ts          <- EXISTE
│   └── middleware.ts            <- EXISTE (protecao de rotas)
│                                   expandir Fase 9 (deteccao de dominio)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql       <- EXISTE
│       ├── 002_accounting_module.sql    <- EXISTE
│       ├── 003_schema_improvements.sql  <- EXISTE
│       └── 005_content_ai.sql           <- criar Fase 7
├── docs/
│   └── ecosistema-arquitetura.md       <- criar (mapa dos repos DB8)
├── CLAUDE.md                           <- este arquivo
├── .env.example
└── .env.local                          <- NUNCA commitar
```

---

## 🔐 VARIAVEIS DE AMBIENTE

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side only

# Anthropic (texto + visao)
ANTHROPIC_API_KEY=                  # server-side only, nunca expor

# Railway db8-agent — adicionar na Fase 6
DB8_AGENT_URL=https://api.db8intelligence.com.br

# ContentAI — adicionar na Fase 7
# FAL_KEY=                          # Fal.ai para geracao de imagens
# ELEVENLABS_API_KEY=               # sintese de voz

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NexoOmnix

# Stripe (Fase 8)
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email (Fase 8)
# RESEND_API_KEY=

# AI Cost Control (Sprint Cost Control — Abr 2026)
# SIMULATE_AI=true em DEV / LOCAL — bypass total de Anthropic, Fal.ai,
#                                   ElevenLabs e OpenAI TTS (retorna mocks).
# SIMULATE_AI ausente ou false em PROD — chamadas reais com guardrails
#                                   (rate limit + plan gate + audit).
SIMULATE_AI=
```

---

## 🏢 NICHOS SUPORTADOS

```typescript
type Niche =
  | 'beleza'      // Salao / Barbearia
  | 'tecnico'     // Servicos Tecnicos / Manutencao
  | 'saude'       // Clinica / Consultorio / Dentista
  | 'juridico'    // Advocacia / Cartorio
  | 'pet'         // Veterinario / Pet Shop
  | 'educacao'    // Educacao / Idiomas / Cursos
  | 'nutricao'    // Nutricao / Personal Trainer
  | 'engenharia'  // Engenharia / Arquitetura
  | 'fotografia'  // Fotografia / Video / Producao
  | 'gastronomia' // Restaurante / Bar / Delivery
  | 'fitness'     // Academia / Crossfit / Fitness
  | 'financas'    // Contabilidade / Consultoria Financeira
```

Config em: `src/lib/niche-config.ts`

---

## 💳 PLANOS E MODULOS

```
trial      -> 14 dias, funcionalidades do starter
starter    -> R$ 99/mes — ate 100 clientes, agenda basica, financeiro simples
pro        -> R$199/mes — ilimitado, financeiro completo, site publico, 10 posts IA/mes
pro_plus   -> R$349/mes — tudo pro + ContentAI ilimitado,
                          NFS-e, DAS/ISS automatico, DRE, Agente IA 24h
pro_max    -> R$499/mes — tudo pro_plus + Meta API autopost,
                          Social Hub multi-conta, agente avancado
enterprise -> R$699/mes — tudo pro_max + multi-usuarios (ate 10), API, gerente dedicado
```

Regra critica: verificar tenant.plan antes de renderizar features.
Usar isPlanAtLeast('pro_plus') de hooks/useAuth.ts.

### Limites ContentAI por plano
```typescript
export const CONTENT_PLAN_LIMITS = {
  trial:      { video_seconds: 0,  projects_day: 1,  images: 3 },
  starter:    { video_seconds: 0,  projects_day: 3,  images: 5 },
  pro:        { video_seconds: 45, projects_day: 10, images: 10 },
  pro_plus:   { video_seconds: 60, projects_day: -1, images: 10 },
  enterprise: { video_seconds: 60, projects_day: -1, images: 10 },
}
```

---

## 🗄️ BANCO DE DADOS — TODAS AS TABELAS

### 🗃️ LOCAL — migrations 001–013 criadas (pclqjwegljrglaslppag)

⚠️ **Status de prod desconhecido** — última confirmação foi migration 007. Migrations 008–013 precisam validação de aplicação em produção (ver Sprint 1 do plano).

```
Core multi-tenant:     tenants · profiles · tenant_settings · tenant_modules
Operacional:           clients · services · appointments · documents
Financeiro/Contabil:   contas_bancarias · categorias_financeiras · transactions
                       notas_fiscais · obrigacoes_fiscais · relatorios_contabeis
Redes Sociais:         social_profiles · social_content · editorial_calendar · media_library
ContentAI:             content_projects
Estoque/Cursos:        products · courses · course_enrollments
Sistema:               notifications · activity_logs
─── pós-migration 007 ───
Content Personas (008): tenant_settings.content_persona_id
Meta Autopost (009):    social_media_connections · scheduled_posts
Branding (011):         tenant_settings.branding_*
Agent Skills (012):     agent_skills · skill_generation_log
CRM Pipeline (013):     crm_pipelines · crm_stages · crm_deals
                        crm_deal_channels · crm_activities
                        crm_messages · crm_message_templates
AI Cost Control (023):  ai_usage  (rate limit + audit trail por tenant/tipo)
Schema Cleanup (024):   drop de tabelas/colunas/enums/rows legacy de
                        features removidas. Aplicada em prod 2026-04-29
                        via Supabase MCP. Schema agora reflete o produto
                        vigente (ver CLEAN STATE GUARANTEE no fim).
```

> Migration 023 aplicada em prod via MCP Supabase em 2026-04-24. Migration 024 aplicada em 2026-04-29.

### Migration 005_content_ai.sql (Fase 7) — referência
```sql
CREATE TABLE IF NOT EXISTS content_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  title TEXT, source_url TEXT, source_description TEXT,
  status TEXT DEFAULT 'pending', nicho TEXT, formato TEXT,
  analysis JSONB, generated_scenes JSONB, generated_images JSONB,
  generated_voice_url TEXT, generated_video_url TEXT,
  generated_post_text TEXT, generated_hashtags TEXT[], generated_ctas JSONB,
  plan_at_creation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON content_projects USING (tenant_id = get_tenant_id());
```

RLS ATIVO EM TODAS AS TABELAS. Sempre usar get_tenant_id() nas politicas.

---

## ⚙️ REGRAS DE DESENVOLVIMENTO — SEGUIR SEMPRE

### TypeScript
- Tipos explícitos em TUDO — nunca usar `any`
- Importar tipos de `src/types/database.ts`
- Props de componentes sempre tipadas com `interface`

### Supabase
- Queries no servidor: `createClient()` de `lib/supabase/server.ts`
- Queries no cliente: `createClient()` de `lib/supabase/client.ts`
- NUNCA usar `SUPABASE_SERVICE_ROLE_KEY` em componentes client-side
- Sempre tratar erros: `const { data, error } = await supabase...`
- RLS resolve segurança — não duplicar lógica de permissão no frontend

### Next.js App Router
- Server Components por padrão
- Marcar `'use client'` apenas em componentes com hooks ou eventos
- Usar `loading.tsx` e `error.tsx` em todas as rotas do dashboard
- API Routes em `src/app/api/` para chamadas à Anthropic, db8-agent e webhooks

### Segurança
- `ANTHROPIC_API_KEY` apenas em API Routes server-side
- `DB8_AGENT_URL` repassado apenas server-side
- `FAL_KEY` e `ELEVENLABS_API_KEY` apenas server-side
- Validar input antes de enviar para qualquer API de IA
- Rate limiting nas rotas de IA (máx 10 req/min por tenant)

### Chamadas ao db8-agent
- Sempre via `src/lib/db8-agent.ts` — nunca chamar direto no componente
- Repassar `user_id` e `tenant_id` do Supabase nas chamadas

---

## 🤖 INTEGRACAO ANTHROPIC API

```typescript
model: 'claude-sonnet-4-20250514'
max_tokens: 1000   // posts, legendas, respostas rapidas
max_tokens: 2000   // DRE, relatorios contabeis
max_tokens: 4000   // pacote completo ContentAI
```

---

## 🔄 FLUXO DE ONBOARDING DO CLIENTE

```
1. /cadastro -> criar conta (email + senha)
2. Escolher nicho (10 opcoes)
3. Informar nome do negocio + WhatsApp
4. Escolher plano (trial comeca automaticamente)
5. setupTenant() -> cria tenant + profile + settings + modulos + conta caixa
6. Redirect para /dashboard
```

Funcao setupTenant() em src/hooks/useAuth.ts — EXISTE.

---

## 🌐 SITE PUBLICO DOS CLIENTES

Rota: nexoomnix.com/s/[slug] (publica — nunca exigir login)
Exibe: hero, servicos, galeria, depoimentos, botao de agendamento.
Config em: tenant_settings (campos site_*)

---

## 📊 MODULO CONTABIL — REGRAS

DRE: calculado de transactions com status='paid', agrupado por categorias_financeiras.grupo
NFS-e: API Focus NFe ou eNotas. Status: pendente -> emitida -> (cancelada)
Obrigacoes Fiscais: alertas 7 dias e 1 dia antes do vencimento. DAS sobre faturamento mensal.

---

## 🚀 COMANDOS FREQUENTES

```bash
npm run dev                    # servidor local
npm run build                  # verificar erros antes de commitar
npx supabase db push           # aplicar migrations
npx supabase gen types typescript --local > src/types/database.ts
git push origin main           # Vercel deploy automatico
```

---

## ❌ O QUE NUNCA FAZER

- Nunca commitar .env.local ou qualquer arquivo com chaves
- Nunca usar SUPABASE_SERVICE_ROLE_KEY no frontend
- Nunca expor ANTHROPIC_API_KEY, FAL_KEY, ELEVENLABS_API_KEY no client
- Nunca fazer queries sem filtro tenant_id
- Nunca desabilitar RLS nas tabelas
- Nunca usar any no TypeScript
- Nunca remover migrations existentes — sempre criar novas
- NUNCA desligar o Railway db8-agent — FFmpeg em producao
- NUNCA desligar o Railway n8n — automacoes em producao
- Nunca criar projeto Supabase novo — usar o existente com migrations

---

## ✅ CHECKLIST ANTES DE CADA COMMIT

- [ ] npm run build sem erros de TypeScript
- [ ] Nenhuma chave secreta exposta no codigo
- [ ] RLS testado para o tenant correto
- [ ] Loading state em todas as queries
- [ ] Error handling em chamadas ao db8-agent e APIs externas
- [ ] Plano verificado antes de mostrar features Pro+
- [ ] .env.example atualizado com novas variaveis
- [ ] Tipos importados de src/types/database.ts

---

## 🗺️ ROADMAP — STATUS ATUAL

### FASE 1 — FUNDACAO ✅ 100%
```
✅ Dashboard base white-label
✅ Engine de nichos (10 nichos configurados)
✅ UI de KPIs, graficos e atividade
✅ Estrutura de pastas Next.js organizada
✅ Variaveis de ambiente documentadas
```

### FASE 2 — BANCO DE DADOS ✅ 100%
```
✅ Schema SQL multi-tenant (20 tabelas)
✅ Row Level Security em todas as tabelas
✅ Seed com dados de exemplo
✅ Funcao setup_tenant()
✅ Migrations 001, 002, 003
```

### FASE 3 — AUTENTICACAO ✅ 100%
```
✅ Login / Cadastro com Supabase Auth
✅ Onboarding por nicho (wizard 4 etapas)
✅ Middleware de protecao de rotas SSR
✅ Perfis por tenant (useAuth + useTenant)
```

### FASE 4 — MODULOS OPERACIONAIS ✅ 100%
```
✅ Agente IA Anthropic (/api/ai/contador + /api/ai/gerar-conteudo)
✅ Agenda — CalendarView + AppointmentModal + AgendaView + useAppointments + /agenda/page.tsx
✅ Clientes/CRM — ClientTable + ClientForm + ClientsView + useClients + /clientes/page.tsx
✅ Clientes detalhe — /clientes/[id]/page.tsx (ficha completa: stats, agendamentos, transações, editar, excluir)
✅ Financeiro — TransactionForm + FluxoCaixaView + FinanceiroView + useFinanceiro + /financeiro/page.tsx
✅ Documentos — DocumentList + DocumentForm + DocumentosView + useDocuments + /documentos/page.tsx
✅ Contabilidade — useContabilidade + NFSeForm + ObrigacoesList + ContabilidadeView + /contabilidade/page.tsx
✅ IA Contador — AgenteContador + /ia-contador/page.tsx (plano Pro Plus)
✅ Site Público — SiteEditor + /site-publico/page.tsx
✅ Redes Sociais — RedesSociaisView + /redes-sociais/page.tsx (plano Pro)
✅ Notificações — /notificacoes/page.tsx (mark read / mark all read)
✅ Configurações — /configuracoes/page.tsx (Negócio + Notificações + Fiscal)
```

### FASE 5 — LANDING PAGES ✅ 100%

```
✅ Landing pages de nicho (salaopro, ordemdeservico, clinicapro, juridicpro, petpro, educapro, nutripro, engepro, fotopro)
✅ NexoOmnixLanding (landing page principal de nexoomnix.com)
✅ Middleware: rotas públicas de todas as landing pages
```

### FASE 6 — REMOVIDA DO ESCOPO ❌

Fase originalmente vertical de nicho hoje fora de escopo. Limpeza de
código, schema e infra concluída em Sprint Cleanup 3 (2026-04-29).

### FASE 7 — CONTENTAI ✅ 100%

```
✅ Migration 005_content_ai.sql (content_projects + RLS + updated_at trigger)
✅ Types: ContentProject, ContentProjectStatus, ContentAnalysis, ContentCTA, ContentScene
✅ src/lib/content-ai/prompts.ts (buildAnalysisPrompt + buildPackagePrompt)
✅ API routes: analyze + generate-package + generate-images + generate-voice
✅ Hook useContentAI.ts (createProject, analyze, generatePackage, generateImages, generateVoice)
✅ Wizard: LinkInput → AnalysisResult → NichoConfig → ImageGallery → PackagePreview → DeliveryScreen
✅ ContentWizard.tsx (orquestrador com StepIndicator)
✅ Rotas: /conteudo (wizard) + /conteudo/[id] (detalhe)
✅ FAL_KEY e ELEVENLABS_API_KEY no .env.example
```

> ℹ️ Sub-features de geração automática descontinuadas em Sprint Cleanup 3
> (2026-04-29). Formatos de publicação (reel/post/carrossel/stories) via Meta
> Graph API continuam suportados — apenas o pipeline de geração interno saiu.

### FASE 8 — MONETIZACAO ✅ 100%

```
✅ Migration 006_billing.sql (stripe_customer_id, stripe_subscription_id, cancel_at_period_end)
✅ Tenant type atualizado com campos Stripe
✅ src/lib/stripe.ts (cliente Stripe + PLAN_PRICE_IDS + planFromPriceId)
✅ src/lib/resend.ts (sendEmail + welcomeEmail + paymentFailedEmail + trialEndingEmail)
✅ API: /api/stripe/create-checkout (cria session, cria customer se necessário)
✅ API: /api/stripe/portal (Stripe billing portal)
✅ API: /api/webhooks/stripe (checkout.completed, subscription.updated/deleted, payment_failed)
✅ PricingTable.tsx (4 planos, plano atual destacado, downgrade/upgrade)
✅ UpgradePrompt.tsx (componente reutilizável de gate de plano)
✅ Página /assinatura (plano atual + pricing table + portal button)
✅ Sidebar: item "Assinatura" com ícone CreditCard
✅ Vars Stripe + Resend no .env.example
```

### FASE 9 — MULTI-DOMINIO ❌ DESCARTADA

Fase planejada de suporte a múltiplos domínios (`salaopro.app`, etc). **Os domínios nunca foram registrados e a arquitetura foi descartada.** Plataforma opera sob domínio único `nexoomnix.com`.

Código remanescente não utilizado:

```text
src/lib/domain-config.ts                  — DOMAIN_MAP órfão, remover
src/middleware.ts (detecção hostname)     — simplificar, remover multi-domain
```

### FASE 10 — DEPLOY E ESCALA ✅ 100%

```
✅ @vercel/analytics + @vercel/speed-insights instalados e no RootLayout
✅ robots.ts e sitemap.ts (landing pages indexadas, /dashboard bloqueado)
✅ error.tsx global + not-found.tsx
✅ vercel.json com security headers (X-Frame-Options, CSP, etc.)
✅ next.config.mjs (suporta *.fal.media e *.fal.ai para ContentAI)
✅ Stripe lazy singleton (não crasha sem STRIPE_SECRET_KEY no build)
✅ Resend lazy init (não crasha sem RESEND_API_KEY no build)
✅ n8n + Stripe webhook routes: await createServiceClient() corrigido
✅ Stripe apiVersion atualizado para 2026-03-25.dahlia
✅ ESLint config corrigido (removido next/typescript inexistente)
✅ globals.css: removido @apply border-border (classe inexistente no Tailwind)
✅ export const dynamic = force-dynamic nos layouts auth + dashboard
✅ npm run build limpo: 46 páginas geradas sem erros
✅ .env.example atualizado com todas as variáveis
⬜ App mobile (React Native / Expo) — fase futura
```

### DEPLOY VERCEL — CHECKLIST

```
1. Configurar variáveis de ambiente no Vercel Dashboard:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY
   - STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - STRIPE_PRICE_STARTER/PRO/PRO_PLUS/ENTERPRISE
   - RESEND_API_KEY
   - FAL_KEY
   - ELEVENLABS_API_KEY
   - DB8_AGENT_URL=https://api.db8intelligence.com.br
   - N8N_WEBHOOK_TOKEN
   - NEXT_PUBLIC_APP_URL=https://nexoomnix.com

2. Domínio customizado no Vercel:
   - nexoomnix.com → projeto principal (único domínio real)

3. Stripe Webhook: registrar https://nexoomnix.com/api/webhooks/stripe
   Eventos: checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed

4. Supabase: aplicar migrations 001 → 006 em produção
   npx supabase db push

5. Supabase Storage: criar buckets 'properties' e 'content' (public)
```

TODAS AS FASES 1-10 CONCLUIDAS. 52 paginas em producao, build limpo.

### FASE 11 — POST-LAUNCH FEATURES (em desenvolvimento)

Features construídas depois do fechamento da FASE 10, ainda não deployadas em prod:

```text
✅ PRO MAX plan — Meta API autopost + Social Hub
✅ Content Personas (migration 008) — persona de IA persistente por tenant
✅ Meta Autopost (migration 009) — social_media_connections + scheduled_posts
✅ Branding Profile wizard (migration 011) — perfil de marca reutilizado em todos os prompts
✅ Agent Skills Factory (migration 012) — agentes IA + skills por nicho + workflows n8n
✅ Omnix CRM (migration 013) — pipelines de vendas e atendimento + Kanban drag & drop
✅ Rotas novas: /admin/skills, /crm, /cursos, /estoque
✅ APIs novas: /api/branding, /api/crm, /api/meta, /api/skills
```

> ℹ️ Várias features experimentais foram retiradas do escopo (código + schema)
> em Sprint Cleanup 3 (2026-04-29). Detalhes em CLEAN STATE GUARANTEE no fim.

### ARCHITECTURE REFACTOR — Sprints 0-11 (Abr 2026) ✅

Refactor estrutural concluído em 12 sprints. Saiu de "tudo em `src/lib/`" para arquitetura modular com contratos, use cases e ADRs operacionais. Branch local 15 commits ahead de origin/main, ainda não mergeada.

```text
✅ Sprint 0  — src/modules/ scaffolding + remoção de multi-domain legacy
✅ Sprint 1  — Email integration contract + primeira use case
✅ Sprint 2  — tenant-context helper + 3 rotas migradas
✅ Sprint 3  — tenant-context aplicado em 6 rotas restantes
✅ Sprint 4  — Billing contract + create-checkout use case
✅ Sprint 5  — Billing portal use case + ADR-0002 (webhook fora do BillingProvider)
✅ Sprint 6  — Stripe webhook side effects movidos para use cases
✅ Sprint 7  — Stripe webhook idempotency (anti-replay)
✅ Sprint 9  — getTenantWithRow helper + 2 rotas Group C migradas
✅ Sprint 10 — Stripe webhook zombie cleanup tool (script ops)
✅ Sprint 11 — Stripe webhook stats tool + runbook operacional expandido
```

**ADR-0002 (decisão arquitetural permanente):** webhook Stripe NÃO entra no BillingProvider. Validação HMAC fica no route handler; side effects ficam em use cases. Não reverter.

### SPRINT COST CONTROL — Proteção de provedores pagos (Abr 2026) ✅

4 camadas de defesa para todas as integrações de IA paga. Migration 023 (`ai_usage`) aplicada em prod. 14 rotas AI cobertas.

```text
✅ Camada 1 — Simulation mode  (SIMULATE_AI=true bypass total para dev)
✅ Camada 2 — Rate limit       (por tenant/dia: text=20, image=10, tts=5)
✅ Camada 3 — Feature gate     (text=all, image=pro+, tts=pro_max+)
✅ Camada 4 — Audit log        (console + linha em ai_usage por chamada)

Helper: src/modules/platform/ai-cost-control/index.ts → guardAICall()
Tabela: ai_usage (tenant_id, kind, route, plan, cost_estimate, created_at)
Rotas:  /api/ai/* · /api/content-ai/*
```

**REGRA CRÍTICA:** toda nova rota que invoque Anthropic, Fal.ai, ElevenLabs, OpenAI TTS, Replicate ou qualquer provider pago de IA deve obrigatoriamente passar por `guardAICall()` antes da chamada externa. Sem exceção — rate limit + plan gate são pré-condição arquitetural.

Limites em `src/modules/platform/ai-cost-control/rate-limit.ts` (const `DAILY_LIMITS`). Ajustar lá quando o tráfego crescer.

### DEPLOY ALTERNATIVO — Cloud Run (Fase A1) ⚠️ PREPARADO, NÃO DEPLOYADO

Migração GCP incremental: Cloud Run primeiro, mantendo Supabase/Auth/Storage/n8n/Railway no estado atual. Big bang descartado.

**Estado atual:** Fase A1 (preparação) concluída. Arquivos no working tree, ainda **não commitados** e ainda **não deployados**.

```text
⚠️ next.config.mjs        → output: 'standalone'  (uncommitted)
⚠️ Dockerfile             → multi-stage, Node 20 Alpine, ~150-200 MB  (uncommitted)
⚠️ .dockerignore          → exclui git/node_modules/.next/.env*  (uncommitted)
⚠️ docs/deploy/cloud-run.md → runbook completo A1→A2→A3→A4  (uncommitted)
```

**Roteiro restante:**

| Fase | Status | Ação |
|---|---|---|
| A1 | ✅ preparado | Dockerfile + standalone + dockerignore + runbook |
| A2 | ⬜ pendente | `docker build` local + `gcloud run deploy --source .` → URL provisória + smoke test |
| A3 | ⬜ pendente | Cloud Scheduler para `/api/cron/publish-scheduled` e `/api/cron/generate-scheduled` (substitui `vercel.json` crons) |
| A4 | ⬜ pendente | DNS swap `nexoomnix.com` → Cloud Run + atualizar Stripe webhook URL + desabilitar crons Vercel |

**Não migrar:** Supabase, n8n (Railway), db8-agent (Railway), provedores externos (Stripe, Resend, Anthropic, Fal.ai, ElevenLabs, OpenAI, Canva, Meta). Vercel pode ficar de standby pós-A4 para rollback rápido.

### STATUS (2026-04-29)

```text
✅ Cleanup completo (features experimentais retiradas do escopo)
✅ Schema alinhado com produto real (migration 024 aplicada em produção)
✅ Billing simplificado (somente planos principais, sem add-ons)
✅ Infra base funcional (Cloud Run preparado + Supabase ativo)
✅ Domínio customizado: nexoomnix.com
✅ Migrations 001-024 aplicadas em prod
```

🔴 **Pendências reais** (path-to-revenue):

```text
⬜ Validar Stripe Live (checkout + webhook em https://nexoomnix.com/api/webhooks/stripe)
⬜ Validar Resend (welcome / payment_failed / trial_ending emails)
⬜ Smoke test end-to-end (cadastro → trial → checkout → login → feature Pro)
⬜ Resolver 8 vulnerabilidades Dependabot (4 high, 4 moderate)
```

🟠 **Migração GCP — Cloud Run** (incremental, opcional):

```text
✅ Fase A1 — Dockerfile + standalone + cloudbuild.yaml preparados
⬜ Fase A2 — docker build local + deploy Cloud Run em URL provisória
⬜ Fase A3 — Cloud Scheduler substitui crons Vercel
⬜ Fase A4 — DNS swap nexoomnix.com → Cloud Run + atualizar Stripe webhook URL
```

🟡 **Pós-Cleanup manual** (fora de código):

```text
⬜ Drop bucket Supabase Storage 'properties' (vazio) via Dashboard
⬜ Archive Stripe product de add-on legacy via dashboard.stripe.com
⬜ Remover env var legacy de add-on no Vercel/Cloud Run
```

### FIREBASE V2 FOUNDATION ⚠️ BASE PARALELA — NÃO USAR PARA APP V1

Base Firebase limpa e fechada (`deny-all`) provisionada no projeto GCP `db8-nexoomnix`. **Sem conexão com o app V1 atual** (Supabase + Cloud Run). Decisão sobre uso (V2 do produto, piloto, eventual migração) está pendente — fora do escopo deste setup.

| Componente | Estado |
|---|---|
| Projeto GCP | `db8-nexoomnix` |
| Firestore | `(default)` Native em `us-central1` |
| Auth | Identity Platform com Email/Password habilitado |
| Storage | bucket `gs://db8-nexoomnix-default` |
| Regras atuais | **deny-all** (Firestore + Storage) |
| Uso atual | base paralela V2, sem conexão com app Supabase atual |

Provisionamento idempotente via [`scripts/provision-firebase-base.mjs`](scripts/provision-firebase-base.mjs). Regras em [`firebase/firestore.rules`](firebase/firestore.rules) e [`firebase/storage.rules`](firebase/storage.rules). Documentação completa: [`docs/firebase/base.md`](docs/firebase/base.md).

**Cloud Functions já implementadas:**

| Função | Tipo | Trigger | Notas |
|---|---|---|---|
| `authOnCreate` | **Gen 1** (obrigatório) | `providers/firebase.auth/eventTypes/user.create` | Cria `users/{uid}` ao signup. Idempotente. |
| `membershipsOnWrite` | **Gen 1** (obrigatório, ver gotcha 3) | `providers/cloud.firestore/eventTypes/document.write` em `memberships/{id}` | Sincroniza custom claims `tenants[]` + `roles{}` a partir de memberships ativos do user. Idempotente (re-query + compare JSON). |
| `createTenant` | **Gen 1** HTTPS callable | HTTP `--allow-unauthenticated` (auth via `context.auth`) | Onboarding atômico em transação Firestore: cria `slugs/{slug}` + `tenants/{tid}` + `memberships/{uid}__{tid}` + atualiza `users/{uid}.defaultTenantId` (apenas no primeiro tenant) + `audit_logs/{lid}`. Retorna `{ tenantId, membershipId, isFirstTenant }`. Múltiplos tenants permitidos por user. Pós-call, `membershipsOnWrite` sincroniza custom claims em chain. |

**Composite indexes Firestore** (em [`firebase/firestore.indexes.json`](firebase/firestore.indexes.json)):

- `memberships(userId, status)` — query do `membershipsOnWrite`

**Armadilhas de deploy registradas** (válidas para próximas funções):

1. **Auth triggers só funcionam em Gen 1** — Firebase Auth (`functions.auth.user().onCreate(...)`) não tem equivalente Gen 2. Ao usar `gcloud functions deploy` é obrigatório `--no-gen2` (default desde Cloud SDK 492 é Gen 2).
2. **Deploy via `gcloud functions deploy` (não via `firebase deploy`) exige `--set-env-vars=GCLOUD_PROJECT=db8-nexoomnix`** — `firebase-functions/v1` falha em runtime com `process.env.GCLOUD_PROJECT is not set` quando essa env não é injetada. `firebase deploy` (firebase-tools) injeta automaticamente; `gcloud functions deploy` não.
3. **Firestore triggers Gen 2 via `gcloud functions deploy` não decodificam payload** — ao deployar com `--gen2 --trigger-event-filters-path-pattern="document=memberships/{id}"`, o trigger criado é Eventarc raw que o SDK `firebase-functions/v2/firestore` não decodifica como esperado: `event.data.before.data()` e `event.data.after.data()` retornam `undefined` mesmo em create de documento populado. **Para este projeto, usar Gen 1 (`firebase-functions/v1/firestore`) para triggers Auth/Firestore quando deployar via `gcloud functions deploy`.** Alternativa: usar `firebase deploy` (firebase-tools) se quisermos Gen 2 no futuro — esse caminho configura o trigger no formato que o SDK Gen 2 reconhece.

Design de demais funções planejadas: [`docs/firebase/cloud-functions.md`](docs/firebase/cloud-functions.md). Modelo de dados: [`docs/firebase/data-model.md`](docs/firebase/data-model.md). Validação contra fluxos V1: [`docs/firebase/model-validation.md`](docs/firebase/model-validation.md).

**Não fazer** sem decisão explícita: Web App registration, modelagem Firestore além do design atual, OAuth providers, integração com app V1, conexão a APIs externas.

---

## 🗂️ REPOSITORIOS DB8-INTELLIGENCE

| Repo | Status | Acao |
|------|--------|------|
| nexopro (este) | ATIVO — base unica | Desenvolver tudo aqui |
| db8-agent | ATIVO Railway Python/FastAPI | Expandir nas Fases 6-7 |
| nexopro-hub | Duplicata | Arquivar imediatamente |
| db8-engine | Verificar conteudo | Avaliar antes de arquivar |

---

## 📞 CONTEXTO DO PROJETO

- Formacao: Contador + Corretor + Avaliador
- Stack de trabalho: Claude Code (Antigravity), Cursor, Lovable
- Objetivo: SaaS multi-nicho com receita recorrente (MRR)
- Nichos prioritarios: Beleza e Servicos Tecnicos
- Meta de curto prazo: 100 clientes pagantes em 90 dias
- Stack IMUTAVEL: Next.js + Supabase + Vercel + Railway (db8-agent + n8n)

Ultima atualizacao: Marco 2026

## NexoOmnix Skills MCP (Repo separado)

O servidor MCP que expõe as skills DB8 como ferramentas Claude Code foi extraído para repo independente:

- Repositório: <https://github.com/DB8-Intelligence/nexoomnix-skills-mcp> (private)
- Location local: `~/nexoomnix-skills-mcp` (fora deste repo, pasta irmã)
- Contém: 10 skills (WhatsApp, Reels, Social, Instagram viral engine) + factory n8n
- Factory: `workflow-generator.mjs` gera 27 workflows (13 nichos × 2 tipos + skill-factory)
- Sync: `sync-n8n.mjs` publica em <https://automacao.db8intelligence.com.br>
- Status: ativo, 28 workflows publicados no Railway n8n

NÃO duplicar desenvolvimento de skills aqui — trabalhar no repo nexoomnix-skills-mcp.
Os JSONs soltos em `n8n/` deste repo são legacy (pré-factory) e devem sair futuramente.

---

### CLEAN STATE GUARANTEE (2026-04-29)

O sistema **NÃO possui mais**:

- suporte a nicho imobiliário
- pipeline Reel Creator
- addon talking_objects
- dependências diretas de SDKs de IA (todas as chamadas passam por `guardAICall()`)

Qualquer reintrodução desses elementos deve ser tratada como **nova feature** — com discovery, design, ADR e migration próprios. Não restaurar código a partir de history como se fosse rollback.
