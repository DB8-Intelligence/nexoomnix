export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { isDb8Staff } from '@/lib/staff'
import { BugsAdminClient } from './BugsAdminClient'

export const metadata: Metadata = {
  title: 'Bugs — NexoOmnix Admin',
}

export default async function BugsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isDb8Staff(user.email)) notFound()

  // Service client pra bypassar RLS de bug_reports.
  const service = await createServiceClient()
  const { data: bugs } = await service
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return <BugsAdminClient initialBugs={bugs ?? []} />
}
