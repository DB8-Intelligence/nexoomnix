import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/modules/platform/tenants/tenant-context'
import {
  NoBillingCustomerError,
  openBillingPortal,
} from '@/modules/billing/application/open-billing-portal'

export async function POST(_req: NextRequest) {
  // No original, user autenticado sem tenant caía no 404
  // "Nenhuma assinatura Stripe encontrada" pelo efeito colateral de
  // query com tenant_id vazio. Preservamos essa mensagem via override.
  const ctx = await requireTenant({
    tenantMissingMessage: 'Nenhuma assinatura Stripe encontrada',
  })
  if (ctx instanceof NextResponse) return ctx

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const { url } = await openBillingPortal({ tenantId: ctx.tenantId, appUrl })
    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof NoBillingCustomerError) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura Stripe encontrada' },
        { status: 404 },
      )
    }
    throw err
  }
}
