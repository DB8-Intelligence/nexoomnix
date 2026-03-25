// ============================================================
// NexoPro — API Route: Gerador de Roteiro HeyGen
// Gera roteiro completo por cena para vídeos no HeyGen AI Avatar
// Requer plano Pro ou superior
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { AI_CONFIG, buildRoteiroHeyGenPrompt, type RoteiroCompleto, type GerarRoteiroParams } from '@/lib/ai'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Rate limiting simples em memória (máx 10 req/min por tenant)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(tenantId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 10) return false
  entry.count++
  return true
}

interface GerarRoteiroRequest {
  topico: string
  formatoVideo?: GerarRoteiroParams['formatoVideo']
  tom?: GerarRoteiroParams['tom']
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(name, niche, plan)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  const tenant = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  // Verificar plano — disponível a partir do Pro
  if (tenant.plan === 'trial' || tenant.plan === 'starter') {
    return NextResponse.json(
      { error: 'Gerador de Roteiro disponível a partir do plano Pro' },
      { status: 403 }
    )
  }

  // Rate limiting por tenant
  if (!checkRateLimit(profile.tenant_id)) {
    return NextResponse.json(
      { error: 'Limite de requisições atingido. Aguarde 1 minuto.' },
      { status: 429 }
    )
  }

  const body = await request.json() as GerarRoteiroRequest

  if (!body.topico || body.topico.trim().length < 5) {
    return NextResponse.json(
      { error: 'Informe um tema ou assunto com pelo menos 5 caracteres' },
      { status: 400 }
    )
  }

  if (body.topico.trim().length > 500) {
    return NextResponse.json(
      { error: 'Tema muito longo. Use até 500 caracteres.' },
      { status: 400 }
    )
  }

  const prompt = buildRoteiroHeyGenPrompt({
    topico: body.topico.trim(),
    niche: tenant.niche,
    businessName: tenant.name,
    formatoVideo: body.formatoVideo ?? 'reels',
    tom: body.tom ?? 'autoridade',
  })

  try {
    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokensRoteiro,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 })
    }

    // Extrair JSON da resposta
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Formato de resposta inválido da IA' }, { status: 500 })
    }

    const roteiro = JSON.parse(jsonMatch[0]) as RoteiroCompleto
    return NextResponse.json(roteiro)
  } catch (err) {
    console.error('[gerar-roteiro] Anthropic error:', err)
    return NextResponse.json({ error: 'Erro ao gerar roteiro. Tente novamente.' }, { status: 500 })
  }
}
