# ADR-0001 — Module boundaries

- **Status:** Accepted
- **Data:** 2026-04-23
- **Autor:** Douglas Bonânzza (com Claude como pair arquitetural)

## Contexto

O código de domínio do NexoOmnix (multi-tenant SaaS Next.js) cresceu dentro de três pastas cross-cutting:

- `src/app/api/*` — 53 rotas, algumas com 400+ linhas combinando auth, fetch de tenant, integração com SDK externo e persistência.
- `src/components/*` — 60 componentes React. Os de feature chegam a 546 linhas (`RedesSociaisView`) e incluem validação, submit e lógica de negócio inline.
- `src/lib/*` — 18 arquivos com 3.286 linhas no total. Três arquivos concentram 1.863 linhas de configuração por nicho (`niche-config.ts` 603L, `content-personas.ts` 685L, `talking-objects.ts` 575L).

Sintomas observados:

- **Duplicação**: 19 rotas repetem o mesmo bloco `supabase.from('profiles').select('tenant_id').eq('id', user.id)`.
- **Acoplamento por camada técnica**: uma mudança de fluxo de negócio toca `app/` + `components/` + `lib/`, mesmo quando o domínio é único.
- **Integrações espalhadas**: `Anthropic` é instanciado diretamente em 7 rotas; `Fal.ai` e `Meta Graph` são chamados inline em handlers; `Resend` só é usado no webhook de Stripe.
- **Prompt engineering em N lugares**: os prompts de IA ficam em route handlers, não em um local versionado.
- **Config monolítica**: nicho é um `Record<NicheSlug, NicheConfig>` literal, sem override por tenant.
- **Ownership difuso**: não há um dono claro para "billing" ou "content" — mudanças cruzam N arquivos sob pastas diferentes.

## Decisão

Introduzir uma camada `src/modules/` organizada por **domínio de negócio**, adotando quatro sub-pastas internas em cada módulo:

```
modules/<domain>/
├── domain/            # Tipos puros, entidades, value objects
├── application/       # Use cases (sem I/O direto a SDK)
├── infra/             # Adapters Supabase + chamadas a SDKs externos
└── ui/                # (opcional) Componentes específicos do domínio
```

Regras de dependência:

- `domain/` não importa nada de fora do próprio módulo.
- `application/` importa `domain/` próprio e **interfaces** de `modules/platform/integrations/`.
- `infra/` implementa as interfaces e é a única camada que toca SDK externo ou a tabela Supabase.
- Rotas em `src/app/api/*` ficam finas: parse de request → validação → chamar um use case → formatar resposta.
- Componentes em `src/components/*` consomem apenas hooks ou API routes, nunca SDK externo diretamente.

Integrações externas (Stripe, Resend, Anthropic, Fal, ElevenLabs, n8n, db8-agent) migram para `modules/platform/integrations/<svc>/` com:

- Uma interface (contract) em `<svc>.ts`
- Uma ou mais implementações em `<svc>-<adapter>.ts`
- Um factory `index.ts` que escolhe a implementação a partir de env vars

A refatoração é **incremental**: cada fase preserva comportamento e pode ser mergeada sozinha. Nenhum rewrite.

## Alternativas consideradas

1. **Continuar com a estrutura atual e documentar convenções.** Rejeitado: convenções não-aplicadas por layout continuam sendo violadas. A dor de encontrar regras de negócio persiste.
2. **Adotar monorepo imediatamente** (`apps/web` + `services/worker` + `packages/domain`). Rejeitado por ora: só faz sentido quando existir segundo app (mobile, dashboard admin separado, backend Python compartilhando tipos). Hoje é complexidade sem retorno.
3. **DDD completo com CQRS e event sourcing.** Rejeitado: overengineering para o estágio do produto. Optamos por uma versão enxuta de domain-driven com separação `application/domain/infra` — o suficiente para desacoplar, sem sobrecarga conceitual.
4. **Organizar apenas por camada técnica** (`services/`, `repositories/`, `controllers/`). Rejeitado: replica o problema atual, só renomeia as pastas. Queremos proximidade por domínio para reduzir caça ao código.

## Consequências

### Benefícios esperados

- **Ownership claro**: uma alteração em "billing" toca arquivos sob `modules/billing/`.
- **Substituição de integração em um ponto**: trocar Stripe por Kiwify, Resend por SES, Anthropic por OpenAI mexe só no adapter.
- **Teste unitário viável**: use cases em `application/` são Node puro, sem Next.js — testam sem subir servidor.
- **Config por nicho versionada por arquivo**: `niches/<slug>/config.ts` em vez de entries num Record gigante.
- **Rotas API legíveis**: handlers de 15-30 linhas em vez de 200-400.
- **Preparado para crescer**: quando surgir um segundo app (mobile/admin), mover `modules/` para `packages/domain` é um passo mecânico.

### Custos e trade-offs

- **Transição temporariamente verbosa**: durante fases 1-4, código antigo em `lib/` convive com código novo em `modules/`. Pode haver confusão sobre onde escrever algo.
- **Curva de aprendizado**: nova convenção exige disciplina pra aplicar em PRs novos.
- **Possível tentação de "sobre-modularizar"**: módulos com uma única função não justificam 4 subpastas. Regra: só criar `domain/` + `application/` + `infra/` quando houver mais de 1 use case no módulo.
- **Aliases TypeScript**: `tsconfig.json` precisa conhecer `@/modules/*`. A convenção `@/*` atual já cobre se `baseUrl` apontar para `src/`.
- **Discoverability durante transição**: desenvolvedor precisa saber onde está o código de billing — em `modules/billing/` ou ainda em `lib/stripe.ts` + `app/api/stripe/*`. Esse atrito desaparece ao final da Fase 4.

### Impacto no comportamento

**Zero mudança funcional nesta fase**. A Fase 0 apenas cria a estrutura de pastas e documentação; não move arquivos existentes nem altera comportamento em produção. A única remoção é código de detecção multi-domain (`domain-config.ts` e redirects correspondentes no middleware) que já estava marcado como legacy em `CLAUDE.md` e nunca dispara em produção, pois os domínios `imobpro.app`, `salaopro.app`, `reelcreator.app` nunca foram registrados.

### Critérios de sucesso ao fim da Fase 4

- Nenhuma rota em `src/app/api/*` com mais de 50 linhas.
- Zero duplicação de fetch de `tenant_id` inline.
- Cada integração externa (Stripe, Resend, Anthropic, Fal, ElevenLabs, n8n) expõe uma interface em `platform/integrations/*` e tem pelo menos um adapter.
- `niche-config.ts` desmembrado em `platform/niches/<slug>/`.
- Middleware com menos de 50 linhas.
