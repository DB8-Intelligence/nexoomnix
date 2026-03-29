import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { CONTENT_PERSONAS } from '@/lib/content-ai/content-personas'
import type { PersonaId } from '@/lib/content-ai/content-personas'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const NICHE_LABELS: Record<string, string> = {
  beleza:      'Salão de Beleza / Estética',
  tecnico:     'Serviços Técnicos / Reparos',
  saude:       'Saúde / Clínica',
  juridico:    'Advocacia / Jurídico',
  imoveis:     'Corretagem de Imóveis',
  pet:         'Pet Shop / Veterinária',
  educacao:    'Escola / Cursos',
  nutricao:    'Nutrição / Dietética',
  engenharia:  'Engenharia / Construção',
  fotografia:  'Fotografia / Estúdio',
  gastronomia: 'Gastronomia / Restaurante',
  fitness:     'Fitness / Academia / Personal',
  financas:    'Contabilidade / Finanças',
}

const FORMAT_LABELS: Record<string, string> = {
  reel:      'Reel (vídeo vertical 9:16)',
  carrossel: 'Carrossel (slides)',
  story:     'Story (24h)',
  post:      'Post único',
}

function buildPrompt(p: {
  nichoLabel: string
  topic: string
  url?: string
  description?: string
  format: string
  duration: number
  talkingObject: boolean
  talkingObjectName?: string
  talkingObjectGancho?: string
  talkingObjectPersonalidade?: string
  characterDna?: string
  characterObject?: string
  personaId?: PersonaId
  styleReference?: string
}): string {
  const source = [
    p.url && `URL de referência: ${p.url}`,
    p.description && `Briefing adicional: ${p.description}`,
  ].filter(Boolean).join('\n')

  const persona = p.personaId ? CONTENT_PERSONAS[p.personaId] : null
  const personaSection = persona
    ? `\n**Persona de Conteúdo:** ${persona.emoji} ${persona.name} — ${persona.tagline}\n**Tom de voz:** ${persona.contentTone}\n**Fórmula de roteiro:** ${persona.scriptFormula}\n**Pilares de conteúdo:** ${persona.contentPillars.join(' • ')}\n**Ganchos de legenda sugeridos:** ${persona.captionHooks.join(' | ')}`
    : ''

  const styleReferenceSection = p.styleReference
    ? `\n**Estilo Visual de Referência:** ${p.styleReference}\nPREFIXE cada "🖼️ Prompt AI" de cena com este estilo. O prefixo deve vir antes de qualquer descrição de personagem ou ambiente.`
    : ''

  const characterSection = p.characterDna && p.characterObject
    ? `\n**Personagem protagonista:** ${p.characterObject} animado em estilo Pixar/Disney 3D\n**DNA visual do personagem (usar como prefixo em TODOS os prompts de imagem):** ${p.characterDna}\nO personagem deve ser o PROTAGONISTA de todas as cenas. Cada prompt AI de imagem deve começar com o DNA acima.`
    : ''

  const toSection = p.talkingObject
    ? p.talkingObjectName && p.talkingObjectGancho
      ? `

---

## 🎭 OBJETO FALANTE VIRAL — ${p.talkingObjectName}

**Objeto selecionado:** ${p.talkingObjectName}
**Personalidade:** ${p.talkingObjectPersonalidade ?? 'Expressivo, engajante'}
**Gancho de abertura:** "${p.talkingObjectGancho}"

Use este objeto como PROTAGONISTA do reel. O gancho acima deve ser a primeira fala (0–3s).
Gere o roteiro completo (7–15s) com:
- 🎙️ Script completo do objeto (inclua [pausa], [ÊNFASE] e expressões)
- 🖼️ Prompt AI aprimorado (inglês) para animar o objeto com lip-sync
- 🎬 Ferramentas recomendadas: D-ID · HeyGen · CapCut "AI Talking Photo"
- 📱 Legenda e hashtags específicas para este formato`
      : `

---

## 🎭 OBJETO FALANTE VIRAL

Apresente **5 opções** de objetos inanimados que representam o nicho **${p.nichoLabel}**.

Para cada objeto:

**[N]. [EMOJI] [Nome]**
- Personalidade: tom de voz e característica principal
- Gancho de abertura (0–3s): frase impactante para capturar atenção
- 🖼️ Prompt AI (inglês, para Midjourney / DALL-E / Fal.ai): \`"[photorealistic 3D render, Pixar-style character, object with expressive face and lip-sync ready mouth, niche-specific setting, 9:16 vertical, cinematic lighting]"\`
- 🎙️ Script completo (7–15s): O que o objeto fala (inclua [pausa] e [ÊNFASE])
- 🎬 Ferramentas: D-ID · HeyGen · CapCut "AI Talking Photo"`
    : ''

  return `Você é o ReelCreator AI — especialista em produção de conteúdo viral para Instagram.

**Nicho:** ${p.nichoLabel}
**Formato:** ${FORMAT_LABELS[p.format] ?? p.format}
**Duração alvo:** ${p.duration}s
**Tema:** ${p.topic}
${source}${characterSection}${styleReferenceSection}${personaSection}

Gere o PACOTE COMPLETO DE PRODUÇÃO. Adapte TODO o conteúdo para o nicho ${p.nichoLabel}: vocabulário, cenários, dores, soluções, exemplos e tom de voz.${persona ? ` Siga rigorosamente a persona "${persona.name}": tom ${persona.contentTone}, fórmula de roteiro e pilares de conteúdo fornecidos acima.` : ''}

---

## 🎬 ROTEIRO DE CENAS

Para cada cena:

**CENA N — [NOME] | ⏱️ Xs–Xs**
- **Visual:** [descrição + movimento de câmera]
- **Texto em tela:** "[máx 6 palavras]"
- **Narração:** "[fala sincronizada]"
- 🖼️ **Prompt AI** (inglês, 9:16, ultra-realistic): \`"[style, character, environment, lighting, mood, camera angle — aspect ratio 9:16, 8K]"\`

---

## 🎙️ ROTEIRO DE VOZ

Script completo pronto para locutor ou TTS (ElevenLabs / Play.ht / CapCut).
Marcações: [pausa] = 0.5–1s | [pausa longa] = 1.5–2s | [ÊNFASE] = destaque
Duração total: ~${p.duration}s

---

## 📝 LEGENDAS EM TELA

Formato: \`[0:00] "TEXTO" → Fonte: Bold | Cor: Branco | Estilo\`
Máx 6 palavras por legenda. Caixa alta no gancho e no CTA.

---

## 📱 TEXTO DO POST

🪝 **Gancho** (1ª linha — para o scroll antes do "ver mais"):

📖 **Corpo** (3–6 linhas):

🎯 **CTA:**

#️⃣ **Hashtags** (8 grandes >500k + 10 médias 50k–500k + 7 de nicho):

---

## 🎯 3 OPÇÕES DE CTA

1. **Lead Direto** — [frase para DM/WhatsApp]
2. **Engajamento** — [frase para comentários/salvamento]
3. **Autoridade** — [frase para seguir/ativar notificações]
${toSection}`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Não autorizado', { status: 401 })

  const body = await req.json() as {
    topic: string
    url?: string
    description?: string
    format: string
    duration: number
    talkingObject: boolean
    talkingObjectName?: string
    talkingObjectGancho?: string
    talkingObjectPersonalidade?: string
    characterDna?: string
    characterObject?: string
    personaId?: PersonaId
    styleReference?: string
  }

  if (!body.topic?.trim()) {
    return new Response('Tema obrigatório', { status: 400 })
  }

  // Auto-detect niche + tenant_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, tenant:tenants(niche)')
    .eq('id', user.id)
    .single()

  const niche = (profile?.tenant as { niche?: string } | null)?.niche ?? 'tecnico'
  const nichoLabel = NICHE_LABELS[niche] ?? niche

  // Fetch branding profile for personalized prompts
  let brandingSection = ''
  if (profile?.tenant_id) {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('branding_about, branding_audience, branding_tone, branding_differential, branding_pain_point, branding_colors, branding_phrase')
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (settings) {
      const parts: string[] = []
      if (settings.branding_about)        parts.push(`**Negócio:** ${settings.branding_about}`)
      if (settings.branding_audience)     parts.push(`**Público-alvo:** ${settings.branding_audience}`)
      if (settings.branding_tone)         parts.push(`**Tom de voz:** ${settings.branding_tone}`)
      if (settings.branding_differential) parts.push(`**Diferencial:** ${settings.branding_differential}`)
      if (settings.branding_pain_point)   parts.push(`**Dor resolvida:** ${settings.branding_pain_point}`)
      if (settings.branding_colors)       parts.push(`**Cores da marca:** ${settings.branding_colors}`)
      if (settings.branding_phrase)       parts.push(`**Slogan:** "${settings.branding_phrase}"`)
      if (parts.length > 0) {
        brandingSection = `\n\n---\n\n## 🏢 PERFIL DA MARCA\n\n${parts.join('\n')}\n\nAdapte TODO o conteúdo para refletir este perfil de marca. Use o diferencial, a dor e o público-alvo em cada cena, narração e CTA.`
      }
    }
  }

  const prompt = buildPrompt({
    nichoLabel,
    topic: body.topic.trim(),
    url: body.url?.trim() || undefined,
    description: body.description?.trim() || undefined,
    format: body.format ?? 'reel',
    duration: body.duration ?? 30,
    talkingObject: !!body.talkingObject,
    talkingObjectName: body.talkingObjectName?.trim() || undefined,
    talkingObjectGancho: body.talkingObjectGancho?.trim() || undefined,
    talkingObjectPersonalidade: body.talkingObjectPersonalidade?.trim() || undefined,
    characterDna: body.characterDna?.trim() || undefined,
    characterObject: body.characterObject?.trim() || undefined,
    personaId: body.personaId || undefined,
    styleReference: body.styleReference?.trim() || undefined,
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: `Você é o ReelCreator AI. Gere conteúdo de alta qualidade, concreto e pronto para produção. Use emojis para demarcar seções. Seja específico para o nicho fornecido.${brandingSection}`,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n_Erro na geração: ${e instanceof Error ? e.message : 'Falha'}_`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
