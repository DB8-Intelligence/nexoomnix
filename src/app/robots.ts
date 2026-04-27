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
          '/juridicpro',
          '/petpro',
          '/educapro',
          '/nutripro',
          '/engepro',
          '/fotopro',
          '/gastronomia',
          '/fitness',
          '/financas',
        ],
        disallow: ['/dashboard', '/api/', '/s/', '/imobpro', '/reelcreator'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
