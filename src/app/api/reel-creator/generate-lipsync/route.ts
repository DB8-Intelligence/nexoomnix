import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const REPLICATE_API = 'https://api.replicate.com/v1'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const key = process.env.REPLICATE_API_KEY
  if (!key) return NextResponse.json({ error: 'REPLICATE_API_KEY não configurada' }, { status: 500 })

  const { imageUrl, audioDataUri } = await req.json() as {
    imageUrl: string
    audioDataUri: string
  }

  if (!imageUrl?.trim() || !audioDataUri?.trim()) {
    return NextResponse.json({ error: 'imageUrl e audioDataUri são obrigatórios' }, { status: 400 })
  }

  try {
    // Use the latest SadTalker model from Replicate
    const res = await fetch(`${REPLICATE_API}/models/cjwbw/sadtalker/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait=5', // Wait up to 5s for immediate result
      },
      body: JSON.stringify({
        input: {
          source_image: imageUrl,
          driven_audio: audioDataUri,
          preprocess: 'crop',
          still_mode: false,
          use_enhancer: false,
          batch_size: 1,
          size: 256,
          pose_style: 0,
          expression_scale: 1.0,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Replicate: ${errText}` }, { status: 502 })
    }

    const prediction = await res.json() as {
      id: string
      status: string
      output?: string | string[]
      error?: string
    }

    const videoUrl = prediction.output
      ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output)
      : null

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
      videoUrl,
      error: prediction.error ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro na geração' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const key = process.env.REPLICATE_API_KEY
  if (!key) return NextResponse.json({ error: 'REPLICATE_API_KEY não configurada' }, { status: 500 })

  const predictionId = req.nextUrl.searchParams.get('id')
  if (!predictionId) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  try {
    const res = await fetch(`${REPLICATE_API}/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${key}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Replicate: ${errText}` }, { status: 502 })
    }

    const prediction = await res.json() as {
      status: string
      output?: string | string[]
      error?: string
    }

    const videoUrl = prediction.output
      ? (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output)
      : null

    return NextResponse.json({
      status: prediction.status,
      videoUrl,
      error: prediction.error ?? null,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erro' },
      { status: 500 }
    )
  }
}
