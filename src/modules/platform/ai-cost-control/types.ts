/**
 * Tipos compartilhados do módulo de cost control de IA.
 */

export type AIType = 'text' | 'image' | 'tts'

export class FeatureNotAvailableError extends Error {
  constructor(public readonly type: AIType, public readonly plan: string) {
    super(`ai-feature-not-available:${type}:${plan}`)
    this.name = 'FeatureNotAvailableError'
  }
}

export class RateLimitExceededError extends Error {
  constructor(public readonly type: AIType, public readonly limit: number) {
    super(`ai-rate-limit-exceeded:${type}:${limit}`)
    this.name = 'RateLimitExceededError'
  }
}
