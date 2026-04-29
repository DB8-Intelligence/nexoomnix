/**
 * Repositório de idempotência do webhook Stripe.
 *
 * Estados possíveis para um `event.id`:
 *   - `processing` — inserido, side effects em andamento
 *   - `processed`  — side effects concluídos com sucesso
 *   - `failed`     — algum side effect falhou, elegível para retry
 *
 * Decisões operacionais (documentadas no ADR associado ao Sprint 7):
 *
 *   - `new` (nunca visto): insere com `processing`, o caller processa
 *   - `already-processed`: caller pula side effects, retorna 200
 *   - `in-flight` (processing por outra entrega simultânea): caller pula,
 *       retorna 200 — mais conservador. Entregas concorrentes do mesmo
 *       event.id são raras (Stripe espaça retries). Zombies em `processing`
 *       por crash de processo ficam como dívida técnica — cleanup via
 *       ferramenta operacional futura (ver observações).
 *   - `retry-failed`: transição atômica `failed → processing`, caller
 *       processa. Se dois deliveries simultâneos disputarem o retry,
 *       só um ganha a transição; o outro vê `in-flight`.
 *
 * Este módulo roda com service_role (webhook não tem sessão de user).
 */

import { createServiceClient } from '@/lib/supabase/server'

export type RegisterEventResult =
  | { kind: 'new' }
  | { kind: 'retry-failed' }
  | { kind: 'already-processed' }
  | { kind: 'in-flight' }

export interface StripeEventForIdempotency {
  id: string
  type: string
  livemode: boolean
  apiVersion: string | null
  /** Payload completo do evento (será persistido em jsonb para audit). */
  raw: unknown
}

const TABLE = 'stripe_webhook_events'
const PG_UNIQUE_VIOLATION = '23505'

export async function registerEvent(
  event: StripeEventForIdempotency,
): Promise<RegisterEventResult> {
  const supabase = await createServiceClient()

  // 1) Tentativa atômica de inserir como novo evento.
  //    Unicidade garantida pelo PRIMARY KEY em id.
  const insert = await supabase
    .from(TABLE)
    .insert({
      id: event.id,
      type: event.type,
      status: 'processing',
      livemode: event.livemode,
      api_version: event.apiVersion,
      payload: event.raw,
    })
    .select('id')
    .single()

  if (!insert.error) return { kind: 'new' }

  // Erro diferente de unique-violation: propaga
  if (insert.error.code !== PG_UNIQUE_VIOLATION) throw insert.error

  // 2) Conflito: o event.id já existe. Ler status atual.
  const existing = await supabase
    .from(TABLE)
    .select('status')
    .eq('id', event.id)
    .single()

  if (existing.error) throw existing.error
  if (!existing.data) {
    throw new Error(`stripe_webhook_events: conflict em ${event.id} mas row sumiu`)
  }

  const status = existing.data.status as 'processing' | 'processed' | 'failed'

  if (status === 'processed') return { kind: 'already-processed' }
  if (status === 'processing') return { kind: 'in-flight' }

  // 3) Status = 'failed' → tentar transição atômica para 'processing'.
  //    Filtro `.eq('status', 'failed')` garante que só quem vê o estado
  //    'failed' ganha o UPDATE. Concorrentes caem no else.
  const retry = await supabase
    .from(TABLE)
    .update({
      status: 'processing',
      failed_at: null,
      error_message: null,
    })
    .eq('id', event.id)
    .eq('status', 'failed')
    .select('id')

  if (retry.error) throw retry.error
  if (retry.data && retry.data.length > 0) return { kind: 'retry-failed' }

  // Alguém já transicionou entre o read e o update — tratar como in-flight.
  return { kind: 'in-flight' }
}

export async function markProcessed(eventId: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: 'processed',
      processed_at: new Date().toISOString(),
      failed_at: null,
      error_message: null,
    })
    .eq('id', eventId)
  if (error) throw error
}

export async function markFailed(eventId: string, errorMessage: string): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from(TABLE)
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, 2000),
    })
    .eq('id', eventId)
  if (error) throw error
}
