import type { Metadata } from 'next'
import { CrmConfigClient } from './CrmConfigClient'

export const metadata: Metadata = {
  title: 'Configurar CRM — NexoOmnix',
}

export default function CrmConfigPage() {
  return <CrmConfigClient />
}
