import type { BrandingContext } from './branding-context'
import { formatBrandingBlock } from './branding-context'

export function buildAnalysisPrompt(
  source: string,
  nicho: string,
  branding?: BrandingContext | null,
): string {
  const brandingBlock = formatBrandingBlock(branding ?? null)

  return `Você é um especialista em marketing digital para o nicho de ${nicho} no Brasil.${brandingBlock}
Analise a seguinte descrição de negócio/conteúdo e crie um plano de conteúdo para redes sociais:

${source}

Retorne um JSON com esta estrutura exata (sem markdown, apenas JSON puro):
{
  "title": "título sugerido para o conteúdo",
  "target_audience": "descrição do público-alvo",
  "key_messages": ["mensagem 1", "mensagem 2", "mensagem 3"],
  "tone": "profissional | casual | energético | emocional | educativo",
  "suggested_format": "reel | post | carrossel | stories",
  "hook": "frase de abertura impactante para o vídeo",
  "cta": "chamada para ação clara",
  "scenes": [
    { "id": 1, "description": "descrição da cena 1", "duration_sec": 3, "image_prompt": "prompt em inglês para geração da imagem" },
    { "id": 2, "description": "descrição da cena 2", "duration_sec": 4, "image_prompt": "prompt em inglês para geração da imagem" },
    { "id": 3, "description": "descrição da cena 3", "duration_sec": 3, "image_prompt": "prompt em inglês para geração da imagem" }
  ]
}

Os image_prompts devem ser detalhados e em inglês, adequados para geração por IA (Flux/SDXL), no estilo fotorrealístico ou 3D dependendo do nicho.${
    branding?.colors
      ? ` Incorpore a paleta "${branding.colors}" nas descrições visuais quando couber.`
      : ''
  }`
}

export function buildPackagePrompt(
  analysis: { title: string; hook: string; cta: string; key_messages: string[]; tone: string },
  nicho: string,
  tenantName: string,
  branding?: BrandingContext | null,
): string {
  const brandingBlock = formatBrandingBlock(branding ?? null)
  // Se o branding define um tom, ele tem prioridade sobre o tom detectado na análise.
  const effectiveTone = branding?.tone ?? analysis.tone

  return `Você é um copywriter especialista em marketing para ${nicho} no Brasil.${brandingBlock}
Com base nesta análise de conteúdo:
- Título: ${analysis.title}
- Hook: ${analysis.hook}
- Mensagens-chave: ${analysis.key_messages.join(', ')}
- Tom: ${effectiveTone}
- CTA: ${analysis.cta}
- Negócio: ${tenantName}

Crie o pacote de texto completo para redes sociais. Retorne JSON puro (sem markdown):
{
  "caption": "legenda completa para Instagram (máx 2200 chars, com emojis, quebras de linha, e hashtags no final)",
  "post_text": "texto curto e impactante para feed (máx 150 chars, sem hashtags)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5", "#hashtag6", "#hashtag7", "#hashtag8", "#hashtag9", "#hashtag10"],
  "ctas": [
    { "text": "texto do botão CTA 1", "type": "whatsapp", "value": "" },
    { "text": "texto do botão CTA 2", "type": "link", "value": "" }
  ]
}

A legenda deve ser envolvente, usar emojis estrategicamente, ter linha de abertura impactante e terminar com chamada para ação.${
    branding?.phrase
      ? ` Quando fizer sentido, encaixe naturalmente a frase-marca "${branding.phrase}".`
      : ''
  }
Os hashtags devem ser relevantes para o nicho ${nicho} e misturar populares com nichados.`
}
