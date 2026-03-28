import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateReelContent } from '@/lib/ai/generator'
import { createClient } from '@/lib/supabase/client'

// Schema de validação da requisição
const GenerateSchema = z.object({
  niche: z.string().min(2).max(100),
  format: z.enum(['reel', 'carrossel', 'post', 'stories', 'calendario']),
  objective: z.enum(['engajamento', 'alcance', 'conversao', 'autoridade']),
  profileContext: z.string().optional(),
  extraInstructions: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação via Supabase
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Buscar plano do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan, reels_used_this_month, reels_limit')
      .eq('user_id', user.id)
      .single()

    const plan = profile?.plan ?? 'free'

    // 3. Verificar limite do plano
    if (profile && profile.reels_used_this_month >= profile.reels_limit) {
      return NextResponse.json(
        { error: 'Limite mensal atingido. Faça upgrade do seu plano.' },
        { status: 429 }
      )
    }

    // 4. Validar body
    const body = await req.json()
    const parsed = GenerateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    // 5. Gerar conteúdo com Claude (skills carregadas automaticamente)
    const content = await generateReelContent({
      ...parsed.data,
      plan,
    })

    // 6. Salvar geração no histórico (Supabase)
    await supabase.from('generated_content').insert({
      user_id: user.id,
      niche: parsed.data.niche,
      format: parsed.data.format,
      objective: parsed.data.objective,
      content,
      created_at: new Date().toISOString(),
    })

    // 7. Incrementar contador de uso
    await supabase
      .from('user_profiles')
      .update({ reels_used_this_month: (profile?.reels_used_this_month ?? 0) + 1 })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, content })

  } catch (err) {
    console.error('[/api/generate] Erro:', err)
    return NextResponse.json(
      { error: 'Erro interno ao gerar conteúdo' },
      { status: 500 }
    )
  }
}
