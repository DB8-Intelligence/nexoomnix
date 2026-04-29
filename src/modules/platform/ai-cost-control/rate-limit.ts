/**
 * Rate limit diário por tenant + tipo de IA.
 *
 * Limites hardcoded (Sprint Cost Control — conservadores):
 *   - text:  20/dia
 *   - image: 10/dia
 *   - tts:   5/dia
 *
 * Implementação: query count em `ai_usage` da janela últimas 24h
 * (sliding window). Se < limite, INSERT e proceed. Se >=, throw.
 *
 * Race condition: dois requests simultâneos podem ambos passar o
 * count check antes de qualquer INSERT. Aceito — para os volumes
 * em jogo (5-20/dia), 1 request a mais é trivial. Solução robusta
 * (locking ou RPC atômico) sai em sprint futura se virar issue real.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { RateLimitExceededError, type AIType } from './types'

const DAILY_LIMITS: Record<AIType, number> = {
  text: 20,
  image: 10,
  tts: 5,
}

/**
 * Checa o rate limit e, se OK, registra o uso (uma linha em ai_usage).
 * Throws RateLimitExceededError se excedeu.
 */
export async function checkAndRecordUsage(
  tenantId: string,
  type: AIType,
  simulate: boolean,
): Promise<void> {
  const limit = DAILY_LIMITS[type]
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createServiceClient()

  const { count, error: countErr } = await supabase
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .gte('created_at', since)

  if (countErr) throw countErr

  if ((count ?? 0) >= limit) {
    throw new RateLimitExceededError(type, limit)
  }

  // Registra o uso (real ou simulado — útil pra audit do simulate ratio)
  const { error: insertErr } = await supabase
    .from('ai_usage')
    .insert({ tenant_id: tenantId, type, simulate })

  if (insertErr) throw insertErr
}

export function getDailyLimit(type: AIType): number {
  return DAILY_LIMITS[type]
}
