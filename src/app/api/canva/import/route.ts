// Importa um design do Canva pra biblioteca content_templates.
// Fluxo: cria job de export no Canva → aguarda (polling) → baixa PNG →
// sobe pro Supabase Storage → cria content_templates apontando pra URL.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getActiveCanvaToken } from '@/lib/canva/token'
import { createExport, waitForExport } from '@/lib/canva/client'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

export const maxDuration = 90

export async function POST(req: NextRequest) {
  const ctx = await requireTenant({
    unauthorizedMessage: 'Unauthorized',
    tenantMissingStatus: 400,
    tenantMissingMessage: 'Profile sem tenant',
  })
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json() as {
    design_id?: string
    design_title?: string
    canva_edit_url?: string
    format?: 'feed' | 'story' | 'reel_cover'
    niche?: string
  }

  if (!body.design_id) {
    return NextResponse.json({ error: 'design_id é obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const tokenInfo = await getActiveCanvaToken(supabase, ctx.tenantId)
  if (!tokenInfo) {
    return NextResponse.json({ error: 'Canva não conectado', needsReconnect: true }, { status: 401 })
  }

  // 1. Inicia export no Canva
  let pngUrl: string
  try {
    const job = await createExport(tokenInfo.accessToken, body.design_id, 'png')
    const finished = await waitForExport(tokenInfo.accessToken, job.id, 80_000)
    if (finished.status !== 'success' || !finished.urls?.length) {
      return NextResponse.json(
        { error: finished.error?.message ?? 'Export falhou no Canva' },
        { status: 502 },
      )
    }
    pngUrl = finished.urls[0]
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro no Canva'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  // 2. Baixa PNG e reenvia pro nosso Storage (pra não depender do link temporário do Canva)
  let buffer: ArrayBuffer
  try {
    const pngRes = await fetch(pngUrl)
    if (!pngRes.ok) throw new Error(`download ${pngRes.status}`)
    buffer = await pngRes.arrayBuffer()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao baixar PNG do Canva'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  const safeName = (body.design_title ?? body.design_id).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64)
  const storagePath = `templates/${ctx.tenantId}/canva-${randomUUID()}-${safeName}.png`

  const { error: uploadError } = await supabase
    .storage
    .from('content')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 500 })
  }

  const { data: publicUrlData } = supabase.storage.from('content').getPublicUrl(storagePath)

  // 3. Cria content_templates apontando pro asset salvo
  const { data: template, error: insertError } = await supabase
    .from('content_templates')
    .insert({
      tenant_id:       ctx.tenantId,
      name:            body.design_title?.trim() || `Canva ${body.design_id.slice(0, 6)}`,
      image_url:       publicUrlData.publicUrl,
      format:          body.format ?? 'feed',
      source:          'canva',
      canva_url:       body.canva_edit_url ?? null,
      canva_design_id: body.design_id,
      niche:           body.niche ?? null,
      is_active:       true,
    })
    .select()
    .single()

  if (insertError) {
    await supabase.storage.from('content').remove([storagePath]).catch(() => {})
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await supabase
    .from('canva_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenInfo.connectionId)

  return NextResponse.json({ template })
}
