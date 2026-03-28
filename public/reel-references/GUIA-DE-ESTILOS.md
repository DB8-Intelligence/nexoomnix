# Guia de Estilos — Objetos Falantes Virais
> Análise das referências de reels de maior engajamento
> Última atualização: Março 2026

---

## ⚠️ INSIGHT CRÍTICO

O estilo mais viral **NÃO é Pixar/Disney 3D suave**.
O estilo dominante é **objeto fotorrealista com face expressiva embutida**.

---

## 3 Estilos Identificados

### ESTILO 1 — Fotorrealista + Face Expressiva ⭐ MAIS VIRAL
**Pasta:** `estilos/1-fotorrealista-face-expressiva/`

**Características:**
- O objeto MANTÉM sua textura real (tecido do edredom, couro do cinto, metal da lata)
- Face está EMBUTIDA na superfície do objeto (não flutuando por cima)
- Olhos grandes, salientes, com íris realista (castanho/verde/azul)
- Sobrancelhas espessas para expressão máxima
- Boca aberta com dentes visíveis e realistas
- Emoções extremamente exageradas (muito irritado, muito chocado)
- Ambiente de fundo é FOTO REAL (cozinha real, rua real, quarto real)
- Iluminação cinematográfica adaptada ao cenário

**Exemplos nas referências:**
- Edredom com cara irritada/assustada (2.698 likes)
- Lata de lixo com cara raivosa na pia (3.801 likes)
- Cinto de couro andando na chuva (72 likes)
- Porta de enrolar com cara furiosa

**Prompt base (inglês para Fal.ai):**
```
photorealistic [OBJECT] with an expressive cartoon face deeply embedded in its surface,
extremely angry/shocked expression, large bulging realistic eyes with detailed irises,
thick expressive eyebrows, wide open mouth with visible realistic teeth,
[OBJECT's natural texture: leather/fabric/metal] texture preserved,
placed in [REAL ENVIRONMENT: real kitchen/real street/real bedroom],
cinematic lighting, ultra-detailed, 8K resolution, hyperrealistic, 9:16 vertical
```

---

### ESTILO 2 — Miniatura Hiperreal em Cena Real ⭐⭐ MUITO VIRAL
**Pasta:** `estilos/3-miniatura-hiperreal/`

**Características:**
- Personagem parece uma miniatura física (action figure / estatueta)
- Corpo musculoso ou estilizado com textura plástica/borracha
- Colocado em cena real fotorrealista (em cima de uma superfície real)
- Proporção deliberadamente pequena em relação ao ambiente
- Expressão intensa mas com acabamento de brinquedo/figura de ação
- Movimento implícito (pose dinâmica, gesto expressivo)

**Exemplos nas referências:**
- Garrafa azul muscular limpando unha (132 likes)
- Garrafa azul muscular lavando escova (9.782 likes!) — MAIOR ENGAJAMENTO
- Garrafa azul muscular irritada com pessoa

**Prompt base:**
```
hyperrealistic miniature [OBJECT] action figure character with muscular body,
[COLOR] plastic/rubber texture, intense expression, dynamic action pose,
placed on [REAL SURFACE: real fingernail/real floor/real countertop],
macro photography style, shallow depth of field, studio lighting,
photorealistic background, 8K, 9:16 vertical
```

---

### ESTILO 3 — Pixar/Disney 3D Animado (grupo/cena renderizada)
**Pasta:** `estilos/2-pixar-3d-animado/`

**Características:**
- Múltiplos personagens em cena totalmente renderizada (não foto real)
- Ambiente 3D renderizado (oficina de madeira, etc.)
- Estilo suave e colorido típico de animação
- Personagens têm corpo com pernas e braços definidos
- Menos hiperreal, mais "cartoon premium"

**Exemplos nas referências:**
- Grupo: mangueira + pau + cinto + chinelo (workshop de madeira) — @objetodebochado

**Prompt base:**
```
Pixar Disney 3D animated [OBJECT] character with expressive face, arms and legs,
[PERSONALITY: friendly/angry/energetic], [COLOR PALETTE],
standing in a [RENDERED ENVIRONMENT: wooden workshop/kitchen/street],
warm cinematic lighting, Pixar render quality, 8K, 9:16 vertical
```

---

## Expressões por Engajamento

| Expressão | Estilo mais efetivo | Exemplos |
|-----------|--------------------|----|
| **Raiva intensa** | Fotorrealista | Lata de lixo, porta enrolar, cinto |
| **Chocado/assustado** | Fotorrealista | Edredom |
| **Determinado/sério** | Miniatura ação | Garrafa muscular |
| **Alegre** | Pixar 3D | Grupo de objetos |

---

## Cenários que Mais Convertem

1. **Ambiente sujo/problema** → objeto raivoso reclamando (lata de lixo + baratas)
2. **Close extremo** → objeto ocupa 80%+ da tela, fundo desfocado
3. **Objeto na chuva/rua** → drama emocional + cenário real
4. **Objeto realizando ação** → garrafa muscular limpando (mini-tutorial)
5. **Múltiplos objetos** → grupo falando juntos (mais para Pixar 3D)

---

## Estrutura de Pasta para Referências

```
public/reel-references/
├── estilos/
│   ├── 1-fotorrealista-face-expressiva/   ← COPIAR PRINTS AQUI
│   ├── 2-pixar-3d-animado/                ← COPIAR PRINTS AQUI
│   └── 3-miniatura-hiperreal/             ← COPIAR PRINTS AQUI
├── expressoes/
│   ├── raiva-irritado/
│   ├── chocado-assustado/
│   ├── alegre-animado/
│   └── determinado-serio/
├── cenarios/
│   ├── ambientes-reais/
│   ├── close-extremo/
│   └── cenas-multiplos-personagens/
├── nichos/
│   ├── beleza/
│   ├── tecnico/
│   ├── saude/
│   ├── imoveis/
│   ├── pet/
│   ├── educacao/
│   ├── nutricao/
│   ├── juridico/
│   ├── engenharia/
│   └── fotografia/
└── perfis-referencia/    ← Prints dos perfis com mais seguidores
```

---

## Perfis de Referência Identificados

| Perfil | Estilo | Engajamento observado |
|--------|--------|-----------------------|
| @objetodebochado | Pixar 3D grupo | médio |
| @objetosfalantes_ | Miniatura ação | alto |
| @objetos.ensinando.ia | Fotorrealista | muito alto (2.698 likes) |
| @objetos_falando | Fotorrealista | muito alto (3.801 likes) |
| @dicaqueexplica | Fotorrealista close | médio |
| mundoiaa_ | Miniatura ação | muito alto (9.782 likes) |
| objetosfalanteskkkk | Miniatura ação | alto |
| objetosfalante.ia | Fotorrealista | médio |
| objeto.fala | Fotorrealista + rua real | alto |

---

## Como Usar para Treinar a IA

1. **Salvar prints** nas pastas corretas por estilo/expressão/nicho
2. O sistema usará Claude Vision nas imagens de referência para **enriquecer os prompts**
3. Antes de gerar, o `analyze-object` consultará referências do mesmo nicho
4. Resultado esperado: personagens 50-70% mais próximos dos virais
