import Anthropic from '@anthropic-ai/sdk'
import { allSkills, instagramViralEngine, reelContentGenerator } from './skills'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ContentFormat = 'reel' | 'carrossel' | 'post' | 'stories' | 'calendario'
export type ContentObjective = 'engajamento' | 'alcance' | 'conversao' | 'autoridade'

export interface GenerateReelInput {
  niche: string
  format: ContentFormat
  objective: ContentObjective
  profileContext?: string   // resumo do perfil analisado (opcional)
  extraInstructions?: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
}

export interface AnalyzeProfileInput {
  profileDescription: string  // descrição ou texto extraído das imagens do perfil
  niche?: string
}

export interface GeneratedContent {
  hook: string
  scenes: Scene[]
  voiceScript: string
  caption: string
  hashtags: string[]
  ctaOptions: string[]
  viralScore: number
  viralFactor: string
  talkingObjectSuggestions?: string[]
}

export interface Scene {
  number: number
  duration: string
  visualDescription: string
  screenText: string
  voiceLine: string
  aiImagePrompt: string
}

export interface ProfileAnalysis {
  niche: string
  objective: string
  aesthetic: string
  engagementLevel: 'baixo' | 'médio' | 'alto'
  strengths: string[]
  gaps: string[]
  viralOpportunities: string[]
  nextSteps: string[]
}

// ─── Gerador de Reel ──────────────────────────────────────────────────────────

export async function generateReelContent(
  input: GenerateReelInput
): Promise<GeneratedContent> {
  const systemPrompt = reelContentGenerator()

  const userMessage = `
Gere um pacote completo de conteúdo com as seguintes especificações:

**Nicho:** ${input.niche}
**Formato:** ${input.format}
**Objetivo:** ${input.objective}
**Plano do usuário:** ${input.plan}
${input.profileContext ? `**Contexto do perfil:** ${input.profileContext}` : ''}
${input.extraInstructions ? `**Instruções adicionais:** ${input.extraInstructions}` : ''}

Responda APENAS em JSON válido com a seguinte estrutura:
{
  "hook": "texto exato do hook",
  "scenes": [
    {
      "number": 1,
      "duration": "0-3s",
      "visualDescription": "descrição visual da cena",
      "screenText": "texto na tela (máx 6 palavras)",
      "voiceLine": "linha de narração",
      "aiImagePrompt": "prompt em inglês para geração de imagem, aspect ratio 9:16"
    }
  ],
  "voiceScript": "roteiro de voz completo com marcações [pausa] [ÊNFASE]",
  "caption": "legenda completa do post",
  "hashtags": ["hashtag1", "hashtag2"],
  "ctaOptions": ["CTA opção 1", "CTA opção 2", "CTA opção 3"],
  "viralScore": 4,
  "viralFactor": "explicação do potencial viral",
  "talkingObjectSuggestions": ["objeto 1", "objeto 2", "objeto 3"]
}
`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as GeneratedContent
}

// ─── Analisador de Perfil ─────────────────────────────────────────────────────

export async function analyzeInstagramProfile(
  input: AnalyzeProfileInput
): Promise<ProfileAnalysis> {
  const systemPrompt = instagramViralEngine()

  const userMessage = `
Analise o seguinte perfil do Instagram e retorne o diagnóstico completo.

**Descrição/dados do perfil:**
${input.profileDescription}
${input.niche ? `**Nicho declarado:** ${input.niche}` : ''}

Responda APENAS em JSON válido com a seguinte estrutura:
{
  "niche": "nicho principal detectado",
  "objective": "objetivo percebido do perfil",
  "aesthetic": "descrição da identidade visual",
  "engagementLevel": "baixo|médio|alto",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "viralOpportunities": ["oportunidade 1", "oportunidade 2", "oportunidade 3"],
  "nextSteps": ["ação imediata", "curto prazo", "médio prazo"]
}
`

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as ProfileAnalysis
}

// ─── Gerador de Estratégia Viral ──────────────────────────────────────────────

export async function generateViralStrategy(
  niche: string,
  profileContext?: string
): Promise<string> {
  const systemPrompt = allSkills()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Gere uma estratégia viral completa para o nicho: ${niche}.
      ${profileContext ? `Contexto do perfil: ${profileContext}` : ''}
      Inclua: calendário semanal, tipos de conteúdo recomendados, hooks de alto impacto e banco de ideias.`
    }],
  })

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
