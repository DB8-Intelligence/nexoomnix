import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'
import {
  FeatureNotAvailableError,
  RateLimitExceededError,
  guardAICall,
  mockVoiceUrl,
} from '@/modules/platform/ai-cost-control'

export async function POST(req: NextRequest) {
  const ctx = await requireTenantWithRow()
  if (ctx instanceof NextResponse) return ctx

  let simulate: boolean
  try {
    ;({ simulate } = await guardAICall({
      tenantId: ctx.tenantId,
      plan: ctx.tenant.plan,
      type: 'tts',
    }))
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return NextResponse.json({ error: 'Geração de voz não disponível no seu plano' }, { status: 403 })
    }
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: `Limite diário de TTS atingido (${err.limit}/dia). Tente novamente mais tarde.` },
        { status: 429 },
      )
    }
    throw err
  }

  if (!simulate && !process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY não configurada' }, { status: 503 })
  }

  const { project_id, text, voice_id = 'pNInz6obpgDQGcFmaJgB' } = await req.json() as {
    project_id: string
    text: string
    voice_id?: string
  }

  if (!project_id || !text) {
    return NextResponse.json({ error: 'project_id e text são obrigatórios' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: project, error: projError } = await supabase
    .from('content_projects')
    .select('id')
    .eq('id', project_id)
    .single()

  if (projError || !project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (simulate) {
    const voiceUrl = mockVoiceUrl()
    await supabase
      .from('content_projects')
      .update({ status: 'configuring', generated_voice_url: voiceUrl })
      .eq('id', project_id)
    return NextResponse.json({ voice_url: voiceUrl })
  }

  await supabase
    .from('content_projects')
    .update({ status: 'generating_voice' })
    .eq('id', project_id)

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`ElevenLabs error ${res.status}: ${err}`)
    }

    const audioBuffer = await res.arrayBuffer()
    const fileName = `voice/${project_id}-${Date.now()}.mp3`
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('content')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = supabase.storage.from('content').getPublicUrl(uploaded.path)
    const voiceUrl = urlData.publicUrl

    await supabase
      .from('content_projects')
      .update({ status: 'configuring', generated_voice_url: voiceUrl })
      .eq('id', project_id)

    return NextResponse.json({ voice_url: voiceUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao gerar voz'
    await supabase
      .from('content_projects')
      .update({ status: 'error' })
      .eq('id', project_id)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
