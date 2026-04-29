/**
 * Logging mínimo de uso de IA (console-based).
 *
 * Não pretende ser sistema de observabilidade — só deixa rastro pra
 * auditoria no Vercel logs e correlação com billing externo. Sprint
 * futura pode evoluir pra structured logger ou pipe pro n8n/Sentry.
 */

import type { AIType } from './types'

export interface AIUsageLogEntry {
  tenantId: string
  type: AIType
  simulate: boolean
}

export function logAIUsage(entry: AIUsageLogEntry): void {
  console.log(
    `[ai-usage] tenant=${entry.tenantId} type=${entry.type} simulate=${entry.simulate} at=${new Date().toISOString()}`,
  )
}
