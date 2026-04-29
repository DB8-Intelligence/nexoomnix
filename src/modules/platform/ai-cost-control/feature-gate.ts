/**
 * Feature gate por plano do tenant.
 *
 * Mapeamento conservador (Sprint Cost Control — agressivo no controle):
 *   - text:  todos os planos (sem trial vazio)
 *   - image: pro+
 *   - tts:   pro_max+
 *
 * Plans inferiores ao mapeamento bloqueiam com FeatureNotAvailableError.
 * O bloqueio acontece ANTES de qualquer chamada externa — economia direta.
 */

import { FeatureNotAvailableError, type AIType } from './types'

const PLAN_FEATURES: Record<string, ReadonlyArray<AIType>> = {
  trial:      ['text'],
  starter:    ['text'],
  pro:        ['text', 'image'],
  pro_plus:   ['text', 'image'],
  pro_max:    ['text', 'image', 'tts'],
  enterprise: ['text', 'image', 'tts'],
}

export function isFeatureAvailable(plan: string, type: AIType): boolean {
  const allowed = PLAN_FEATURES[plan] ?? []
  return allowed.includes(type)
}

export function assertCanUseAI(plan: string, type: AIType): void {
  if (!isFeatureAvailable(plan, type)) {
    throw new FeatureNotAvailableError(type, plan)
  }
}
