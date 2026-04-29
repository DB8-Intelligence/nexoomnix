import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PublishRequest {
  connectionId: string       // ID da social_media_connections
  caption: string
  mediaUrls: string[]        // URLs públicas das imagens/vídeo
  mediaType: 'image' | 'video' | 'carousel' | 'reel'
  hashtags?: string[]
}

// POST — publicar imediatamente via Meta Graph API
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verificar plano PRO MAX
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(plan)')
    .eq('id', user.id)
    .single()

  const plan = (profile?.tenants as { plan?: string } | null)?.plan
  if (!plan || !['pro_max', 'enterprise'].includes(plan)) {
    return NextResponse.json(
      { error: 'Esta funcionalidade requer o plano PRO MAX ou superior.' },
      { status: 403 }
    )
  }

  const body: PublishRequest = await req.json()
  const { connectionId, caption, mediaUrls, mediaType, hashtags = [] } = body

  if (!connectionId || !caption || !mediaUrls?.length) {
    return NextResponse.json({ error: 'connectionId, caption e mediaUrls são obrigatórios' }, { status: 400 })
  }

  // Buscar conexão
  const { data: connection } = await supabase
    .from('social_media_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('is_active', true)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Conexão não encontrada ou inativa' }, { status: 404 })
  }

  // Criar registro de post como "publishing"
  const fullCaption = hashtags.length
    ? `${caption}\n\n${hashtags.join(' ')}`
    : caption

  const { data: post, error: postError } = await supabase
    .from('scheduled_posts')
    .insert({
      tenant_id: profile!.tenant_id,
      user_id: user.id,
      connection_id: connectionId,
      caption: fullCaption,
      media_urls: mediaUrls,
      media_type: mediaType,
      hashtags,
      status: 'publishing',
    })
    .select()
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Erro ao criar registro do post' }, { status: 500 })
  }

  try {
    let platformPostId: string
    let permalink: string | null = null

    if (connection.platform === 'instagram') {
      // Instagram Content Publishing API
      const igAccountId = connection.account_id
      const token = connection.access_token

      if (mediaType === 'carousel' && mediaUrls.length > 1) {
        // Carousel: criar item containers + container principal
        const itemIds: string[] = []
        for (const url of mediaUrls) {
          const itemRes = await fetch(
            `https://graph.facebook.com/v21.0/${igAccountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: url,
                is_carousel_item: true,
                access_token: token,
              }),
            }
          )
          const itemData = await itemRes.json() as { id?: string; error?: { message: string } }
          if (!itemData.id) throw new Error(itemData.error?.message ?? 'Erro ao criar item do carrossel')
          itemIds.push(itemData.id)
        }

        // Container do carrossel
        const containerRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              media_type: 'CAROUSEL',
              caption: fullCaption,
              children: itemIds,
              access_token: token,
            }),
          }
        )
        const containerData = await containerRes.json() as { id?: string; error?: { message: string } }
        if (!containerData.id) throw new Error(containerData.error?.message ?? 'Erro ao criar container')

        // Publicar
        const publishRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
          }
        )
        const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
        if (!publishData.id) throw new Error(publishData.error?.message ?? 'Erro ao publicar carrossel')
        platformPostId = publishData.id
      } else {
        // Single image ou Reel
        const mediaParams: Record<string, string> = {
          caption: fullCaption,
          access_token: token,
        }

        if (mediaType === 'reel' || mediaType === 'video') {
          mediaParams.media_type = 'REELS'
          mediaParams.video_url = mediaUrls[0]
          mediaParams.share_to_feed = 'true'
        } else {
          mediaParams.image_url = mediaUrls[0]
        }

        const createRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mediaParams),
          }
        )
        const createData = await createRes.json() as { id?: string; error?: { message: string } }
        if (!createData.id) throw new Error(createData.error?.message ?? 'Erro ao criar media')

        // Aguardar processamento de vídeo (polling básico)
        if (mediaType === 'reel' || mediaType === 'video') {
          let ready = false
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 3000))
            const statusRes = await fetch(
              `https://graph.facebook.com/v21.0/${createData.id}?fields=status_code&access_token=${token}`
            )
            const statusData = await statusRes.json() as { status_code?: string }
            if (statusData.status_code === 'FINISHED') { ready = true; break }
            if (statusData.status_code === 'ERROR') throw new Error('Erro no processamento do vídeo')
          }
          if (!ready) throw new Error('Timeout no processamento do vídeo. Tente novamente em alguns minutos.')
        }

        const publishRes = await fetch(
          `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: createData.id, access_token: token }),
          }
        )
        const publishData = await publishRes.json() as { id?: string; error?: { message: string } }
        if (!publishData.id) throw new Error(publishData.error?.message ?? 'Erro ao publicar')
        platformPostId = publishData.id
      }

      // Buscar permalink
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v21.0/${platformPostId}?fields=permalink&access_token=${token}`
      )
      const permalinkData = await permalinkRes.json() as { permalink?: string }
      permalink = permalinkData.permalink ?? null
    } else {
      // Facebook Page
      const pageId = connection.account_id
      const pageToken = connection.page_access_token ?? connection.access_token

      const fbRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: mediaUrls[0],
            caption: fullCaption,
            access_token: pageToken,
          }),
        }
      )
      const fbData = await fbRes.json() as { post_id?: string; id?: string; error?: { message: string } }
      if (!fbData.post_id && !fbData.id) throw new Error(fbData.error?.message ?? 'Erro ao publicar no Facebook')
      platformPostId = (fbData.post_id ?? fbData.id)!
    }

    // Atualizar registro como published
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        platform_post_id: platformPostId,
        platform_permalink: permalink,
      })
      .eq('id', post.id)

    // Atualizar last_used_at da conexão
    await supabase
      .from('social_media_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', connectionId)

    return NextResponse.json({
      success: true,
      postId: post.id,
      platformPostId,
      permalink,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[meta/publish] error:', message)

    // Atualizar registro como failed
    await supabase
      .from('scheduled_posts')
      .update({ status: 'failed', error_message: message })
      .eq('id', post.id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
