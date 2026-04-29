// Compositor server-side de posts.
//
// Recebe via query string os parâmetros de um post — background, texto
// principal, CTA, marca, cor de acento, formato — e devolve um PNG
// renderizado via next/og (satori + resvg). A URL que esse endpoint
// gera é colocada direto em scheduled_posts.media_urls: o Instagram
// Graph API baixa essa URL no momento da publicação, então nada
// precisa ser salvo em Storage.
//
// Limitações: satori suporta um subset de CSS. Usar apenas
// display:flex, posicionamento absoluto, cores sólidas e tipografia.

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

type Format = 'feed' | 'story' | 'reel_cover'

const DIMENSIONS: Record<Format, { w: number; h: number }> = {
  feed:       { w: 1080, h: 1080 },
  story:      { w: 1080, h: 1920 },
  reel_cover: { w: 1080, h: 1920 },
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const bg       = searchParams.get('bg') ?? ''
  const text     = (searchParams.get('text') ?? '').slice(0, 200)
  const cta      = (searchParams.get('cta') ?? '').slice(0, 40)
  const brand    = (searchParams.get('brand') ?? '').slice(0, 40)
  const color    = (searchParams.get('color') ?? '#6d28d9').match(/^#?[0-9a-fA-F]{6}$/) ? searchParams.get('color')! : '#6d28d9'
  const formatIn = (searchParams.get('format') ?? 'feed') as Format
  const format   = DIMENSIONS[formatIn] ? formatIn : 'feed'
  const accent   = color.startsWith('#') ? color : `#${color}`

  const { w, h } = DIMENSIONS[format]
  const textSize = format === 'feed' ? 68 : 76
  const padding  = format === 'feed' ? 80 : 100

  return new ImageResponse(
    (
      <div
        style={{
          width: w,
          height: h,
          display: 'flex',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          color: 'white',
          background: accent,
        }}
      >
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            alt=""
            width={w}
            height={h}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: w,
              height: h,
              objectFit: 'cover',
            }}
          />
        )}

        {/* Overlay de legibilidade */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%)',
          }}
        />

        {/* Texto principal */}
        {text && (
          <div
            style={{
              position: 'absolute',
              left: padding,
              right: padding,
              top: format === 'feed' ? padding * 1.5 : padding * 3,
              display: 'flex',
              flexDirection: 'column',
              fontSize: textSize,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              textShadow: '0 4px 24px rgba(0,0,0,0.4)',
            }}
          >
            {text}
          </div>
        )}

        {/* CTA */}
        {cta && (
          <div
            style={{
              position: 'absolute',
              left: padding,
              bottom: format === 'feed' ? padding * 1.5 : padding * 2,
              display: 'flex',
              alignItems: 'center',
              padding: '20px 36px',
              background: accent,
              borderRadius: 999,
              fontSize: textSize * 0.5,
              fontWeight: 700,
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          >
            {cta}
          </div>
        )}

        {/* Marca no rodapé */}
        {brand && (
          <div
            style={{
              position: 'absolute',
              right: padding,
              bottom: format === 'feed' ? padding : padding * 1.5,
              fontSize: textSize * 0.35,
              fontWeight: 600,
              opacity: 0.85,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {brand}
          </div>
        )}
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
