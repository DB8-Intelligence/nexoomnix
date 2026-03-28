import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Allowed domains for SSRF protection
const ALLOWED_HOSTNAMES = [
  'v3.fal.media',
  'fal.media',
  'storage.googleapis.com',
  'pbxt.replicate.delivery',
  'replicate.delivery',
]

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Não autorizado', { status: 401 })

  const assetUrl = req.nextUrl.searchParams.get('url')
  if (!assetUrl) return new NextResponse('url obrigatória', { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(assetUrl)
  } catch {
    return new NextResponse('URL inválida', { status: 400 })
  }

  const hostname = parsed.hostname
  const allowed = ALLOWED_HOSTNAMES.some(h =>
    hostname === h || hostname.endsWith(`.${h}`)
  )
  if (!allowed) {
    return new NextResponse('Domínio não permitido', { status: 403 })
  }

  try {
    const res = await fetch(assetUrl, { cache: 'no-store' })
    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: 502 })
    }

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : 'Falha ao buscar asset',
      { status: 500 }
    )
  }
}
