import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'

// Preserva a mensagem PT-BR "Perfil não encontrado" usada por esta rota antes da
// migração. Status 401/404 já são os defaults do requireTenant.
const TENANT_OPTS = { tenantMissingMessage: 'Perfil não encontrado' }

export async function GET() {
  const ctx = await requireTenant(TENANT_OPTS)
  if (ctx instanceof NextResponse) return ctx

  const supabase = await createClient()
  const { data } = await supabase
    .from('tenant_settings')
    .select(`
      branding_completed, branding_about, branding_audience,
      branding_tone, branding_differential, branding_pain_point,
      branding_colors, branding_phrase
    `)
    .eq('tenant_id', ctx.tenantId)
    .single()

  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenant(TENANT_OPTS)
  if (ctx instanceof NextResponse) return ctx

  const body = await req.json()

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenant_settings')
    .update({
      branding_completed:    true,
      branding_about:        body.about?.trim() || null,
      branding_audience:     body.audience?.trim() || null,
      branding_tone:         body.tone || null,
      branding_differential: body.differential?.trim() || null,
      branding_pain_point:   body.pain_point?.trim() || null,
      branding_colors:       body.colors?.trim() || null,
      branding_phrase:       body.phrase?.trim() || null,
      branding_updated_at:   new Date().toISOString(),
    })
    .eq('tenant_id', ctx.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
