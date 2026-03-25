// ============================================================
// NexoPro — Redes Sociais IA
// Geração de roteiros para vídeos no HeyGen AI Avatar
// ============================================================

import VideoScriptGenerator from '@/components/social/VideoScriptGenerator'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Redes Sociais IA | NexoPro',
}

export default async function RedesSociaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenants(plan)')
    .eq('id', user.id)
    .single()

  const tenant = Array.isArray(profile?.tenants)
    ? profile?.tenants[0]
    : profile?.tenants

  const plan = tenant?.plan ?? 'trial'
  const isPlanBlocked = plan === 'trial' || plan === 'starter'

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Redes Sociais IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gere roteiros completos para vídeos no HeyGen com IA
          </p>
        </div>
        {!isPlanBlocked && (
          <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-3 py-1 rounded-full border border-violet-200">
            IA Ativa
          </span>
        )}
      </div>

      {/* Aviso de plano bloqueado */}
      {isPlanBlocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4 items-start">
          <span className="text-2xl flex-shrink-0">🔒</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Recurso disponível no plano Pro</p>
            <p className="text-amber-700 text-xs mt-1">
              O Gerador de Roteiro IA está disponível a partir do plano Pro (R$&nbsp;199/mês).
              Faça upgrade para criar roteiros ilimitados para o HeyGen.
            </p>
            <a
              href="/planos"
              className="inline-block mt-3 text-xs font-semibold text-amber-800 underline underline-offset-2"
            >
              Ver planos disponíveis →
            </a>
          </div>
        </div>
      )}

      {/* Como funciona — guia rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            step: '1',
            icon: '💡',
            title: 'Cole o tema',
            desc: 'Digite o assunto do vídeo, ou descreva um vídeo que você viu e quer recriar com a sua visão',
          },
          {
            step: '2',
            icon: '🤖',
            title: 'IA gera o roteiro',
            desc: 'A IA cria 6 cenas completas: gancho, problema, explicação, risco, solução e CTA',
          },
          {
            step: '3',
            icon: '🎬',
            title: 'Use no HeyGen',
            desc: 'Copie cada cena com a fala, o movimento e a dica de configuração prontos para o avatar',
          },
        ].map(item => (
          <div key={item.step} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-6 h-6 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {item.step}
              </span>
              <span className="text-base">{item.icon}</span>
              <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed pl-9">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Gerador principal */}
      {isPlanBlocked ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Faça upgrade para o plano Pro para acessar o gerador de roteiros.
        </div>
      ) : (
        <VideoScriptGenerator />
      )}
    </div>
  )
}
