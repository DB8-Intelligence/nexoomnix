export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { PRODUCT_MODE_COOKIE } from '@/lib/domain-config'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.tenants) redirect('/login')

  const tenant = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants

  const cookieStore = await cookies()
  const productMode = cookieStore.get(PRODUCT_MODE_COOKIE)?.value ?? 'nexoomnix'

  return (
    <DashboardShell tenant={tenant} profile={profile} productMode={productMode}>
      {children}
    </DashboardShell>
  )
}
