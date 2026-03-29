import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'NexoOmnix — Plataforma completa para criar, automatizar e escalar',
    template: '%s | NexoOmnix',
  },
  description: 'Omnix Agenda, Omnix CRM, Omnix Reels, Omnix Social e Omnix Sites. Tudo que o seu negócio precisa para crescer online.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexoomnix.com'),
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
