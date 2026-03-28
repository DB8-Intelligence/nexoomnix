# Como as Skills funcionam no ReelCreator

## Visão Geral

As skills são arquivos Markdown que contêm instruções especializadas para o Claude.
No ReelCreator, elas funcionam em **três camadas simultâneas**:

```
┌─────────────────────────────────────────────────┐
│  1. Claude Code (desenvolvimento)               │
│     CLAUDE.md + .claude/skills/*.md             │
│     → Claude entende o projeto e gera código    │
│       já alinhado com a lógica de negócio       │
├─────────────────────────────────────────────────┤
│  2. GitHub (versionamento)                      │
│     .claude/skills/*.md + skills/*.skill        │
│     → Skills versionadas junto com o código     │
│       Histórico de evolução preservado          │
├─────────────────────────────────────────────────┤
│  3. Produto (runtime para usuários)             │
│     src/lib/ai/skills.ts → API Anthropic        │
│     → Skills carregadas como system prompts     │
│       nas chamadas Claude feitas pelo usuário   │
└─────────────────────────────────────────────────┘
```

---

## Skills Disponíveis

### 1. `instagram-viral-engine`
**Arquivo:** `.claude/skills/instagram-viral-engine.md`
**Uso no produto:** `instagramViralEngine()` em `src/lib/ai/skills.ts`

Responsável por:
- Análise de perfil via prints/imagens
- Diagnóstico de engajamento
- Estratégia viral multi-nicho
- Calendário de conteúdo

### 2. `reel-content-generator`
**Arquivo:** `.claude/skills/reel-content-generator.md`
**Uso no produto:** `reelContentGenerator()` em `src/lib/ai/skills.ts`

Responsável por:
- Roteiro de cenas com timecodes
- Prompts de imagem AI (inglês, 9:16)
- Roteiro de voz com marcações
- Legendas em tela por frame
- Texto do post + hashtags estratificadas
- CTAs por objetivo
- Talking Objects (objetos falantes)
- Variações de conteúdo

---

## Como usar no Claude Code (terminal)

```bash
# Ao iniciar uma sessão Claude Code no projeto, ele lê CLAUDE.md automaticamente
# Não é necessário nenhum comando extra

# Exemplos de uso direto via terminal:
claude "Gere um reel viral para o nicho de imóveis de alto padrão em Salvador"
claude "Analise este perfil e sugira estratégia: [descrição]"
claude "Adicione a funcionalidade de talking objects no componente Generator"
```

---

## Como as skills são carregadas no runtime

```typescript
// src/app/api/generate/route.ts
import { reelContentGenerator } from '@/lib/ai/skills'

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: reelContentGenerator(),  // ← skill como system prompt
  messages: [{ role: 'user', content: userPrompt }]
})
```

```typescript
// src/app/api/analyze/route.ts
import { instagramViralEngine } from '@/lib/ai/skills'

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: instagramViralEngine(),  // ← skill como system prompt
  messages: [{ role: 'user', content: userPrompt }]
})
```

---

## Como atualizar uma skill

1. Editar o arquivo `.claude/skills/[nome].md`
2. Testar localmente com `claude "teste de geração para [nicho]"`
3. Atualizar o `.skill` empacotado em `skills/`:
   ```bash
   # Re-empacotar (se usar claude.ai para gerenciar skills)
   # Copiar o novo .skill para skills/
   cp ~/Downloads/nome-da-skill.skill skills/
   ```
4. Commitar ambos:
   ```bash
   git add .claude/skills/ skills/
   git commit -m "feat(skills): [descrição da melhoria]"
   ```

---

## Convenção de commits para skills

```
feat(skills): adiciona banco de ideias para nicho fitness
fix(skills): corrige formato de hashtags no reel-content-generator
refactor(skills): reorganiza módulos do instagram-viral-engine
```
