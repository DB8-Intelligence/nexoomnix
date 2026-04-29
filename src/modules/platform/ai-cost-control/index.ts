/**
 * AI cost-control facade.
 *
 * Use case típico em route handler / use case:
 *
 *   const ctx = await requireTenantWithRow()
 *   if (ctx instanceof NextResponse) return ctx
 *
 *   try {
 *     const { simulate } = await guardAICall({
 *       tenantId: ctx.tenantId,
 *       plan: ctx.tenant.plan,
 *       type: 'text',
 *     })
 *
 *     if (simulate) {
 *       return NextResponse.json({ message: mockTextResponse() })
 *     }
 *
 *     // ... chamada real Anthropic/Fal/ElevenLabs aqui
 *   } catch (err) {
 *     if (err instanceof FeatureNotAvailableError) {
 *       return NextResponse.json({ error: 'Recurso não disponível no seu plano' }, { status: 403 })
 *     }
 *     if (err instanceof RateLimitExceededError) {
 *       return NextResponse.json({
 *         error: `Limite diário de ${err.type} atingido (${err.limit}/dia). Tente novamente mais tarde.`,
 *       }, { status: 429 })
 *     }
 *     throw err
 *   }
 */

import { assertCanUseAI } from './feature-gate'
import { logAIUsage } from './logging'
import { checkAndRecordUsage } from './rate-limit'
import { isSimulating } from './simulation'
import type { AIType } from './types'

export interface AIGuardInput {
  tenantId: string
  plan: string
  type: AIType
}

export interface AIGuardResult {
  /** Quando true, o caller deve retornar mock em vez de chamar a API externa. */
  simulate: boolean
}

/**
 * Guard centralizado pra qualquer chamada de IA.
 *
 * Ordem dos checks:
 *   1. Feature gate por plano   → throws FeatureNotAvailableError (403 no caller)
 *   2. Rate limit + record use  → throws RateLimitExceededError (429 no caller)
 *   3. Log
 *   4. Retorna { simulate } — caller decide se mocka ou chama API
 *
 * Side effects:
 *   - Insert em ai_usage (1 linha por chamada, real ou simulada)
 *   - console.log da entrada
 */
export async function guardAICall(input: AIGuardInput): Promise<AIGuardResult> {
  assertCanUseAI(input.plan, input.type)
  const simulate = isSimulating()
  await checkAndRecordUsage(input.tenantId, input.type, simulate)
  logAIUsage({ tenantId: input.tenantId, type: input.type, simulate })
  return { simulate }
}

export {
  isSimulating,
  mockImageUrl,
  mockJsonResponse,
  mockTextResponse,
  mockVoiceUrl,
} from './simulation'

export {
  assertCanUseAI,
  isFeatureAvailable,
} from './feature-gate'

export {
  getDailyLimit,
} from './rate-limit'

export {
  FeatureNotAvailableError,
  RateLimitExceededError,
  type AIType,
} from './types'
