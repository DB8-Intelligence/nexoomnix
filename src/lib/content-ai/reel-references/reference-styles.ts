/**
 * Estilos de objetos falantes extraídos de referências virais do Instagram.
 * Análise baseada em perfis: @objetos_falando, @objetos.ensinando.ia, mundoiaa_, etc.
 *
 * INSIGHT: O estilo mais viral NÃO é Pixar/Disney suave.
 * É "objeto fotorrealista + face expressiva embutida" ou "miniatura hiperreal em cena real".
 */

export type CharacterStyle = 'fotorrealista' | 'miniatura-acao' | 'pixar-3d'
export type CharacterExpression = 'raiva' | 'chocado' | 'determinado' | 'alegre' | 'irritado'

export interface StyleDefinition {
  id: CharacterStyle
  label: string
  viralScore: number // 1-10 baseado em engajamento das referências
  description: string
  promptPrefix: string
  promptSuffix: string
  bestExpressions: CharacterExpression[]
  bestEnvironments: string[]
}

export const CHARACTER_STYLES: Record<CharacterStyle, StyleDefinition> = {
  'fotorrealista': {
    id: 'fotorrealista',
    label: 'Fotorrealista com Face Expressiva',
    viralScore: 9,
    description: 'O objeto mantém textura real com face cartoon embutida na superfície. Mais viral.',
    promptPrefix: 'photorealistic [OBJECT] with an expressive cartoon face deeply embedded in its natural surface, [EXPRESSION] expression, large bulging realistic eyes with detailed irises, thick dramatic eyebrows, wide open mouth with visible realistic teeth,',
    promptSuffix: 'natural [OBJECT] texture preserved, placed in a real photographic environment, cinematic lighting, ultra-detailed, 8K resolution, hyperrealistic, 9:16 vertical aspect ratio',
    bestExpressions: ['raiva', 'chocado', 'irritado'],
    bestEnvironments: [
      'real kitchen sink with dirty dishes',
      'real bedroom with unmade bed',
      'rainy street with puddles',
      'dirty bathroom floor',
      'cluttered workshop table',
    ],
  },

  'miniatura-acao': {
    id: 'miniatura-acao',
    label: 'Miniatura de Ação Hiperreal',
    viralScore: 10,
    description: 'Personagem miniatura com corpo musculoso/estilizado em cena real. Maior engajamento observado.',
    promptPrefix: 'hyperrealistic miniature [OBJECT] character transformed into a muscular action figure, [COLOR] plastic and rubber texture, intense [EXPRESSION] expression, dynamic action pose,',
    promptSuffix: 'placed on a real [SURFACE] surface, macro photography perspective, shallow depth of field blur on background, dramatic studio lighting, photorealistic environment, ultra-detailed 8K, 9:16 vertical',
    bestExpressions: ['determinado', 'raiva', 'irritado'],
    bestEnvironments: [
      'real wooden table surface',
      'real dirty floor being cleaned',
      'real human skin close-up',
      'real countertop with food items',
      'real outdoor pavement',
    ],
  },

  'pixar-3d': {
    id: 'pixar-3d',
    label: 'Pixar/Disney 3D Animado',
    viralScore: 6,
    description: 'Personagem totalmente renderizado em estilo Pixar. Funciona bem para grupos de objetos.',
    promptPrefix: 'Pixar Disney 3D animated [OBJECT] character with expressive face, articulated arms and legs, [EXPRESSION] personality,',
    promptSuffix: 'standing in a rendered [ENVIRONMENT], warm golden hour lighting, Pixar render quality, smooth surfaces, subsurface scattering, 8K, 9:16 vertical aspect ratio',
    bestExpressions: ['alegre', 'determinado', 'raiva'],
    bestEnvironments: [
      'wooden workshop with warm lighting',
      'colorful Brazilian street',
      'modern kitchen set',
      'office environment',
      'outdoor plaza',
    ],
  },
}

export const EXPRESSION_PROMPTS: Record<CharacterExpression, string> = {
  raiva:      'extremely angry, furrowed brows, clenched teeth, reddish tones',
  chocado:    'extremely shocked, wide open eyes, mouth agape, surprised expression',
  determinado:'fierce determined look, intense focused eyes, stern jaw',
  alegre:     'joyful enthusiastic smile, bright eyes, welcoming expression',
  irritado:   'deeply annoyed, side-eye expression, pursed lips, impatient look',
}

/**
 * Build a complete Fal.ai prompt using style + expression + object + environment
 */
export function buildObjectPrompt(params: {
  objectName: string
  style: CharacterStyle
  expression: CharacterExpression
  color: string
  environment?: string
  additionalDetails?: string
}): string {
  const styleDef = CHARACTER_STYLES[params.style]
  const expressionDesc = EXPRESSION_PROMPTS[params.expression]
  const env = params.environment ?? styleDef.bestEnvironments[0]

  const prefix = styleDef.promptPrefix
    .replace('[OBJECT]', params.objectName)
    .replace('[EXPRESSION]', expressionDesc)
    .replace('[COLOR]', params.color)

  const suffix = styleDef.promptSuffix
    .replace('[OBJECT]', params.objectName)
    .replace('[SURFACE]', env)
    .replace('[ENVIRONMENT]', env)

  const extra = params.additionalDetails ? `, ${params.additionalDetails}` : ''

  return `${prefix} ${params.color} color palette${extra}, ${suffix}`
}

/**
 * Returns the recommended style for a given niche based on viral patterns
 */
export function getRecommendedStyle(niche: string): CharacterStyle {
  const nicheStyleMap: Record<string, CharacterStyle> = {
    tecnico:    'miniatura-acao',   // ferramentas musculosas em ação
    beleza:     'fotorrealista',    // tesoura/esmalte com cara no espelho
    saude:      'fotorrealista',    // medicamento/dente com face expressiva
    pet:        'pixar-3d',         // animais/produtos pet em estilo animado
    imoveis:    'pixar-3d',         // chave/placa de venda animada
    juridico:   'fotorrealista',    // martelo/livro com face séria
    nutricao:   'miniatura-acao',   // comida/suplemento miniatura em ação
    educacao:   'pixar-3d',         // livro/lápis estilo animado
    engenharia: 'miniatura-acao',   // ferramentas/capacete miniatura
    fotografia: 'fotorrealista',    // câmera/lente com face expressiva
  }
  return nicheStyleMap[niche] ?? 'fotorrealista'
}

/**
 * Reference profiles by engagement level
 * Use these as inspiration when guiding the AI
 */
export const REFERENCE_PROFILES = [
  { handle: '@objetos_falando',     style: 'fotorrealista' as CharacterStyle,  avgLikes: 3801, notes: 'Objetos domésticos raivosos em ambientes reais sujos' },
  { handle: 'mundoiaa_',            style: 'miniatura-acao' as CharacterStyle, avgLikes: 9782, notes: 'Miniatura azul muscular fazendo tarefas domésticas' },
  { handle: '@objetos.ensinando.ia',style: 'fotorrealista' as CharacterStyle,  avgLikes: 2698, notes: 'Edredons/travesseiros com faces no quarto real' },
  { handle: '@objetodebochado',     style: 'pixar-3d' as CharacterStyle,       avgLikes: 118,  notes: 'Grupo de objetos estilo Pixar em workshop' },
  { handle: 'objetosfalantes_',     style: 'miniatura-acao' as CharacterStyle, avgLikes: 132,  notes: 'Miniatura em close em pele/superfície real' },
  { handle: 'objeto.fala',          style: 'fotorrealista' as CharacterStyle,  avgLikes: 72,   notes: 'Cinto de couro andando em rua real na chuva' },
] as const
