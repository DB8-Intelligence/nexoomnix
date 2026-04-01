import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service client for server-side operations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/**
 * POST /api/crm/messages
 * Send a message via WhatsApp (wa.me link) and log it in the CRM.
 * Also used to auto-send appointment confirmations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, deal_id, client_id, channel, content, template_id, appointment_id } = body

    if (!tenant_id || !channel || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Save message record
    const { data: message, error: msgError } = await supabase
      .from('crm_messages')
      .insert({
        tenant_id,
        deal_id: deal_id ?? null,
        client_id: client_id ?? null,
        channel,
        direction: 'outbound',
        status: 'sent',
        content,
        template_id: template_id ?? null,
        metadata: appointment_id ? { appointment_id } : {},
        sent_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 })
    }

    // If deal_id provided, add activity
    if (deal_id) {
      const activityType = channel === 'whatsapp' ? 'whatsapp_sent'
        : channel === 'instagram' ? 'instagram_dm'
        : channel === 'facebook' ? 'facebook_msg' : 'note'

      await supabase.from('crm_activities').insert({
        deal_id,
        tenant_id,
        type: activityType,
        title: appointment_id
          ? 'Confirmacao de agendamento enviada'
          : `Mensagem enviada via ${channel}`,
        description: content.substring(0, 200),
        metadata: { message_id: message.id },
      })
    }

    // For WhatsApp: generate wa.me link
    let whatsapp_link: string | null = null
    if (channel === 'whatsapp') {
      // Try to get the client's whatsapp number
      let phone: string | null = null
      if (client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('whatsapp')
          .eq('id', client_id)
          .single()
        phone = client?.whatsapp ?? null
      }
      if (!phone && deal_id) {
        const { data: deal } = await supabase
          .from('crm_deals')
          .select('contact_whatsapp')
          .eq('id', deal_id)
          .single()
        phone = deal?.contact_whatsapp ?? null
      }
      if (phone) {
        const cleanPhone = phone.replace(/\D/g, '')
        const encodedMsg = encodeURIComponent(content)
        whatsapp_link = `https://wa.me/55${cleanPhone}?text=${encodedMsg}`
      }
    }

    return NextResponse.json({ message, whatsapp_link })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
