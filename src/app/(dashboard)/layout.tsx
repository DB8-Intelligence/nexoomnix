export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { PRODUCT_MODE_COOKIE } from '@/lib/domain-config'
import { isDb8Staff } from '@/lib/staff'

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

  // Usuário autenticado mas sem tenant → manda pra /cadastro completar onboarding.
  // A página /cadastro detecta sessão ativa sem tenant e pula pro step 'niche'
  // pré-preenchendo email/nome do auth. Middleware permite /cadastro pra autenticados.
  if (!profile || !profile.tenants) redirect('/cadastro')

  const tenant = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants

  const cookieStore = await cookies()
  const productMode = cookieStore.get(PRODUCT_MODE_COOKIE)?.value ?? 'nexoomnix'

  const isStaff = isDb8Staff(user.email)

  return (
    <DashboardShell tenant={tenant} profile={profile} productMode={productMode} isStaff={isStaff}>
      {children}
    </DashboardShell>
  )
}
