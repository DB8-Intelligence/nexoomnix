// Upload de screenshot associado a um bug report. Qualquer user autenticado
// pode subir — o PNG vai pro bucket 'content' path bug-screenshots/<user_id>/.
// Retorna a URL pública pro client anexar ao payload do POST /api/bugs.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo file obrigatório' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Screenshot maior que 8MB' }, { status: 400 })
  }

  const path = `bug-screenshots/${user.id}/${randomUUID()}.png`
  const buffer = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('content')
    .upload(path, buffer, { contentType: 'image/png', upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('content').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
