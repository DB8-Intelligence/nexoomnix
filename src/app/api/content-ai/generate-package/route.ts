import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPackagePrompt } from '@/lib/content-ai/prompts'
import { loadBrandingContext } from '@/lib/content-ai/branding-context'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'
import {
  FeatureNotAvailableError,
  RateLimitExceededError,
  guardAICall,
} from '@/modules/platform/ai-cost-control'
import type { ContentAnalysis, ContentCTA } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PackageResult {
  caption: string
  post_text: string
  hashtags: string[]
  ctas: ContentCTA[]
}

export async function POST(req: NextRequest) {
  // Antes da Sprint Cost Control esta rota tolerava profile sem tenant_id.
  // Agora exige tenant — necessário pra rate limit + audit por tenant.
  const ctx = await requireTenantWithRow()
  if (ctx instanceof NextResponse) return ctx

  let simulate: boolean
  try {
    ;({ simulate } = await guardAICall({
      tenantId: ctx.tenantId,
      plan: ctx.tenant.plan,
      type: 'text',
    }))
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return NextResponse.json({ error: 'Geração de pacote não disponível no seu plano' }, { status: 403 })
    }
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: `Limite diário de IA atingido (${err.limit}/dia). Tente novamente mais tarde.` },
        { status: 429 },
      )
    }
    throw err
  }

  const supabase = await createClient()

  const { project_id } = await req.json() as { project_id: string }
  if (!project_id) return NextResponse.json({ error: 'project_id obrigatório' }, { status: 400 })

  const { data: project, error: projError } = await supabase
    .from('content_projects')
    .select('*')
    .eq('id', project_id)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const tenantName = ctx.tenant.name
  const branding = await loadBrandingContext(supabase, ctx.tenantId)

  const analysis = project.analysis as ContentAnalysis
  if (!analysis) return NextResponse.json({ error: 'Projeto sem análise. Execute a análise primeiro.' }, { status: 400 })

  if (simulate) {
    const mockResult: PackageResult = {
      caption: 'Caption simulada (modo simulação)',
      post_text: 'Texto simulado (modo simulação)',
      hashtags: ['#simulacao', '#test'],
      ctas: [],
    }
    await supabase
      .from('content_projects')
      .update({
        generated_caption: mockResult.caption,
        generated_post_text: mockResult.post_text,
        generated_hashtags: mockResult.hashtags,
        generated_ctas: mockResult.ctas,
      })
      .eq('id', project_id)
    return NextResponse.json(mockResult)
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildPackagePrompt(analysis, project.nicho ?? 'negócio', tenantName, branding) }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const result = JSON.parse(text) as PackageResult

    await supabase
      .from('content_projects')
      .update({
        generated_caption: result.caption,
        generated_post_text: result.post_text,
        generated_hashtags: result.hashtags,
        generated_ctas: result.ctas,
      })
      .eq('id', project_id)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar pacote'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
