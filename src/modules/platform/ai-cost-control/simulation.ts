/**
 * Modo simulação: quando SIMULATE_AI=true no ambiente, todas as
 * chamadas de IA externas (Anthropic, Fal.ai, ElevenLabs, OpenAI)
 * são substituídas por mocks determinísticos.
 *
 * Pra usar em ambiente de dev/QA sem queimar crédito.
 */

export function isSimulating(): boolean {
  return process.env.SIMULATE_AI === 'true'
}

/** Resposta texto consistente para qualquer chamada Anthropic. */
export function mockTextResponse(label = 'Conteúdo gerado'): string {
  return `${label} (modo simulação)`
}

/** URL placeholder para imagens. Compatível com <img src=...>. */
export function mockImageUrl(width = 512, height = 512): string {
  return `https://placehold.co/${width}x${height}.png?text=simulate`
}

/**
 * URL fake para áudio. Não é um MP3 válido — frontend deve degradar
 * graciosamente quando SIMULATE_AI=true ou expor um indicador visual
 * de modo simulação no UI futura.
 */
export function mockVoiceUrl(): string {
  return 'https://placehold.co/mock-voice.mp3'
}

/**
 * JSON estruturado mockado para rotas que esperam parse de output IA.
 * Caller passa o shape esperado e simulação devolve algo determinístico
 * compatível.
 */
export function mockJsonResponse<T extends Record<string, unknown>>(shape: T): T {
  return shape
}
