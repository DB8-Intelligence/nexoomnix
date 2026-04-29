import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AI_CONFIG, buildSocialContentPrompt } from '@/lib/ai'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'
import {
  FeatureNotAvailableError,
  RateLimitExceededError,
  guardAICall,
  mockJsonResponse,
} from '@/modules/platform/ai-cost-control'
import type { ContentType } from '@/types/database'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

interface GenerateContentRequest {
  contentType: ContentType
  topic?: string
  tone?: 'profissional' | 'descontraido' | 'educativo'
}

export async function POST(request: NextRequest) {
  // Preserva a mensagem original "Perfil não encontrado" para 404
  const ctx = await requireTenantWithRow({ tenantMissingMessage: 'Perfil não encontrado' })
  if (ctx instanceof NextResponse) return ctx

  // Plan gate específico desta rota: Pro+
  if (ctx.tenant.plan === 'trial' || ctx.tenant.plan === 'starter') {
    return NextResponse.json(
      { error: 'Recurso disponível a partir do plano Pro' },
      { status: 403 }
    )
  }

  // Cost control
  let simulate: boolean
  try {
    ;({ simulate } = await guardAICall({
      tenantId: ctx.tenantId,
      plan: ctx.tenant.plan,
      type: 'text',
    }))
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return NextResponse.json({ error: 'Geração de conteúdo não disponível no seu plano' }, { status: 403 })
    }
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: `Limite diário de IA atingido (${err.limit}/dia). Tente novamente mais tarde.` },
        { status: 429 },
      )
    }
    throw err
  }

  const body = await request.json() as GenerateContentRequest

  if (simulate) {
    return NextResponse.json(mockJsonResponse({
      caption: 'Caption simulada (modo simulação)',
      hashtags: ['#simulacao', '#test'],
      cta: 'CTA simulado',
    }))
  }

  const prompt = buildSocialContentPrompt({
    niche: ctx.tenant.niche,
    businessName: ctx.tenant.name,
    contentType: body.contentType,
    topic: body.topic,
    tone: body.tone,
  })

  try {
    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokensDefault,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 })
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato de resposta inválido' }, { status: 500 })
    }

    const generated = JSON.parse(jsonMatch[0])
    return NextResponse.json(generated)
  } catch (err) {
    console.error('Anthropic error:', err)
    return NextResponse.json({ error: 'Erro ao gerar conteúdo' }, { status: 500 })
  }
}
