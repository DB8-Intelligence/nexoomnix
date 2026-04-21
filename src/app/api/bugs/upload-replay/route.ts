// Upload de session replay (eventos rrweb) associado a um bug report.
// Salva um JSON no bucket 'content' path bug-replays/<user_id>/<uuid>.json
// e retorna a URL pública pro client anexar no report.

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const MAX_SIZE = 8 * 1024 * 1024 // 8 MB

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const events = await req.json() as unknown[]
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Body precisa ser array de eventos rrweb' }, { status: 400 })
  }

  const json = JSON.stringify(events)
  if (json.length > MAX_SIZE) {
    return NextResponse.json({ error: 'Replay maior que 8MB' }, { status: 400 })
  }

  const path = `bug-replays/${user.id}/${randomUUID()}.json`
  const { error } = await supabase.storage
    .from('content')
    .upload(path, Buffer.from(json), { contentType: 'application/json', upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabase.storage.from('content').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, events: events.length })
}
