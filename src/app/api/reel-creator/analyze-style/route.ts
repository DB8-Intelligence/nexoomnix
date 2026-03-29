import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
type AllowedType = typeof ALLOWED_TYPES[number]

interface StyleAnalysis {
  stylePrompt: string
  colorPalette: string
  mood: string
  composition: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type as AllowedType))
    return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WEBP.' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: 'Imagem muito grande. Máximo 10MB.' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mediaType = file.type as AllowedType

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Analise o estilo visual desta imagem de reel do Instagram e retorne SOMENTE JSON válido sem markdown:

{
  "stylePrompt": "Frase em inglês para prefixar prompts Fal.ai/Midjourney — descreva lighting, color grading, visual treatment, aspect ratio 9:16",
  "colorPalette": "Paleta em português: cores dominantes, tons e contraste",
  "mood": "Humor/atmosfera em português: ex. energético, cinematográfico, minimalista, vibrante",
  "composition": "Composição em português: ex. close-up, câmera baixa, movimento rápido, texto sobreposto grande"
}

Seja específico e conciso. O stylePrompt será usado como prefixo direto em prompts de imagem IA.`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(json) as StyleAnalysis

    if (!parsed.stylePrompt)
      return NextResponse.json({ error: 'Análise incompleta. Tente novamente.' }, { status: 500 })

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Falha na análise' },
      { status: 500 },
    )
  }
}
