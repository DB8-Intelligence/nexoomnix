import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexoomnix.com'

  const landingPages = [
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
  ]

  return landingPages.map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }))
}
