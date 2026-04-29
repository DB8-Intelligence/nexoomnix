// Upload de template visual pra biblioteca do tenant.
//
// Recebe multipart/form-data com o campo `file` + opcionais name/format/canva_url.
// Salva em Supabase Storage (bucket 'content', path 'templates/{tenant_id}/{uuid}-nome')
// e cria a linha em content_templates com image_url apontando pro asset público.
//
// Canva: o tenant pode colar o link do design como metadata (canva_url) e
// enviar o PNG exportado manualmente do Canva como arquivo. Import automático
// via Canva Connect API é evolução futura (requer OAuth).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ctx = await requireTenant({
    unauthorizedMessage: 'Unauthorized',
    tenantMissingStatus: 400,
    tenantMissingMessage: 'Profile sem tenant',
  })
  if (ctx instanceof NextResponse) return ctx

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo file obrigatório' }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'Arquivo maior que 10MB' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Formato não suportado (use PNG, JPG, WEBP ou GIF)' }, { status: 400 })
  }

  const name      = (formData.get('name') as string | null)?.trim() || file.name
  const format    = (formData.get('format') as string | null) ?? 'feed'
  const canvaUrl  = (formData.get('canva_url') as string | null)?.trim() || null
  const niche     = (formData.get('niche') as string | null) ?? null
  const description = (formData.get('description') as string | null)?.trim() || null

  if (!['feed', 'story', 'reel_cover'].includes(format)) {
    return NextResponse.json({ error: 'format inválido' }, { status: 400 })
  }

  // Sanitize filename: só letras/números/- / . / _
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64)
  const storagePath = `templates/${ctx.tenantId}/${randomUUID()}-${safeBase}`

  const supabase = await createClient()

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase
    .storage
    .from('content')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: `Upload falhou: ${uploadError.message}` }, { status: 500 })
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('content')
    .getPublicUrl(storagePath)

  const imageUrl = publicUrlData.publicUrl

  const source: 'upload' | 'canva' = canvaUrl ? 'canva' : 'upload'

  const { data: template, error: insertError } = await supabase
    .from('content_templates')
    .insert({
      tenant_id:   ctx.tenantId,
      name,
      description,
      image_url:   imageUrl,
      format:      format as 'feed' | 'story' | 'reel_cover',
      source,
      canva_url:   canvaUrl,
      niche,
      is_active:   true,
    })
    .select()
    .single()

  if (insertError) {
    // Best-effort cleanup do arquivo se o insert falhar.
    await supabase.storage.from('content').remove([storagePath]).catch(() => {})
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ template, imageUrl, storagePath })
}
