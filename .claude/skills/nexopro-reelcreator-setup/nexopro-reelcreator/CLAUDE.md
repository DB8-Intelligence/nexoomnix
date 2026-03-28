# NexoPro — ReelCreator AI
## Instruções para Claude Code (lido automaticamente em toda sessão)

---

## 🏗️ Visão Geral do Projeto

**ReelCreator** é um SaaS brasileiro de geração de conteúdo para Instagram com IA,
parte do ecossistema **NexoPro**. Permite que qualquer criador ou empresa gere
roteiros de Reels, prompts de imagem AI, legendas e estratégias virais a partir de
análise de perfil ou briefing de nicho.

**Stack:**
- Frontend: Next.js 14+ (App Router)
- Backend/DB: Supabase (auth + banco + storage)
- Deploy: Vercel
- IA: Anthropic Claude API (claude-sonnet-4-20250514)
- Pagamentos: Stripe
- Automação: n8n
- IDE principal: Antigravity + Claude Code via terminal

**Repositório:** github.com/DB8-Intelligence/nexopro-reelcreator

---

## 🧠 Skills de IA Carregadas

Ao trabalhar em qualquer feature de geração de conteúdo, SEMPRE consultar:

| Skill | Caminho | Quando usar |
|-------|---------|-------------|
| Instagram Viral Engine | `.claude/skills/instagram-viral-engine.md` | Análise de perfil, estratégia viral, qualquer nicho |
| Reel Content Generator | `.claude/skills/reel-content-generator.md` | Roteiro de cenas, prompts AI, talking objects, CTAs |

**Como referenciar no código:**
```typescript
// As skills são carregadas como system prompts na API Anthropic
// Ver: src/lib/ai/skills.ts
import { instagramViralEngine, reelContentGenerator } from '@/lib/ai/skills'
```

---

## 📁 Estrutura do Projeto

```
nexopro-reelcreator/
├── CLAUDE.md                          ← ESTE ARQUIVO (lido automaticamente)
├── .claude/
│   ├── skills/
│   │   ├── instagram-viral-engine.md  ← skill de análise de perfil
│   │   └── reel-content-generator.md  ← skill de geração de reel
│   └── prompts/
│       ├── system-base.md             ← prompt base do produto
│       └── api-templates.md           ← templates de chamada API
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── analyzer/              ← análise de perfil Instagram
│   │   │   ├── generator/             ← gerador de reel/post
│   │   │   └── calendar/             ← calendário de conteúdo
│   │   └── api/
│   │       ├── analyze/route.ts       ← endpoint análise de perfil
│   │       ├── generate/route.ts      ← endpoint geração de conteúdo
│   │       └── webhook/               ← webhooks Stripe + n8n
│   └── lib/
│       ├── ai/
│       │   ├── skills.ts              ← carrega skills como system prompts
│       │   ├── analyzer.ts            ← lógica de análise de perfil
│       │   └── generator.ts           ← lógica de geração de conteúdo
│       └── supabase/
│           └── client.ts
├── docs/
│   ├── architecture.md
│   └── skills-usage.md
└── skills/                            ← skills empacotadas (.skill) para versionamento
    ├── instagram-viral-engine.skill
    └── reel-content-generator.skill
```

---

## 🔑 Variáveis de Ambiente

```env
# .env.local (nunca commitar)
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 🎯 Planos do Produto

| Plano | Reels/mês | Análises | Talking Objects | Calendário |
|-------|-----------|----------|-----------------|------------|
| Free | 5 | 1 | ❌ | ❌ |
| Basic R$47/mês | 30 | 5 | ✅ | ❌ |
| Pro R$97/mês | 100 | Ilimitado | ✅ | ✅ |
| Enterprise R$297/mês | Ilimitado | Ilimitado | ✅ | ✅ |

---

## ⚙️ Convenções de Código

- TypeScript strict mode sempre
- Server Components por padrão, Client Components apenas quando necessário
- API routes em `src/app/api/` com validação Zod
- Supabase RLS habilitado em todas as tabelas
- Todas as chamadas Claude API passam por `src/lib/ai/` — nunca direto nos componentes
- Comentários em português nos arquivos de negócio, inglês no código técnico
