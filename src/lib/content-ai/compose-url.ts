// Helper pra montar a URL absoluta do compositor de posts.
// A URL é pública e consumida pelo Instagram Graph API no momento da
// publicação, então precisa apontar pro domínio real da app.

export interface ComposeInput {
  bg: string
  text?: string | null
  cta?: string | null
  brand?: string | null
  color?: string | null
  format?: 'feed' | 'story' | 'reel_cover'
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://nexoomnix.com'
}

export function composePostUrl(input: ComposeInput): string {
  const params = new URLSearchParams()
  params.set('bg', input.bg)
  if (input.text)  params.set('text', input.text)
  if (input.cta)   params.set('cta', input.cta)
  if (input.brand) params.set('brand', input.brand)
  if (input.color) params.set('color', input.color)
  params.set('format', input.format ?? 'feed')
  return `${getBaseUrl()}/api/og/compose-post?${params.toString()}`
}
