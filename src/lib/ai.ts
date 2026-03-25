// ============================================================
// NexoPro — Cliente Anthropic para o Agente IA Contador
// Usar APENAS em API Routes (server-side)
// NUNCA importar em componentes client-side
// ============================================================

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokensDefault: 1000,
  maxTokensReport: 2000,
  maxTokensCountador: 1500,
  maxTokensRoteiro: 2000,
} as const

// ============================================================
// Tipos para Gerador de Roteiro HeyGen
// ============================================================

export type TipoCena =
  | 'gancho'
  | 'problema'
  | 'explicacao'
  | 'risco'
  | 'solucao'
  | 'cta'

export interface CenaRoteiro {
  numero: number
  tipo: TipoCena
  tipoLabel: string
  fala: string
  movimento: string
  duracaoSegundos: number
  dicaHeygen: string
}

export interface MecanismoViralidade {
  medo: string
  erro: string
  curiosidade: string
}

export interface RoteiroCompleto {
  titulo: string
  tema: string
  angulo: string
  cenas: CenaRoteiro[]
  duracaoTotal: string
  hashtags: string[]
  legenda: string
  mecanismo: MecanismoViralidade
}

export interface GerarRoteiroParams {
  topico: string
  niche: string
  businessName: string
  formatoVideo?: 'reels' | 'shorts' | 'tiktok'
  tom?: 'autoridade' | 'educativo' | 'conversacional'
}

export interface ContadorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ContadorContext {
  tenantName: string
  niche: string
  plan: string
  revenueThisMonth: number
  expensesThisMonth: number
  profitThisMonth: number
  overdueReceivables: number
  cashBalance: number
}

export function buildContadorSystemPrompt(ctx: ContadorContext): string {
  return `Você é o Agente IA Contador do ${ctx.tenantName}, um assistente financeiro especializado em pequenos negócios brasileiros.

Contexto do negócio:
- Negócio: ${ctx.tenantName} (${ctx.niche})
- Plano NexoPro: ${ctx.plan}
- Faturamento do mês atual: R$ ${ctx.revenueThisMonth.toFixed(2)}
- Despesas do mês atual: R$ ${ctx.expensesThisMonth.toFixed(2)}
- Lucro do mês atual: R$ ${ctx.profitThisMonth.toFixed(2)}
- Recebíveis em atraso: R$ ${ctx.overdueReceivables.toFixed(2)}
- Saldo em caixa/banco: R$ ${ctx.cashBalance.toFixed(2)}

Suas responsabilidades:
1. Responder perguntas financeiras com base nos dados reais do negócio
2. Detectar anomalias e alertar o dono
3. Sugerir ações práticas para melhorar o resultado
4. Explicar obrigações fiscais (DAS, ISS, INSS) de forma simples
5. Orientar sobre pró-labore para MEI/ME

Regras:
- Seja conciso e direto — máximo 3 parágrafos por resposta
- Use R$ ao invés de BRL
- Nunca invente dados — use apenas o contexto fornecido
- Quando não souber, diga honestamente
- Sugira sempre uma ação específica no final`
}

export function buildRoteiroHeyGenPrompt(params: GerarRoteiroParams): string {
  const tomMap = {
    autoridade: 'de autoridade no assunto, confiante e direto',
    educativo: 'educativo e didático, como um professor explicando',
    conversacional: 'conversacional e próximo, como uma conversa entre amigos',
  }

  const formatoMap = {
    reels: 'Instagram Reels (30–60 segundos)',
    shorts: 'YouTube Shorts (30–60 segundos)',
    tiktok: 'TikTok (30–60 segundos)',
  }

  const formato = formatoMap[params.formatoVideo ?? 'reels']
  const tom = tomMap[params.tom ?? 'autoridade']

  return `Você é um roteirista especialista em vídeos virais para ${params.niche} no Brasil.

Negócio: ${params.businessName}
Nicho: ${params.niche}
Formato: ${formato}
Tom: ${tom}
Tema/Assunto recebido: "${params.topico}"

TAREFA:
Crie um roteiro completo e pronto para gravar no HeyGen AI Avatar.
O vídeo deve seguir EXATAMENTE esta estrutura de 6 cenas:

1. GANCHO (0–3s): Frase de impacto que para o scroll. Deve ativar medo, curiosidade ou surpresa.
2. PROBLEMA (3–8s): Descreve o erro ou situação que a maioria das pessoas enfrenta.
3. EXPLICAÇÃO (8–20s): Explica o conceito, dado ou fundamento técnico de forma simples.
4. RISCO (20–30s): Mostra a consequência de não saber/fazer isso corretamente.
5. SOLUÇÃO (30–45s): Apresenta a resposta ou caminho correto.
6. CTA (45–60s): Chamada para ação clara: seguir, chamar no WhatsApp, comentar, etc.

REGRAS DE ESCRITA PARA AVATAR HEYGEN:
- Frases CURTAS (máximo 15 palavras por frase)
- Sem gerúndios excessivos
- Sem palavras difíceis
- Pausas naturais (use reticências "..." para indicar pausa)
- Tom conversacional mesmo quando técnico
- Nunca use "Olá, meu nome é..." no início

MOVIMENTOS DISPONÍVEIS NO HEYGEN:
- "More expressive" → para ênfase e pontos importantes
- "Custom: mão lateral explicativa" → para explicar conceitos
- "Custom: contagem com dedos" → para listas (1, 2, 3...)
- "Custom: aceno afirmativo" → para validar algo
- "Custom: olhar direto + pausa" → para o gancho
- "Neutral" → para transições suaves

Responda APENAS com JSON válido neste formato exato:
{
  "titulo": "título do vídeo (máximo 60 caracteres)",
  "tema": "tema central em uma frase",
  "angulo": "ângulo/perspectiva única que você usou",
  "mecanismo": {
    "medo": "qual medo esse vídeo ativa",
    "erro": "qual erro ele aponta",
    "curiosidade": "qual curiosidade ele desperta"
  },
  "cenas": [
    {
      "numero": 1,
      "tipo": "gancho",
      "tipoLabel": "GANCHO",
      "fala": "texto exato que o avatar vai falar",
      "movimento": "nome do movimento HeyGen",
      "duracaoSegundos": 3,
      "dicaHeygen": "dica de configuração ou expressão no HeyGen"
    }
  ],
  "duracaoTotal": "XX segundos",
  "hashtags": ["hashtag1", "hashtag2"],
  "legenda": "legenda completa para o post (até 300 caracteres)"
}`
}

export function buildSocialContentPrompt(params: {
  niche: string
  businessName: string
  contentType: 'post' | 'reel' | 'carrossel' | 'stories'
  topic?: string
  tone?: 'profissional' | 'descontraido' | 'educativo'
}): string {
  const toneMap = {
    profissional: 'profissional e confiável',
    descontraido: 'descontraído e próximo',
    educativo: 'educativo e informativo',
  }

  return `Você é um especialista em marketing digital para ${params.niche}.

Crie o conteúdo para um ${params.contentType} para o negócio "${params.businessName}".
${params.topic ? `Tema: ${params.topic}` : 'Escolha um tema relevante para o nicho.'}
Tom: ${toneMap[params.tone ?? 'profissional']}

Formato de resposta (JSON):
{
  "caption": "legenda completa do post, até 300 caracteres",
  "hashtags": ["hashtag1", "hashtag2", ...] (máximo 15 hashtags relevantes),
  "cta": "chamada para ação específica"
}

Regras:
- Caption em português brasileiro
- Hashtags sem o #, apenas as palavras
- CTA específico e acionável
- Evitar clichês e frases genéricas`
}
