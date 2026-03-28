import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzeInstagramProfile } from '@/lib/ai/generator'
import { createClient } from '@/lib/supabase/client'

const AnalyzeSchema = z.object({
  profileDescription: z.string().min(10),
  niche: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = AnalyzeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Análise de perfil usa instagram-viral-engine automaticamente via skills.ts
    const analysis = await analyzeInstagramProfile(parsed.data)

    // Salvar análise para uso futuro como profileContext na geração
    await supabase.from('profile_analyses').insert({
      user_id: user.id,
      analysis,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, analysis })

  } catch (err) {
    console.error('[/api/analyze] Erro:', err)
    return NextResponse.json({ error: 'Erro interno na análise' }, { status: 500 })
  }
}
