import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { AI_CONFIG, buildContadorSystemPrompt, type ContadorMessage } from '@/lib/ai'
import { requireTenantWithRow } from '@/modules/platform/tenants/tenant-context'
import {
  FeatureNotAvailableError,
  RateLimitExceededError,
  guardAICall,
  mockTextResponse,
} from '@/modules/platform/ai-cost-control'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Rate limit simples por tenant (em produção usar Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(tenantId: string): boolean {
  const now = Date.now()
  const window = 60 * 1000 // 1 minuto
  const maxReqs = 10

  const entry = rateLimitMap.get(tenantId)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(tenantId, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= maxReqs) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  // Preserva a mensagem "Perfil não encontrado" do 404 original (pré-migração,
  // quando `if (!profile)` era o caminho mais provável de falha). Edge case de
  // "profile com tenant_id órfão" é inalcançável em prod (FK + DashboardLayout).
  const ctx = await requireTenantWithRow({
    tenantMissingMessage: 'Perfil não encontrado',
  })
  if (ctx instanceof NextResponse) return ctx

  // Verificar plano (IA Contador = enterprise, mas deixar pro_plus ter acesso básico)
  const allowedPlans = ['pro_plus', 'enterprise']
  if (!allowedPlans.includes(ctx.tenant.plan)) {
    return NextResponse.json(
      { error: 'Recurso disponível nos planos Pro Plus e Enterprise' },
      { status: 403 }
    )
  }

  // Rate limit (per-minute, in-memory — complementar ao rate limit diário do guard)
  if (!checkRateLimit(ctx.tenantId)) {
    return NextResponse.json(
      { error: 'Limite de 10 perguntas por minuto atingido' },
      { status: 429 }
    )
  }

  // Cost control: feature gate + rate limit diário + simulate
  let simulate: boolean
  try {
    ;({ simulate } = await guardAICall({
      tenantId: ctx.tenantId,
      plan: ctx.tenant.plan,
      type: 'text',
    }))
  } catch (err) {
    if (err instanceof FeatureNotAvailableError) {
      return NextResponse.json({ error: 'IA Contador não disponível no seu plano' }, { status: 403 })
    }
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: `Limite diário de IA atingido (${err.limit}/dia). Tente novamente mais tarde.` },
        { status: 429 },
      )
    }
    throw err
  }

  const body = await request.json() as { messages: ContadorMessage[] }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'Mensagens inválidas' }, { status: 400 })
  }

  // Buscar contexto financeiro do tenant
  const supabase = await createClient()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [revenueRes, expenseRes, overdueRes, balanceRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'receita')
      .eq('status', 'pago')
      .gte('paid_at', startOfMonth),
    supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'despesa')
      .eq('status', 'pago')
      .gte('paid_at', startOfMonth),
    supabase
      .from('transactions')
      .select('amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'vencido'),
    supabase
      .from('contas_bancarias')
      .select('saldo_atual')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true),
  ])

  const revenue = revenueRes.data?.reduce((s, t) => s + t.amount, 0) ?? 0
  const expenses = expenseRes.data?.reduce((s, t) => s + t.amount, 0) ?? 0
  const overdue = overdueRes.data?.reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = balanceRes.data?.reduce((s, c) => s + c.saldo_atual, 0) ?? 0

  const systemPrompt = buildContadorSystemPrompt({
    tenantName: ctx.tenant.name,
    niche: ctx.tenant.niche,
    plan: ctx.tenant.plan,
    revenueThisMonth: revenue,
    expensesThisMonth: expenses,
    profitThisMonth: revenue - expenses,
    overdueReceivables: overdue,
    cashBalance: balance,
  })

  if (simulate) {
    return NextResponse.json({ message: mockTextResponse('Resposta IA Contador') })
  }

  try {
    const response = await anthropic.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokensCountador,
      system: systemPrompt,
      messages: body.messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Resposta inválida da IA' }, { status: 500 })
    }

    return NextResponse.json({ message: content.text })
  } catch (err) {
    console.error('Anthropic error:', err)
    return NextResponse.json({ error: 'Erro ao processar pergunta' }, { status: 500 })
  }
}
