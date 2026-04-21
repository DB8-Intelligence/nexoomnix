import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDb8Staff } from '@/lib/staff'

const N8N_SKILL_FACTORY_WEBHOOK = process.env.N8N_SKILL_FACTORY_WEBHOOK ?? ''

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isDb8Staff(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { nicho: string; action: 'pausar' | 'reativar' | 'regenerar' }
  const { nicho, action } = body

  if (!nicho || !action) {
    return NextResponse.json({ error: 'nicho e action são obrigatórios' }, { status: 400 })
  }

  const newStatus = action === 'pausar'
    ? 'pausado'
    : action === 'reativar'
    ? 'ativo'
    : 'pendente_geracao'

  // Atualiza status no Supabase
  const { error: updateError } = await supabase
    .from('agent_skills')
    .update({ status: newStatus })
    .eq('nicho', nicho)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registra no log
  await supabase.from('skill_generation_log').insert({
    nicho,
    evento: action === 'regenerar' ? 'regenerado' : action === 'pausar' ? 'pausado' : 'ativado',
    detalhe: `Ação manual: ${action} via painel admin`,
  })

  // Se regenerar, aciona o webhook do n8n para processar imediatamente
  if (action === 'regenerar' && N8N_SKILL_FACTORY_WEBHOOK) {
    try {
      await fetch(N8N_SKILL_FACTORY_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho, acionado_por: user.email, origem: 'admin_panel' }),
      })
    } catch {
      // Webhook falhou, mas o status já foi atualizado — n8n vai pegar no próximo ciclo de 6h
      console.warn(`[skills/trigger-factory] n8n webhook falhou para nicho ${nicho}`)
    }
  }

  return NextResponse.json({ ok: true, nicho, newStatus })
}
