import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'NexoOmnix V2',
  description: 'Firebase V2 minimal frontend (smoke validation)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          padding: 0,
          background: '#0a0a0a',
          color: '#e5e5e5',
          minHeight: '100vh',
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
