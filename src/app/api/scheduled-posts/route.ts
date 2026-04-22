import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const upcomingOnly = req.nextUrl.searchParams.get('upcoming') !== 'false'
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 100)

  let query = supabase
    .from('scheduled_posts')
    .select('id, caption, media_urls, media_type, hashtags, status, scheduled_for, published_at, platform_permalink, error_message, attempts, created_at')
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (upcomingOnly) {
    query = query.in('status', ['scheduled', 'publishing'])
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data ?? [] })
}
