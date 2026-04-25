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

Toda a plataforma, todos os nichos, todas as landing pages e todas as features vivem sob a árvore de `nexoomnix.com`. Landing pages por nicho são rotas (`/reelcreator`, `/salaopro`, etc.), não domínios separados.

> ⚠️ **Nota histórica:** versões anteriores deste CLAUDE.md mencionavam domínios alternativos (imobpro.app, salaopro.app, reelcreator.app, nexopro.app) como parte de uma arquitetura multi-domínio. **Esses domínios nunca foram registrados e foram descartados.** O código em `src/lib/domain-config.ts` e o middleware de detecção de hostname são **legacy não utilizados** — podem ser removidos quando oportuno.

---

## 🏗️ STACK TÉCNICA — NUNCA ALTERAR SEM APROVAÇÃO

```
Frontend:   Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend DB: Supabase (PostgreSQL + Auth + Storage + Realtime)
Backend IA: db8-agent (Python/FastAPI) no Railway — MANTER, nunca migrar
Automação:  n8n no Railway — MANTER
Deploy:     Vercel (preview automático em cada PR)
IA texto:   Anthropic API — claude-sonnet-4-20250514
IA imagem:  Fal.ai (Flux Pro) — para ContentAI
IA voz:     ElevenLabs API — para ContentAI
Pagamento:  Stripe (fase 8 — ainda não implementado)
Email:      Resend (fase 8 — ainda não implementado)
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
  Workflows ativos:
    ImobCreator Central Router
    (video_completed, video_failed, creative_ready, new_user)

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
│   │   │   ├── imoveis/                      <- MODULO IMOB (Fase 6)
│   │   │   │   ├── inbox/page.tsx
│   │   │   │   ├── editor/[id]/page.tsx
│   │   │   │   ├── upload/page.tsx
│   │   │   │   ├── posts/page.tsx
│   │   │   │   ├── templates/page.tsx
│   │   │   │   └── brand-templates/page.tsx
│   │   │   └── conteudo/                     <- MODULO CONTENTAI (Fase 7)
│   │   │       ├── page.tsx                  <- wizard 6 etapas
│   │   │       ├── novo/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── gerar-conteudo/route.ts   <- EXISTE
│   │   │   │   └── contador/route.ts         <- EXISTE
│   │   │   ├── imoveis/                      <- proxy db8-agent (Fase 6)
│   │   │   │   ├── properties/route.ts
│   │   │   │   ├── properties/[id]/route.ts
│   │   │   │   ├── generate-caption/route.ts
│   │   │   │   └── generate-video/route.ts
│   │   │   ├── content-ai/                   <- ContentAI (Fase 7)
│   │   │   │   ├── analyze/route.ts
│   │   │   │   ├── generate-package/route.ts
│   │   │   │   ├── generate-images/route.ts
│   │   │   │   ├── generate-voice/route.ts
│   │   │   │   └── talking-objects/route.ts
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
│   │   ├── imoveis/                          <- migrar do imob-creator-studio (Fase 6)
│   │   │   ├── InboxTable.tsx
│   │   │   ├── PropertyEditor.tsx
│   │   │   ├── UploadForm.tsx
│   │   │   ├── TemplateGallery.tsx
│   │   │   └── VideoGenerator.tsx
│   │   ├── content-ai/                       <- ContentAI / ReelCreator (Fase 7)
│   │   │   ├── ContentWizard.tsx
│   │   │   ├── LinkInput.tsx
│   │   │   ├── AnalysisResult.tsx
│   │   │   ├── NichoConfig.tsx
│   │   │   ├── TalkingObjectSelector.tsx
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
│   │   ├── useProperties.ts     <- criar Fase 6
│   │   └── useContentAI.ts      <- criar Fase 7
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        <- EXISTE
│   │   │   ├── server.ts        <- EXISTE
│   │   │   └── types.ts         <- EXISTE
│   │   ├── db8-agent.ts         <- criar Fase 6 (cliente HTTP Railway)
│   │   ├── niche-config.ts      <- EXISTE
│   │   ├── plan-config.ts       <- EXISTE
│   │   ├── utils.ts             <- EXISTE
│   │   ├── ai.ts                <- EXISTE (cliente Anthropic)
│   │   └── content-ai/
│   │       ├── talking-objects.ts  <- criar Fase 7
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
│       ├── 004_imob_module.sql          <- criar Fase 6
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
  | 'imoveis'     // Corretor / Imobiliaria / Avaliacao / Contab. Imobiliaria
  | 'beleza'      // Salao / Barbearia
  | 'tecnico'     // Servicos Tecnicos / Manutencao
  | 'saude'       // Clinica / Consultorio / Dentista
  | 'juridico'    // Advocacia / Cartorio
  | 'pet'         // Veterinario / Pet Shop
  | 'educacao'    // Educacao / Idiomas / Cursos
  | 'nutricao'    // Nutricao / Personal Trainer
  | 'engenharia'  // Engenharia / Arquitetura
  | 'fotografia'  // Fotografia / Video / Producao
  | 'gastronomia' // Restaurante / Bar / Delivery (add migration 010)
  | 'fitness'     // Academia / Crossfit / Fitness (add migration 010)
  | 'financas'    // Contabilidade / Consultoria Financeira (add migration 010)
```

Constraint no banco: `tenants_niche_check` em [migration 010](supabase/migrations/010_talking_objects_addon.sql#L16-L22).

Config em: `src/lib/niche-config.ts`

---

## 💳 PLANOS E MODULOS

```
trial      -> 14 dias, funcionalidades do starter
starter    -> R$ 99/mes — ate 100 clientes, agenda basica, financeiro simples
pro        -> R$199/mes — ilimitado, financeiro completo, site publico, 10 posts IA/mes
pro_plus   -> R$349/mes — tudo pro + ContentAI ilimitado, talking objects,
                          NFS-e, DAS/ISS automatico, DRE, Agente IA 24h
pro_max    -> R$499/mes — tudo pro_plus + Meta API autopost, Reel Analyzer,
                          Social Hub multi-conta, agente avancado
enterprise -> R$699/mes — tudo pro_max + multi-usuarios (ate 10), API, gerente dedicado
```

**Add-ons (Stripe sub separada, qualquer plano):**

- Talking Objects: `tenants.addon_talking_objects` (migration 010)

Regra critica: verificar tenant.plan antes de renderizar features.
Usar isPlanAtLeast('pro_plus') de hooks/useAuth.ts.

### Limites ContentAI por plano
```typescript
export const CONTENT_PLAN_LIMITS = {
  trial:      { video_seconds: 0,  projects_day: 1,  images: 3,  talking_objects: false },
  starter:    { video_seconds: 0,  projects_day: 3,  images: 5,  talking_objects: false },
  pro:        { video_seconds: 45, projects_day: 10, images: 10, talking_objects: true  },
  pro_plus:   { video_seconds: 60, projects_day: -1, images: 10, talking_objects: true  },
  enterprise: { video_seconds: 60, projects_day: -1, images: 10, talking_objects: true  },
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
Imob:                  properties · property_media · brand_templates
Estoque/Cursos:        products · courses · course_enrollments
Sistema:               notifications · activity_logs
─── pós-migration 007 ───
Content Personas (008): tenant_settings.content_persona_id
Meta Autopost (009):    social_media_connections · scheduled_posts
Talking Objects (010):  tenants.addon_talking_objects + novos nichos
Branding (011):         tenant_settings.branding_*
Agent Skills (012):     agent_skills · skill_generation_log
CRM Pipeline (013):     crm_pipelines · crm_stages · crm_deals
                        crm_deal_channels · crm_activities
                        crm_messages · crm_message_templates
AI Cost Control (023):  ai_usage  (rate limit + audit trail por tenant/tipo)
```

> Migration 023 aplicada em prod via MCP Supabase em 2026-04-24. Validar se ainda está consistente antes do próximo release.

### A criar — 004_imob_module.sql (Fase 6) ✅ APLICADA
```sql
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  title TEXT, description TEXT, price TEXT,
  city TEXT, neighborhood TEXT,
  property_type TEXT, property_standard TEXT,
  investment_value NUMERIC, built_area_m2 NUMERIC,
  highlights TEXT, cover_url TEXT,
  images TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new', source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON properties USING (tenant_id = get_tenant_id());

CREATE TABLE IF NOT EXISTS property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  url TEXT NOT NULL, type TEXT DEFAULT 'image',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brand_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT, config JSONB, preview_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE brand_templates ENABLE ROW LEVEL SECURITY;
```

### A criar — 005_content_ai.sql (Fase 7)
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
  talking_object_options JSONB, talking_object_selected JSONB,
  plan_at_creation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON content_projects USING (tenant_id = get_tenant_id());
```

RLS ATIVO EM TODAS AS TABELAS. Sempre usar get_tenant_id() nas politicas.

---

## 🔗 CLIENTE HTTP PARA O DB8-AGENT (criar na Fase 6)

```typescript
// src/lib/db8-agent.ts
const DB8_AGENT_URL = process.env.DB8_AGENT_URL!

export async function db8Fetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DB8_AGENT_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`db8-agent error ${res.status}: ${error}`)
  }
  return res.json()
}
// Exemplos:
// db8Fetch('/properties')
// db8Fetch('/generate-caption', { method: 'POST', body: JSON.stringify({...}) })
// Para generate-video usar FormData direto (nao JSON)
```

---

## 🎭 TALKING OBJECTS — 5 POR NICHO (criar na Fase 7)

```typescript
// src/lib/content-ai/talking-objects.ts
export const TALKING_OBJECTS = {
  imoveis: [
    { id: 'house_key', name: 'Chave de Casa', emoji: '🔑',
      prompt: 'A magical golden house key character with expressive friendly face, glowing eyes, floating in warm light, photorealistic 3D render, Pixar-like quality, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'sold_sign', name: 'Placa VENDIDO', emoji: '🏠',
      prompt: 'An animated Brazilian VENDIDO real estate sign character with happy expressive face, bold red and white colors, 3D render, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'contract', name: 'Contrato', emoji: '📄',
      prompt: 'An animated official real estate contract character with reading glasses and trustworthy face, professional blue tones, 3D render, lip-sync mouth, aspect ratio 9:16' },
    { id: 'apartment_window', name: 'Janela com Vista', emoji: '🪟',
      prompt: 'A beautiful apartment window character with warm welcoming face, ocean view through glass, golden hour lighting, 3D animated style, lip-sync ready, aspect ratio 9:16' },
    { id: 'house_robot', name: 'Robo Corretor', emoji: '🤖',
      prompt: 'A friendly real estate robot character in tiny blazer, holding miniature house, metallic silver with gold accents, Pixar-style 3D, expressive lip-sync face, aspect ratio 9:16' },
  ],
  beleza: [
    { id: 'scissors', name: 'Tesoura Magica', emoji: '✂️',
      prompt: 'An animated magical hair scissors character with sparkly personality, rainbow sheen, expressive lip-sync face, salon background, 3D Pixar render, aspect ratio 9:16' },
    { id: 'mirror', name: 'Espelho da Beleza', emoji: '🪞',
      prompt: 'A glamorous vanity mirror character, ornate gold frame, flirty expressive face, beauty salon, 3D Pixar style, lip-sync ready, aspect ratio 9:16' },
    { id: 'hair_brush', name: 'Escova Profissional', emoji: '💇',
      prompt: 'A professional hair brush character with wavy hair flowing, warm friendly face, salon context, 3D render, lip-sync mouth, aspect ratio 9:16' },
    { id: 'nail_polish', name: 'Esmalte Animado', emoji: '💅',
      prompt: 'An animated nail polish bottle character, glamorous sparkly personality, expressive face, beauty context, 3D Pixar render, lip-sync mouth, aspect ratio 9:16' },
    { id: 'hair_dryer', name: 'Secador Falante', emoji: '💨',
      prompt: 'A friendly hair dryer character blowing colorful wind, expressive animated face, salon environment, 3D render, lip-sync ready, aspect ratio 9:16' },
  ],
  saude: [
    { id: 'stethoscope', name: 'Estetoscopio', emoji: '🩺',
      prompt: 'An animated medical stethoscope character with caring face, doctor look, clinical environment, 3D render, lip-sync ready mouth, aspect ratio 9:16' },
    { id: 'medical_chart', name: 'Prontuario', emoji: '📊',
      prompt: 'An animated medical chart clipboard character, reading glasses, helpful expression, 3D medical aesthetic, lip-sync mouth, aspect ratio 9:16' },
    { id: 'tooth', name: 'Dente Feliz', emoji: '🦷',
      prompt: 'A cheerful animated tooth character with wide smile, clean white, dental clinic background, 3D Pixar style, lip-sync ready, aspect ratio 9:16' },
    { id: 'pill', name: 'Capsula Saudavel', emoji: '💊',
      prompt: 'A friendly medicine capsule character half red half white, health-focused, clean background, 3D animated, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'heart', name: 'Coracao Animado', emoji: '❤️',
      prompt: 'An animated healthy heart character, energetic personality, red with golden highlights, fitness context, 3D Pixar style, lip-sync face, aspect ratio 9:16' },
  ],
  juridico: [
    { id: 'law_book', name: 'Livro de Leis', emoji: '⚖️',
      prompt: 'An animated law book in burgundy leather, golden scales, wise authoritative face, 3D render, lip-sync mouth, legal setting, aspect ratio 9:16' },
    { id: 'gavel', name: 'Martelo do Juiz', emoji: '🔨',
      prompt: 'An animated judge gavel character, stern fair expression, wooden texture, courtroom background, 3D Pixar render, lip-sync face, aspect ratio 9:16' },
    { id: 'briefcase', name: 'Pasta do Advogado', emoji: '💼',
      prompt: 'A professional lawyer briefcase character with spectacles, dark leather, golden clasps, 3D render, lip-sync ready mouth, legal office, aspect ratio 9:16' },
    { id: 'shield', name: 'Escudo da Justica', emoji: '🛡️',
      prompt: 'An animated justice shield character, protective expression, blue and gold, legal protection concept, 3D Pixar style, lip-sync face, aspect ratio 9:16' },
    { id: 'contract_legal', name: 'Contrato Legal', emoji: '📜',
      prompt: 'An animated legal contract scroll character, official seal, trustworthy face, law firm setting, 3D render, lip-sync mouth, aspect ratio 9:16' },
  ],
  tecnico: [
    { id: 'wrench', name: 'Chave de Fenda', emoji: '🔧',
      prompt: 'An animated wrench character, expert confident expression, metallic silver, workshop background, 3D render, lip-sync mouth, aspect ratio 9:16' },
    { id: 'circuit', name: 'Placa de Circuito', emoji: '💡',
      prompt: 'An animated circuit board character, bright LED eyes, tech blue color, electronics workshop, 3D Pixar style, lip-sync ready face, aspect ratio 9:16' },
    { id: 'hard_hat', name: 'Capacete Tecnico', emoji: '⛑️',
      prompt: 'A friendly hard hat safety helmet character, expert look, yellow, construction setting, 3D render, expressive lip-sync face, aspect ratio 9:16' },
    { id: 'multimeter', name: 'Multimetro', emoji: '🔌',
      prompt: 'An animated multimeter character with digital display face, electrical testing tool, workshop background, 3D Pixar style, lip-sync ready, aspect ratio 9:16' },
    { id: 'gear', name: 'Engrenagem Mestre', emoji: '⚙️',
      prompt: 'An animated master gear character, mechanical expert expression, metallic with oil sheen, industrial setting, 3D render, lip-sync face, aspect ratio 9:16' },
  ],
} as const
```

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
- Rotas Next.js em `/api/imoveis/*` fazem proxy para o Railway
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
✅ 10 landing pages de nicho (salaopro, ordemdeservico, clinicapro, imobpro, juridicpro, petpro, educapro, nutripro, engepro, fotopro)
✅ NexoOmnixLanding (landing page principal de nexoomnix.com)
✅ Middleware: rotas públicas de todas as landing pages
```

### FASE 6 — MODULO IMOB (Migracao imob-creator-studio) ✅ 100%

```
✅ Migration 004_imob_module.sql (properties + property_media + brand_templates + RLS)
✅ DB8_AGENT_URL + N8N_WEBHOOK_TOKEN no .env.example
✅ src/lib/db8-agent.ts (cliente HTTP Railway — db8Fetch, db8Upload, db8Health)
✅ API routes /api/imoveis/generate-caption + generate-video (proxy db8-agent)
✅ API route /api/webhooks/n8n (video_completed, video_failed, creative_ready)
✅ Componentes: InboxTable + PropertyEditor + UploadForm + TemplateGallery + VideoGenerator
✅ Orchestradores: ImoveisInboxView + ImoveisEditorView + ImoveisUploadView
✅ Rotas: /imoveis (redirect) + /imoveis/inbox + /imoveis/editor/[id] + /imoveis/upload + /imoveis/posts + /imoveis/templates + /imoveis/brand-templates
✅ Hook useProperties.ts (createProperty, updateProperty, deleteProperty, generateCaption, generateVideo)
⬜ Apos validacao: arquivar imob-creator-studio no GitHub
```

### FASE 7 — CONTENTAI (ReelCreator dentro do nexopro) ✅ 100%

```
✅ Migration 005_content_ai.sql (content_projects + RLS + updated_at trigger)
✅ Types: ContentProject, ContentProjectStatus, ContentAnalysis, ContentCTA, ContentScene
✅ src/lib/content-ai/talking-objects.ts (5 personagens x 5 nichos)
✅ src/lib/content-ai/prompts.ts (buildAnalysisPrompt + buildPackagePrompt)
✅ API routes: analyze + generate-package + generate-images + generate-voice + talking-objects
✅ Hook useContentAI.ts (createProject, analyze, generatePackage, generateImages, generateVoice)
✅ Wizard 6 etapas: LinkInput → AnalysisResult → NichoConfig → TalkingObjectSelector → ImageGallery → PackagePreview → DeliveryScreen
✅ ContentWizard.tsx (orquestrador com StepIndicator)
✅ Rotas: /conteudo (wizard) + /conteudo/[id] (detalhe)
✅ FAL_KEY e ELEVENLABS_API_KEY no .env.example
⬜ Apos validacao: arquivar ReelCreator-AI no GitHub
```

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

Fase planejada de suporte a múltiplos domínios (imobpro.app, salaopro.app, reelcreator.app). **Os domínios nunca foram registrados e a arquitetura foi descartada.** Plataforma opera sob domínio único `nexoomnix.com`.

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
✅ ReelCreator AI completo — Fal.ai imagens + OpenAI TTS + Replicate SadTalker lip-sync + FFmpeg.wasm assembly
✅ Photo Object mode — personagem 3D Pixar/Disney escolhível
✅ Reference image library — biblioteca de estilos visuais
✅ PRO MAX plan — Meta API autopost + Reel Analyzer + Social Hub
✅ Content Personas (migration 008) — persona de IA persistente por tenant
✅ Meta Autopost (migration 009) — social_media_connections + scheduled_posts
✅ Talking Objects add-on (migration 010) — produto separado + nichos gastronomia/fitness/financas
✅ Branding Profile wizard (migration 011) — perfil de marca reutilizado em todos os prompts
✅ Agent Skills Factory (migration 012) — 7 agentes IA + skills por nicho + workflows n8n
✅ Omnix CRM 3 variantes (migration 013) — vendas, imobiliario, atendimento + Kanban drag & drop
✅ Rotas novas: /admin/skills, /crm, /cursos, /estoque, /reel-creator
✅ APIs novas: /api/branding, /api/crm, /api/meta, /api/reel-creator, /api/skills
```

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
Rotas:  /api/ai/* · /api/content-ai/* · /api/reel-creator/* (14 total)
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

### SPRINT 1 — PATH TO REVENUE (em andamento)

```text
⬜ Mergear branch atual em main via PR (15 commits ahead)
⬜ Aplicar migrations 008-013 em Supabase producao
⬜ Validar migration 023 (ai_usage) em prod — aplicada via MCP em 2026-04-24, confirmar consistência
✅ Domínio customizado no Vercel: nexoomnix.com (único domínio — multi-domain descartado)
⬜ Validar Stripe Live (webhook, price IDs, checkout real)
⬜ Validar Resend (email transacional)
⬜ Smoke test end-to-end: cadastro → trial → checkout → login → feature Pro
⬜ Resolver 11 vulnerabilidades Dependabot (6 high, 5 moderate)
⬜ Commitar arquivos Cloud Run Fase A1 (Dockerfile, .dockerignore, docs/deploy/, next.config.mjs)
⬜ Fase A2 — docker build local + deploy Cloud Run em URL provisória
⬜ Fase A3 — Cloud Scheduler substitui crons Vercel
⬜ Fase A4 — DNS swap nexoomnix.com → Cloud Run após validação
```

---

## 🗂️ REPOSITORIOS DB8-INTELLIGENCE

| Repo | Status | Acao |
|------|--------|------|
| nexopro (este) | ATIVO — base unica | Desenvolver tudo aqui |
| db8-agent | ATIVO Railway Python/FastAPI | Expandir nas Fases 6-7 |
| imob-creator-studio | Em uso | Arquivar apos Fase 6 |
| ReelCreator-AI | Skills criadas | Arquivar apos Fase 7 |
| nexopro-hub | Duplicata | Arquivar imediatamente |
| db8-engine | Verificar conteudo | Avaliar antes de arquivar |

---

## 📞 CONTEXTO DO PROJETO

- Formacao: Contador + Corretor de Imoveis + Avaliador de Imoveis
- Stack de trabalho: Claude Code (Antigravity), Cursor, Lovable
- Objetivo: SaaS multi-nicho com receita recorrente (MRR)
- Nichos prioritarios: Beleza e Servicos Tecnicos
- Meta de curto prazo: 100 clientes pagantes em 90 dias
- Stack IMUTAVEL: Next.js + Supabase + Vercel + Railway (db8-agent + n8n)

Ultima atualizacao: Marco 2026

## ViralObj (MVP Extraído)
O módulo de Talking Objects foi extraído para um projeto independente:
- Repositório: https://github.com/DB8-Intelligence/viralobj
- Status: MVP independente em produção
- Futuro: será reintegrado ao NexoOmnix como módulo quando o NexoOmnix estiver pronto

NÃO duplicar desenvolvimento — qualquer melhoria em Talking Objects
deve ser feita no repositório viralobj e importada de volta depois.

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
