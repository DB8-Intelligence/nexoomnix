import type { SupabaseClient } from '@supabase/supabase-js'

export interface BrandingContext {
  about?: string | null
  audience?: string | null
  tone?: string | null
  differential?: string | null
  painPoint?: string | null
  colors?: string | null
  phrase?: string | null
}

// Carrega o perfil de branding do tenant. Retorna null se o wizard
// ainda não foi completado — chamador deve cair no prompt default.
export async function loadBrandingContext(
  supabase: SupabaseClient,
  tenantId: string | null | undefined,
): Promise<BrandingContext | null> {
  if (!tenantId) return null

  const { data } = await supabase
    .from('tenant_settings')
    .select(
      'branding_completed, branding_about, branding_audience, branding_tone, branding_differential, branding_pain_point, branding_colors, branding_phrase',
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data || !data.branding_completed) return null

  return {
    about:        data.branding_about,
    audience:     data.branding_audience,
    tone:         data.branding_tone,
    differential: data.branding_differential,
    painPoint:    data.branding_pain_point,
    colors:       data.branding_colors,
    phrase:       data.branding_phrase,
  }
}

// Serializa o branding em um bloco de texto pra injetar no prompt.
// Só inclui campos preenchidos — se tudo for vazio, retorna string vazia.
export function formatBrandingBlock(branding: BrandingContext | null): string {
  if (!branding) return ''

  const lines: string[] = []
  if (branding.about)        lines.push(`- Sobre o negócio: ${branding.about}`)
  if (branding.audience)     lines.push(`- Público-alvo: ${branding.audience}`)
  if (branding.tone)         lines.push(`- Tom de comunicação preferido: ${branding.tone}`)
  if (branding.differential) lines.push(`- Diferencial competitivo: ${branding.differential}`)
  if (branding.painPoint)    lines.push(`- Dor que resolve: ${branding.painPoint}`)
  if (branding.colors)       lines.push(`- Cores da marca: ${branding.colors}`)
  if (branding.phrase)       lines.push(`- Slogan / frase-marca: ${branding.phrase}`)

  if (lines.length === 0) return ''

  return `\n\nPERFIL DA MARCA (use como guia principal de voz, ângulo e mensagem — não liste, incorpore naturalmente):\n${lines.join('\n')}\n`
}
