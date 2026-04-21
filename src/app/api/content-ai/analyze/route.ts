import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildAnalysisPrompt } from '@/lib/content-ai/prompts'
import { loadBrandingContext } from '@/lib/content-ai/branding-context'
import type { ContentAnalysis } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { project_id, source_url, source_description, nicho } = await req.json() as {
    project_id: string
    source_url?: string
    source_description?: string
    nicho: string
  }

  if (!project_id || !nicho) {
    return NextResponse.json({ error: 'project_id e nicho são obrigatórios' }, { status: 400 })
  }

  const source = source_url
    ? `URL do conteúdo: ${source_url}\nDescrição adicional: ${source_description ?? ''}`
    : source_description ?? ''

  if (!source.trim()) {
    return NextResponse.json({ error: 'Forneça uma URL ou descrição' }, { status: 400 })
  }

  // Verify ownership
  const { data: project, error: projError } = await supabase
    .from('content_projects')
    .select('id')
    .eq('id', project_id)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  // Update status to analyzing
  await supabase
    .from('content_projects')
    .update({ status: 'analyzing' })
    .eq('id', project_id)

  // Load branding for this tenant (respects RLS via user session)
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const branding = await loadBrandingContext(supabase, profile?.tenant_id)

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildAnalysisPrompt(source, nicho, branding) }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const analysis = JSON.parse(text) as ContentAnalysis

    await supabase
      .from('content_projects')
      .update({
        status: 'configuring',
        analysis,
        generated_scenes: analysis.scenes,
        title: analysis.title,
        nicho,
        source_url: source_url ?? null,
        source_description: source_description ?? null,
      })
      .eq('id', project_id)

    return NextResponse.json({ analysis })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro na análise'
    await supabase
      .from('content_projects')
      .update({ status: 'error' })
      .eq('id', project_id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
