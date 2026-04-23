# Arquitetura NexoOmnix

> Documento vivo. Atualizar a cada ADR aceito.

## 1. Visão geral

NexoOmnix é um SaaS multi-tenant multi-nicho construído em Next.js 14 (App Router) + Supabase (Postgres + Auth + Storage + RLS) + n8n (orquestração de workflows) + serviços Python auxiliares (FFmpeg, geração de vídeo) em Railway.

A aplicação web unifica 13 nichos de negócio sob o domínio `nexoomnix.com`, com módulos funcionais compartilhados (Agenda, CRM, Financeiro, Contabilidade, Content AI, Reel Creator, Social, Site Público) que se adaptam ao nicho do tenant.

```text
┌────────────────────────────────────────────────────────────────┐
│                    nexoomnix.com (Vercel)                      │
│  Next.js App Router: UI + auth gate + route handlers finos     │
└──────────────┬──────────────────────────────┬──────────────────┘
               │                              │
     ┌─────────▼─────────┐         ┌──────────▼──────────┐
     │  Supabase         │         │   n8n (Railway)     │
     │  Postgres + RLS   │         │   Workflows         │
     │  Auth + Storage   │         │   Credenciais       │
     └───────────────────┘         └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  db8-agent          │
                                   │  (FastAPI Python)   │
                                   │  FFmpeg, render     │
                                   └─────────────────────┘
```

### Responsabilidades por camada

| Camada            | O que faz                                                | O que NÃO faz                                   |
|-------------------|----------------------------------------------------------|-------------------------------------------------|
| Next.js (Vercel)  | UI, auth, validação de entrada, gate de plano, webhook signature, SSR, reads simples no Supabase | Processamento pesado, IA, render de vídeo, envio de email direto |
| n8n (Railway)     | Envio de email, chamadas de IA, geração de conteúdo, orquestração de reels, posts Meta/Instagram, cron | Persistência de estado de domínio                |
| Supabase          | Banco relacional, RLS por tenant, Auth, buckets de Storage | Lógica de negócio complexa (sem Edge Functions ativas) |
| db8-agent         | FFmpeg, render de vídeo, endpoints pesados que exigem binários nativos | CRUD de negócio                                 |

## 2. Objetivo da modularização

O código de domínio hoje está espalhado entre `src/app/api/*`, `src/components/*` e `src/lib/*`. Isso acelera entrega inicial, mas trava evolução:

- Rotas API misturam auth + fetch de tenant + integração com SDK externo + persistência no mesmo arquivo.
- Integrações externas (Stripe, Resend, Anthropic, Fal, ElevenLabs, n8n) são chamadas em pontos diferentes do código sem contract unificado.
- Configurações por nicho (`niche-config.ts`, `talking-objects.ts`, `content-personas.ts`) concentram milhares de linhas em 3 arquivos.
- `tenant_id` é refetchado inline em ~19 rotas API.

A modularização resolve isso introduzindo uma camada `src/modules/` organizada por **domínio de negócio**, com separação clara entre interface pública (contracts) e implementação (adapters).

## 3. O conceito de `src/modules/*`

```text
src/modules/
├── _shared/                    # Tipos e utilitários comuns a vários módulos
├── platform/                   # Cross-cutting: auth, tenant, niches, integrações
│   ├── auth/                   # Tenant context, roles
│   ├── tenants/                # CRUD de tenants e settings
│   ├── niches/                 # Registry dos 13 nichos
│   └── integrations/           # Contracts + adapters externos
│       ├── billing/            # Stripe (+ futuro Kiwify)
│       ├── email/              # Resend (+ futuro SES/null)
│       ├── ai/                 # Anthropic, OpenAI, Fal, ElevenLabs
│       ├── storage/            # Supabase Storage, R2
│       └── eventbus/           # n8n webhook emitter
├── billing/                    # Domínio de assinatura (checkout, portal, planos)
├── content/                    # Content AI, personas, reel creator
├── crm/                        # Pipelines, deals, atividades
├── agenda/                     # Appointments, scheduling
├── clientes/                   # Clientes
├── financeiro/                 # Transactions, categorias, contas
├── contabilidade/              # NFS-e, obrigações, DRE
├── imoveis/                    # Properties, templates
├── social/                     # Meta autopost, calendário editorial
└── site-publico/               # /s/[slug]
```

## 4. Regras básicas

Cada módulo de domínio segue o padrão:

```text
modules/<domain>/
├── domain/           # Entidades, value objects, tipos puros (sem I/O)
├── application/      # Use cases (orchestração: recebe inputs, chama infra, retorna DTOs)
├── infra/            # Implementações concretas: Supabase repo, HTTP clients, adapter calls
└── ui/               # (opcional) Componentes específicos do domínio
                     #  Na prática, seguem em src/components/<domain>/ por simetria com Next.
```

### Regras de dependência

- `domain/` **não importa nada** de fora do próprio módulo. Só tipos puros.
- `application/` importa de `domain/` próprio e de interfaces de `platform/integrations/`. Nunca de `infra/` de outro módulo.
- `infra/` importa de `domain/` próprio e pode usar SDKs externos. Nunca importado por `domain/`.
- `ui/` (ou `src/components/<domain>/`) só consome hooks ou o resultado de `application/` via API routes.
- `platform/integrations/<svc>/` expõe uma **interface** (contract) e uma ou mais **implementações** (adapters). Código de aplicação depende da interface, não do adapter.

### O que continua fora de `modules/`

- `src/app/` — roteamento e layouts do Next.js. Route handlers ficam finos: parse + validate + chamar use case.
- `src/components/` — componentes visuais genéricos (`ui/` shadcn) e componentes de feature.
- `src/hooks/` — hooks React client-side, próximos da UI.
- `src/lib/` — utilitários puros (`cn`, formatters). Encolhe conforme `modules/` absorve integrações.
- `src/types/database.ts` — tipos gerados pelo Supabase. Intocado.

## 5. ADRs (Architecture Decision Records)

Decisões arquiteturais são registradas como ADRs numerados em `docs/architecture/ADR-NNNN-*.md`. Formato: contexto → decisão → consequências. Um ADR aceito é imutável; mudanças vêm em novos ADRs que substituem os anteriores.

Índice:

- [ADR-0001 — Module boundaries](./ADR-0001-module-boundaries.md)
- [ADR-0002 — Stripe webhook stays outside the billing contract](./ADR-0002-stripe-webhook-outside-billing-contract.md)

## 6. Roadmap de refatoração

A migração é incremental, em fases que preservam comportamento:

| Fase | Escopo                                                           | Status          |
|------|------------------------------------------------------------------|-----------------|
| 0    | Criar estrutura `modules/` + docs + remover multi-domain legacy  | **em execução** |
| 1    | `getTenantContext()` e migração das ~19 rotas duplicadas         | pendente        |
| 2    | Contracts de Email, Billing, AI, EventBus + adapters atuais      | pendente        |
| 3    | Quebrar `niche-config`, `talking-objects`, `content-personas`    | pendente        |
| 4    | Extrair domínios pesados (billing, content, crm, agenda)         | pendente        |
| 5    | Middleware slim (<50 linhas)                                     | pendente        |
| 6    | Logger, Result type, error boundary padronizado                  | pendente        |
| 7    | Monorepo `apps/ services/ packages/`                             | adiado          |
