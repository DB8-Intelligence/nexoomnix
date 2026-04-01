import type { Metadata } from 'next'
import { CrmPageClient } from './CrmPageClient'

export const metadata: Metadata = {
  title: 'Omnix CRM — NexoOmnix',
}

export default function CrmPage() {
  return <CrmPageClient />
}
