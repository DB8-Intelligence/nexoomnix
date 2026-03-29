import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexoomnix.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/salaopro',
          '/clinicapro',
          '/ordemdeservico',
          '/imobpro',
          '/juridicpro',
          '/petpro',
          '/educapro',
          '/nutripro',
          '/engepro',
          '/fotopro',
        ],
        disallow: ['/dashboard', '/api/', '/s/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
