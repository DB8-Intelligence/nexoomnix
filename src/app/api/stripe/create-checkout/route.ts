import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'
import {
  createSubscriptionCheckout,
  InvalidPlanError,
  TenantNotFoundError,
} from '@/modules/billing/application/create-subscription-checkout'

export async function POST(req: NextRequest) {
  const ctx = await requireTenant()
  if (ctx instanceof NextResponse) return ctx

  const { plan } = await req.json() as { plan: string }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const { url } = await createSubscriptionCheckout({
      tenantId: ctx.tenantId,
      plan,
      userEmail: ctx.user.email,
      appUrl,
    })
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof InvalidPlanError) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
    }
    throw err
  }
}
