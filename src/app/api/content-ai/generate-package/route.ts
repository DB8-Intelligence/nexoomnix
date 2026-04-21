import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPackagePrompt } from '@/lib/content-ai/prompts'
import { loadBrandingContext } from '@/lib/content-ai/branding-context'
import type { ContentAnalysis, ContentCTA } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface PackageResult {
  caption: string
  post_text: string
  hashtags: string[]
  ctas: ContentCTA[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

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

  // Get tenant name + branding
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  let tenantName = 'Negócio'
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', profile.tenant_id)
      .single()
    tenantName = tenant?.name ?? tenantName
  }
  const branding = await loadBrandingContext(supabase, profile?.tenant_id)

  const analysis = project.analysis as ContentAnalysis
  if (!analysis) return NextResponse.json({ error: 'Projeto sem análise. Execute a análise primeiro.' }, { status: 400 })

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
