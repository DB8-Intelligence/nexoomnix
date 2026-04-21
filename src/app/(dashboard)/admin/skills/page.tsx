export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SkillsAdminClient } from './SkillsAdminClient'
import { isDb8Staff } from '@/lib/staff'

export const metadata: Metadata = {
  title: 'Skills Factory — NexoOmnix Admin',
  description: 'Painel de Skills de IA por nicho — monitoramento e geração automática',
}

export default async function SkillsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Gate: painel é admin-only DB8. Cliente final recebe 404.
  if (!isDb8Staff(user.email)) notFound()

  const { data: skills } = await supabase
    .from('agent_skills')
    .select('id, nicho, display_name, app_name, status, versao, gerado_em, gerado_por, pilares, hooks_banco, talking_objects, prompts_ai, ideias_conteudo, ctas_banco, skill_header, gaps_comuns')
    .order('display_name', { ascending: true })

  const { data: logs } = await supabase
    .from('skill_generation_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return <SkillsAdminClient skills={skills ?? []} logs={logs ?? []} />
}