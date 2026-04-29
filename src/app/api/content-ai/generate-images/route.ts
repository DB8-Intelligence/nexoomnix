import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'
import {
  FeatureNotAvailableError,
  RateLimitExceededError,
  guardAICall,
  mockImageUrl,
} from '@/modules/platform/ai-cost-control'
import type { ContentScene } from '@/types/database'

interface GeneratedImage {
  scene_id: number
  url: string
  prompt: string
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantWithRow()
  if (ctx instanceof NextResponse) return ctx

  let simulate: boolean
  try {
    ;({ simulate } = await guardAICall({
      tenantId: ctx.tenantId,
      plan: ctx.tenant.plan,
      type: 'image',
    }))
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return NextResponse.json({ error: 'Geração de imagens não disponível no seu plano' }, { status: 403 })
    }
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: `Limite diário de imagens atingido (${err.limit}/dia). Tente novamente mais tarde.` },
        { status: 429 },
      )
    }
    throw err
  }

  if (!simulate && !process.env.FAL_KEY) {
    return NextResponse.json({ error: 'FAL_KEY não configurada' }, { status: 503 })
  }

  const { project_id } = await req.json() as { project_id: string }
  if (!project_id) return NextResponse.json({ error: 'project_id obrigatório' }, { status: 400 })

  const supabase = await createClient()
  const { data: project, error: projError } = await supabase
    .from('content_projects')
    .select('id, generated_scenes')
    .eq('id', project_id)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  const scenes = (project.generated_scenes ?? []) as ContentScene[]
  if (scenes.length === 0) {
    return NextResponse.json({ error: 'Nenhuma cena encontrada. Execute a análise primeiro.' }, { status: 400 })
  }

  await supabase
    .from('content_projects')
    .update({ status: 'generating_images' })
    .eq('id', project_id)

  try {
    const generatedImages: GeneratedImage[] = []

    for (const scene of scenes) {
      const prompt = scene.image_prompt ?? scene.description

      if (simulate) {
        generatedImages.push({ scene_id: scene.id, url: mockImageUrl(576, 768), prompt })
        continue
      }

      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${process.env.FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: 'portrait_4_3',
          num_inference_steps: 4,
          num_images: 1,
        }),
      })

      if (res.ok) {
        const data = await res.json() as { images?: Array<{ url: string }> }
        const url = data.images?.[0]?.url ?? ''
        if (url) generatedImages.push({ scene_id: scene.id, url, prompt })
      }
    }

    await supabase
      .from('content_projects')
      .update({
        status: 'configuring',
        generated_images: generatedImages,
      })
      .eq('id', project_id)

    return NextResponse.json({ images: generatedImages })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar imagens'
    await supabase
      .from('content_projects')
      .update({ status: 'error' })
      .eq('id', project_id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
