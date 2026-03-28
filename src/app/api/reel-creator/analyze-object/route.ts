import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedType = typeof ALLOWED_TYPES[number]

interface CharacterConcept {
  id: string
  name: string
  style: 'fotorrealista' | 'miniatura-acao' | 'pixar-3d'
  personality: string
  colorPalette: string
  prompt: string
}

interface AnalysisResult {
  object: string
  niche: string
  concepts: CharacterConcept[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const niche = formData.get('niche') as string | null

  if (!file) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type as AllowedType)) {
    return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WEBP.' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagem muito grande. Máximo 10MB.' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type as AllowedType

  const nicheContext = niche ? `O cliente é do nicho: ${niche}.` : ''

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analise esta imagem de um objeto/produto e crie 3 conceitos de personagem para reels virais do Instagram, cada um em um ESTILO DIFERENTE. ${nicheContext}

ESTILOS DISPONÍVEIS (baseados nos reels de maior engajamento):
- ESTILO A "Fotorrealista + Face Expressiva": objeto mantém textura real, face cartoon embutida na superfície, olhos salientes realistas, boca aberta com dentes visíveis, expressão extremamente exagerada. Colocado em ambiente real (foto).
- ESTILO B "Miniatura de Ação": objeto vira uma miniatura muscular/estilizada como action figure, textura plástica/borracha, pose dinâmica, em close em superfície real.
- ESTILO C "Pixar/Disney 3D": personagem totalmente renderizado estilo animação, corpo com braços e pernas, ambiente 3D renderizado.

Responda SOMENTE com JSON válido, sem markdown nem texto extra:

{
  "object": "nome do objeto em português",
  "niche": "nicho de mercado identificado",
  "concepts": [
    {
      "id": "A",
      "name": "Nome do Personagem",
      "style": "fotorrealista",
      "personality": "Descrição da personalidade em 1 frase em português — inclua a expressão dominante (ex: raivoso, chocado, determinado)",
      "colorPalette": "Cores dominantes do objeto ex: couro marrom + dourado",
      "prompt": "photorealistic [OBJECT_NAME] with an expressive cartoon face deeply embedded in its natural [MATERIAL] surface, [EXPRESSION: extremely angry/shocked/determined] expression, large bulging realistic eyes, thick dramatic eyebrows, wide open mouth with visible teeth, natural object texture preserved, placed in a real [RELEVANT ENVIRONMENT], cinematic lighting, ultra-detailed, 8K, 9:16 vertical"
    },
    {
      "id": "B",
      "name": "Nome do Personagem",
      "style": "miniatura-acao",
      "personality": "Descrição da personalidade em 1 frase em português",
      "colorPalette": "Cores do objeto",
      "prompt": "hyperrealistic miniature [OBJECT_NAME] character as a muscular action figure, [COLOR] plastic and rubber texture, intense [EXPRESSION] expression, dynamic action pose performing [RELEVANT ACTION], placed on a real [SURFACE] surface, macro photography, shallow depth of field, dramatic lighting, photorealistic background, 8K, 9:16 vertical"
    },
    {
      "id": "C",
      "name": "Nome do Personagem",
      "style": "pixar-3d",
      "personality": "Descrição da personalidade em 1 frase em português",
      "colorPalette": "Cores do objeto",
      "prompt": "Pixar Disney 3D animated [OBJECT_NAME] character with expressive face, articulated arms and legs, [PERSONALITY] personality, [COLOR_PALETTE], big round eyes, lip-sync ready mouth, rendered [ENVIRONMENT] background, warm cinematic lighting, Pixar render quality, 8K, 9:16 vertical"
    }
  ]
}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    // Strip potential markdown code fences
    const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(json) as AnalysisResult

    if (!parsed.concepts?.length) {
      return NextResponse.json({ error: 'Análise incompleta. Tente novamente.' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha na análise' },
      { status: 500 }
    )
  }
}
