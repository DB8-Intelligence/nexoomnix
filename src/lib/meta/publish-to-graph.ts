// Função pura de publicação na Meta Graph API.
// Extraída pra ser reusada pelo endpoint síncrono (/api/meta/publish) e
// pelo cron worker (/api/cron/publish-scheduled). Não toca no banco —
// cabe ao chamador atualizar scheduled_posts conforme o resultado.

export interface MetaConnection {
  platform: string
  account_id: string
  access_token: string
  page_access_token?: string | null
}

export interface MetaPublishInput {
  caption: string
  mediaUrls: string[]
  mediaType: 'image' | 'video' | 'carousel' | 'reel'
}

export interface MetaPublishResult {
  platformPostId: string
  permalink: string | null
}

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graphPost(url: string, body: Record<string, unknown>): Promise<{ id?: string; post_id?: string; error?: { message: string } }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ id?: string; post_id?: string; error?: { message: string } }>
}

export async function publishToMeta(
  connection: MetaConnection,
  input: MetaPublishInput,
): Promise<MetaPublishResult> {
  const { caption, mediaUrls, mediaType } = input

  if (connection.platform === 'facebook') {
    const pageToken = connection.page_access_token ?? connection.access_token
    const data = await graphPost(`${GRAPH}/${connection.account_id}/photos`, {
      url: mediaUrls[0],
      caption,
      access_token: pageToken,
    })
    const platformPostId = data.post_id ?? data.id
    if (!platformPostId) throw new Error(data.error?.message ?? 'Erro ao publicar no Facebook')
    return { platformPostId, permalink: null }
  }

  // Instagram
  const igAccountId = connection.account_id
  const token = connection.access_token
  let creationId: string

  if (mediaType === 'carousel' && mediaUrls.length > 1) {
    const itemIds: string[] = []
    for (const url of mediaUrls) {
      const item = await graphPost(`${GRAPH}/${igAccountId}/media`, {
        image_url: url,
        is_carousel_item: true,
        access_token: token,
      })
      if (!item.id) throw new Error(item.error?.message ?? 'Erro ao criar item do carrossel')
      itemIds.push(item.id)
    }
    const container = await graphPost(`${GRAPH}/${igAccountId}/media`, {
      media_type: 'CAROUSEL',
      caption,
      children: itemIds,
      access_token: token,
    })
    if (!container.id) throw new Error(container.error?.message ?? 'Erro ao criar container')
    creationId = container.id
  } else {
    const mediaParams: Record<string, string> = { caption, access_token: token }
    if (mediaType === 'reel' || mediaType === 'video') {
      mediaParams.media_type = 'REELS'
      mediaParams.video_url = mediaUrls[0]
      mediaParams.share_to_feed = 'true'
    } else {
      mediaParams.image_url = mediaUrls[0]
    }
    const created = await graphPost(`${GRAPH}/${igAccountId}/media`, mediaParams)
    if (!created.id) throw new Error(created.error?.message ?? 'Erro ao criar media')

    // Aguardar processamento de vídeo (polling básico)
    if (mediaType === 'reel' || mediaType === 'video') {
      let ready = false
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const statusRes = await fetch(`${GRAPH}/${created.id}?fields=status_code&access_token=${token}`)
        const statusData = await statusRes.json() as { status_code?: string }
        if (statusData.status_code === 'FINISHED') { ready = true; break }
        if (statusData.status_code === 'ERROR') throw new Error('Erro no processamento do vídeo')
      }
      if (!ready) throw new Error('Timeout no processamento do vídeo')
    }
    creationId = created.id
  }

  const published = await graphPost(`${GRAPH}/${igAccountId}/media_publish`, {
    creation_id: creationId,
    access_token: token,
  })
  if (!published.id) throw new Error(published.error?.message ?? 'Erro ao publicar')
  const platformPostId = published.id

  const permalinkRes = await fetch(`${GRAPH}/${platformPostId}?fields=permalink&access_token=${token}`)
  const permalinkData = await permalinkRes.json() as { permalink?: string }
  return { platformPostId, permalink: permalinkData.permalink ?? null }
}
