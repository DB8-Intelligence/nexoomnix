/**
 * Content AI Personas — Perfis de Criação de Conteúdo Pré-Treinados
 *
 * Cada persona representa uma estratégia de conteúdo provada no Instagram,
 * inspirada em perfis virais reais analisados em Março 2026.
 *
 * O cliente escolhe uma persona na configuração do perfil.
 * A persona define: estilo visual padrão, tom de voz, formato de roteiro,
 * tipo de objetos, sugestão de bio, CTAs e hashtags.
 *
 * Referências:
 *  - @dinheirofalante (795K, 3M views) → persona 'financeiro'
 *  - @objetosdodia (482K, 1.7M views)  → persona 'nutricao'
 *  - @coisadecasa.ia (33.8K, 2M views) → persona 'casa'
 *  - mundoiaa_ (9.7K views avg)        → persona 'tecnico'
 *  - @objetos_falando (3.8K avg)        → persona 'humor'
 */

import type { CharacterStyle, CharacterExpression } from './reel-references/reference-styles'

export type PersonaId =
  | 'financeiro'
  | 'nutricao'
  | 'casa'
  | 'humor'
  | 'tecnico'
  | 'saude'
  | 'beleza'
  | 'juridico'
  | 'educacao'
  | 'pet'
  | 'personalizado'

export interface ContentPersona {
  id: PersonaId
  name: string
  tagline: string
  emoji: string
  referenceProfile?: string
  referenceFollowers?: number
  referenceMaxViews?: number
  defaultStyle: CharacterStyle
  defaultExpression: CharacterExpression
  contentTone: 'educativo' | 'antagonista' | 'humoristico' | 'autoritativo' | 'inspirador'
  scriptFormula: string              // Template de roteiro em português
  objectTypes: string[]              // Tipos de objetos que funcionam neste nicho
  environments: string[]             // Ambientes visuais ideais
  bioTemplate: string                // Sugestão de bio para Instagram
  ctaOptions: string[]               // 3 opções de CTA padrão
  hashtagStrategy: {
    primary: string[]                // 5 hashtags principais (>1M)
    secondary: string[]              // 5 hashtags médias (100K-1M)
    niche: string[]                  // 5 hashtags de nicho (<100K)
  }
  contentPillars: string[]           // 4-5 temas de conteúdo recorrentes
  captionHooks: string[]             // 3 ganchos de legenda comprovados
}

export const CONTENT_PERSONAS: Record<PersonaId, ContentPersona> = {

  financeiro: {
    id: 'financeiro',
    name: 'Finanças & Consumo',
    tagline: 'Educação financeira através de objetos como vilões do dia a dia',
    emoji: '💸',
    referenceProfile: '@dinheirofalante',
    referenceFollowers: 795000,
    referenceMaxViews: 3000000,
    defaultStyle: 'pixar-antagonista',
    defaultExpression: 'raiva',
    contentTone: 'antagonista',
    scriptFormula: 'Você sabe por que [OBJETO] está furioso? → Porque [DOR DO CONSUMIDOR]. → Mas você pode [SOLUÇÃO SIMPLES]. → Salva esse post antes que [OBJETO] te encontre!',
    objectTypes: [
      'Notas de R$50, R$100, R$200',
      'Cartões de crédito (Nubank, Bradesco, Inter)',
      'Conta de luz, água, gás',
      'Bomba de gasolina',
      'Boleto bancário',
      'Porquinho cofrinho',
      'Carrinho de supermercado',
      'Carteira de Trabalho (CLT)',
    ],
    environments: [
      'Supermercado real com etiquetas de preço visíveis',
      'Posto de gasolina BR com placa de preços',
      'Agência bancária com fila real',
      'Interior de carro em via pública',
      'Mesa com pilha de contas/boletos',
    ],
    bioTemplate: '💸 [OBJETO] te ensina a economizar\n📉 Dicas financeiras que o banco não quer que você saiba\n💡 Salva os posts • Muda sua vida\n👇 Acesse [LINK]',
    ctaOptions: [
      'Salva esse post antes que sua conta bancária te odeia mais ainda 💸',
      'Comenta "EU" se isso acontece com você todo mês 👇',
      'Segue pra não cair nessa armadilha financeira nunca mais 🔔',
    ],
    hashtagStrategy: {
      primary: ['#financaspessoais', '#economizar', '#educacaofinanceira', '#dinheiro', '#investimentos'],
      secondary: ['#vidafinanceira', '#controle financeiro', '#dicasfinanceiras', '#liberdadefinanceira', '#sair das dividas'],
      niche: ['#economiadomes tica', '#cortandogastos', '#reservadeemergencia', '#orcamentofamiliar', '#dicasdinheiro'],
    },
    contentPillars: [
      'Gastos invisíveis que destroem o orçamento',
      'Comparações de preço (antes vs agora)',
      'Hábitos que custam caro sem perceber',
      'Dicas simples de economia doméstica',
      'Erros financeiros comuns (humor + educação)',
    ],
    captionHooks: [
      'Esse [OBJETO] está furioso com você e eu entendo o motivo 😡',
      'Quanto do seu salário vai direto pro bolso de [VILÃO]? 💸',
      'Ninguém te contou isso sobre [GASTO] mas eu vou contar 👀',
    ],
  },

  nutricao: {
    id: 'nutricao',
    name: 'Nutrição & Saúde',
    tagline: 'Alimentos como especialistas que ensinam receitas e benefícios',
    emoji: '🥑',
    referenceProfile: '@objetosdodia',
    referenceFollowers: 482000,
    referenceMaxViews: 1700000,
    defaultStyle: 'pixar-acao',
    defaultExpression: 'determinado',
    contentTone: 'autoritativo',
    scriptFormula: 'Oi! Eu sou o [ALIMENTO] e tenho um segredo que vai [BENEFÍCIO]. → [3 passos simples da receita/dica]. → Experimenta hoje e me conta o resultado!',
    objectTypes: [
      'Frutas (limão, abacate, abacaxi, maçã)',
      'Vegetais (brócolis, cenoura, gengibre)',
      'Sementes (chia, linhaça, quinoa)',
      'Especiarias (canela, cúrcuma, pimenta)',
      'Suplementos e vitaminas',
      'Ingredientes de receitas fit',
    ],
    environments: [
      'Cozinha moderna com bancada de mármore',
      'Consultório de nutrição clínico',
      'Academia com equipamentos',
      'Mesa de preparo com ingredientes naturais',
      'Jardim ou horta com luz natural',
    ],
    bioTemplate: '🥑 [ALIMENTO/TEMA] te ensina a se alimentar melhor\n💪 Receitas saudáveis em menos de 30 segundos\n🏥 Nutrição que funciona de verdade\n📲 Acesse [LINK] para o cardápio completo',
    ctaOptions: [
      'Salva essa receita pra usar ainda hoje! 🥑',
      'Comenta "QUERO" que mando a receita completa no direct 📩',
      'Segue pra mais dicas de saúde que realmente funcionam 🔔',
    ],
    hashtagStrategy: {
      primary: ['#receitassaudaveis', '#alimentacaosaudavel', '#emagrecimento', '#saude', '#fitness'],
      secondary: ['#dieta', '#receitas fit', '#vidasaudavel', '#detox', '#lowcarb'],
      niche: ['#receitasfit', '#alimentacaofuncional', '#saudeandbem-estar', '#nutricaosportiva', '#comidasaudavel'],
    },
    contentPillars: [
      'Receitas rápidas com um ingrediente especial',
      'Benefícios surpreendentes de alimentos comuns',
      'Combinações de alimentos que potencializam resultados',
      'Dicas para desinchar, emagrecer, ter mais energia',
      'Mitos vs verdades sobre alimentação',
    ],
    captionHooks: [
      'Esse [ALIMENTO] tem um segredo que ninguém te contou 🤫',
      'A receita que vai te desinchar em [TEMPO CURTO] ⏱️',
      'Se você tem [ALIMENTO] em casa, você tem a solução para [DOR] 💡',
    ],
  },

  casa: {
    id: 'casa',
    name: 'Casa & Dicas Domésticas',
    tagline: 'Objetos domésticos que ensinam dicas rápidas ao lado de pessoas reais',
    emoji: '🏠',
    referenceProfile: '@coisadecasa.ia',
    referenceFollowers: 33800,
    referenceMaxViews: 2000000,
    defaultStyle: 'pixar-humano',
    defaultExpression: 'alegre',
    contentTone: 'educativo',
    scriptFormula: 'Oi! Eu sou o [PRODUTO/OBJETO] e hoje vou te mostrar um truque que vai [BENEFÍCIO NA CASA]. → [Dica rápida em 3 passos]. → Experimenta e me conta!',
    objectTypes: [
      'Produtos de limpeza (água sanitária, desinfetante, vinagre)',
      'Utensílios de cozinha (liquidificador, forno, geladeira)',
      'Alimentos cotidianos (batata, cebola, limão)',
      'Itens de higiene (xampu, escova de dentes)',
      'Itens domésticos (espiral antimosquito, pano de prato)',
      'Eletrônicos domésticos (roteador, carregador)',
    ],
    environments: [
      'Cozinha doméstica calorosa com família presente',
      'Banheiro limpo com pessoa ao fundo',
      'Sala de estar aconchegante com crianças',
      'Mesa da cozinha com café da manhã',
      'Área de limpeza da casa',
    ],
    bioTemplate: '🏠 Dicas rápidas para sua casa e saúde\n⚡ Truques que facilitam o seu dia a dia\n🧹 Limpeza • Organização • Economia\n📲 Siga também: [OUTRAS REDES]',
    ctaOptions: [
      'Salva essa dica antes de esquecer! 📌',
      'Marca quem precisa saber disso 👇',
      'Já conhecia esse truque? Comenta abaixo! 💬',
    ],
    hashtagStrategy: {
      primary: ['#dicasdelimpeza', '#organizacaocasa', '#truquesdomesticos', '#dicasdecasa', '#limpezacasa'],
      secondary: ['#casaorganizada', '#trucosdelimpeza', '#economiadomestica', '#vidalimpa', '#cozinha'],
      niche: ['#dicasrapidas', '#coisasdelar', '#casaeficiente', '#trucosdecozinha', '#limpezafacil'],
    },
    contentPillars: [
      'Truques de limpeza com produtos naturais/baratos',
      'Organização de ambientes da casa',
      'Receitas domésticas (comida cotidiana, chás)',
      'Produtos que funcionam vs que não funcionam',
      'Curiosidades sobre objetos do dia a dia',
    ],
    captionHooks: [
      'Esse [PRODUTO] tá cansado de ser mal usado e vai te mostrar como ✅',
      'Truque de [OBJETO] que sua mãe não te ensinou 🏠',
      'Com isso aqui você resolve [PROBLEMA] em 5 minutos ⚡',
    ],
  },

  humor: {
    id: 'humor',
    name: 'Humor & Cotidiano',
    tagline: 'Objetos do dia a dia expressando frustração cômica com situações cotidianas',
    emoji: '😂',
    referenceProfile: '@objetos_falando',
    referenceFollowers: 0,
    referenceMaxViews: 3801,
    defaultStyle: 'fotorrealista',
    defaultExpression: 'irritado',
    contentTone: 'humoristico',
    scriptFormula: '[OBJETO] simplesmente não aguenta mais [SITUAÇÃO CÔMICA DO DIA A DIA]. → E ele tem um recado importante pra você... → [REVIRAVOLTA ENGRAÇADA + MORAL]',
    objectTypes: [
      'Eletrodomésticos frustrados (aspirador, máquina de lavar)',
      'Itens do quarto (edredom, travesseiro)',
      'Objetos do banheiro',
      'Comida reclamando do preparo',
      'Objetos de trabalho/escritório',
      'Veículos (carro, moto)',
    ],
    environments: [
      'Quarto bagunçado com roupas no chão',
      'Cozinha suja com louça acumulada',
      'Banheiro desorganizado',
      'Escritório/home office caótico',
      'Rua real com movimento',
    ],
    bioTemplate: '😂 Quando os objetos da sua casa cansam de você\n🎭 Humor que todo mundo entende\n❤️ Siga • Salva • Compartilha\n📲 TikTok: [LINK]',
    ctaOptions: [
      'Marca aquele amigo que faz isso com os objetos 😂',
      'Comenta "EU" se seu [OBJETO] poderia fazer isso 👇',
      'Compartilha pra quem precisa ouvir essa mensagem 🔁',
    ],
    hashtagStrategy: {
      primary: ['#humor', '#engraçado', '#comedia', '#memes', '#risos'],
      secondary: ['#objetosfalantes', '#vidacotidiana', '#situacoes', '#humorbrasileiro', '#risos'],
      niche: ['#objetosdacasa', '#momentoscomicos', '#cotidiano', '#humordiario', '#objetosanimados'],
    },
    contentPillars: [
      'Objetos reclamando de mal uso',
      'Situações domésticas exageradas/cômicas',
      'Objetos dando "lição de moral" nas pessoas',
      'Comparações "antes e depois" humorísticas',
      'Reações exageradas a situações cotidianas',
    ],
    captionHooks: [
      'Esse [OBJETO] não aguenta mais e eu entendo o motivo 😤',
      'O [OBJETO] finalmente falou o que todo mundo pensa 🗣️',
      'Quando o [OBJETO] resolve se vingar do dono 💀',
    ],
  },

  tecnico: {
    id: 'tecnico',
    name: 'Serviços Técnicos',
    tagline: 'Ferramentas e equipamentos como especialistas musculosos em ação',
    emoji: '🔧',
    defaultStyle: 'miniatura-acao',
    defaultExpression: 'determinado',
    contentTone: 'autoritativo',
    scriptFormula: 'Esse [FERRAMENTA/EQUIPAMENTO] chegou pra resolver [PROBLEMA TÉCNICO]. → Veja como ele faz em [TEMPO]. → Chama a gente no WhatsApp → [CTA]',
    objectTypes: [
      'Ferramentas (chave de fenda, alicate, furadeira)',
      'Equipamentos elétricos',
      'Componentes eletrônicos',
      'Capacetes e EPI',
      'Aparelhos domésticos em reparo',
    ],
    environments: [
      'Bancada de oficina com ferramentas',
      'Cena de manutenção elétrica/hidráulica',
      'Interior de equipamento sendo reparado',
      'Close em superfície real com ferramentas',
      'Ambiente de workshop profissional',
    ],
    bioTemplate: '🔧 [ESPECIALIDADE] que resolve na hora\n⚡ [SERVIÇO 1] • [SERVIÇO 2] • [SERVIÇO 3]\n📍 Atendemos em [CIDADE]\n📲 WhatsApp: [NÚMERO]',
    ctaOptions: [
      'Chama no WhatsApp pra orçamento sem compromisso 🔧',
      'Salva esse post pra quando precisar de um técnico ✅',
      'Comenta o problema que a gente resolve pra você 💬',
    ],
    hashtagStrategy: {
      primary: ['#manutencao', '#conserto', '#eletricista', '#tecnico', '#reforma'],
      secondary: ['#servicostecnicos', '#manutencaopreditiva', '#instalacoeletrica', '#encanamento', '#ar condicionado'],
      niche: ['#tecnicoautorizado', '#reparosresidenciais', '#manutencaoindustrial', '#servicosgerais', '#assistenciatecnica'],
    },
    contentPillars: [
      'Antes e depois de reparos',
      'Dicas de manutenção preventiva',
      'Erros comuns que causam problemas',
      'Como identificar quando chamar um técnico',
      'Apresentação de serviços realizados',
    ],
    captionHooks: [
      'Esse [EQUIPAMENTO] estava com problema e a solução foi mais simples do que parece 🔧',
      'Você sabia que isso pode causar [PROBLEMA GRAVE]? Evite assim ⚡',
      'A maioria das pessoas ignora esse sinal de [EQUIPAMENTO] — não ignore 🚨',
    ],
  },

  saude: {
    id: 'saude',
    name: 'Saúde & Clínica',
    tagline: 'Objetos médicos como especialistas que educam sobre saúde preventiva',
    emoji: '🩺',
    defaultStyle: 'pixar-acao',
    defaultExpression: 'determinado',
    contentTone: 'autoritativo',
    scriptFormula: 'Oi! Eu sou o [OBJETO MÉDICO] e hoje vou te ensinar algo importante sobre [ÁREA DE SAÚDE]. → [3 dicas preventivas simples]. → Cuide-se! [CTA para agendamento]',
    objectTypes: [
      'Estetoscópio, seringa, termômetro',
      'Medicamentos e vitaminas',
      'Dente, osso, órgãos (estilizados)',
      'Equipamentos médicos',
      'Alimentos funcionais para saúde',
    ],
    environments: [
      'Consultório médico limpo e moderno',
      'Farmácia organizada',
      'Laboratório de exames',
      'Sala de espera de clínica',
      'Ambiente hospitalar',
    ],
    bioTemplate: '🩺 [ESPECIALIDADE] que cuida de você de verdade\n💊 Prevenção • Diagnóstico • Tratamento\n📍 [CIDADE] — [CONVÊNIOS]\n📲 Agende sua consulta: [LINK]',
    ctaOptions: [
      'Agende sua consulta pelo link na bio 🩺',
      'Salva essa dica de saúde preventiva 💊',
      'Dúvidas? Comenta abaixo que respondemos 💬',
    ],
    hashtagStrategy: {
      primary: ['#saude', '#saude mental', '#bemestar', '#medicina', '#prevencao'],
      secondary: ['#dicasdesaude', '#saudeeficiente', '#vidasaudavel', '#autocuidado', '#consultamedica'],
      niche: ['#saudepreventiva', '#medicinaintegrativa', '#doutordicas', '#saudedobrasil', '#clinicamedica'],
    },
    contentPillars: [
      'Dicas de prevenção de doenças comuns',
      'Sintomas que não devem ser ignorados',
      'Desmistificando tratamentos e procedimentos',
      'Saúde sazonal (gripe, calor, etc.)',
      'Apresentação da equipe e estrutura',
    ],
    captionHooks: [
      'Esse sintoma parece simples mas pode ser sinal de [CONDIÇÃO] ⚠️',
      'O que acontece no seu corpo quando você [HÁBITO] todos os dias 🩺',
      'Esse [OBJETO MÉDICO] tem um recado importante para você 💊',
    ],
  },

  beleza: {
    id: 'beleza',
    name: 'Beleza & Estética',
    tagline: 'Ferramentas e produtos de beleza como especialistas de glamour',
    emoji: '✂️',
    defaultStyle: 'fotorrealista',
    defaultExpression: 'alegre',
    contentTone: 'inspirador',
    scriptFormula: 'Oi linda! Eu sou a [FERRAMENTA/PRODUTO] e hoje vou te mostrar como [RESULTADO DE BELEZA] em [TEMPO RÁPIDO]. → [Passo a passo visual]. → Vem pro salão te transformar!',
    objectTypes: [
      'Tesoura de corte profissional',
      'Esmaltes e nail art',
      'Produtos capilares',
      'Secador, chapinha, prancha',
      'Maquiagem e cosméticos',
    ],
    environments: [
      'Salão de beleza profissional',
      'Mesa de manicure com produtos',
      'Espelho iluminado do camarim',
      'Estação de trabalho de barbeiro',
      'Close em cabelos/unhas em processo',
    ],
    bioTemplate: '✂️ [SERVIÇO PRINCIPAL] que transforma\n💅 [ESPECIALIDADE 1] • [ESPECIALIDADE 2] • [ESPECIALIDADE 3]\n📍 [CIDADE/BAIRRO]\n📲 Agende: [LINK/WHATSAPP]',
    ctaOptions: [
      'Clica no link da bio e agenda o seu horário 💅',
      'Salva pra mostrar pro seu [PROFISSIONAL] 📌',
      'Marca uma amiga que precisa de uma transformação 👯',
    ],
    hashtagStrategy: {
      primary: ['#salaobeleza', '#cabelo', '#manicure', '#makeup', '#beleza'],
      secondary: ['#cabeleireiro', '#unhas', '#dicasbeleza', '#tratamentocapilar', '#barbearia'],
      niche: ['#salaodabeleza', '#unhasdecoradas', '#transformacaocapilar', '#lookdodia', '#beautytips'],
    },
    contentPillars: [
      'Antes e depois de transformações',
      'Tendências de beleza da temporada',
      'Tutoriais rápidos de técnicas',
      'Cuidados entre visitas ao salão',
      'Apresentação de produtos e serviços',
    ],
    captionHooks: [
      'Essa [FERRAMENTA] tem o poder de te transformar e eu vou te mostrar como ✂️',
      'O segredo por trás de [RESULTADO] que todo mundo quer 💇',
      'Só [X] minutos pra sair completamente diferente 💫',
    ],
  },

  juridico: {
    id: 'juridico',
    name: 'Advocacia & Jurídico',
    tagline: 'Instrumentos jurídicos que educam sobre direitos e deveres',
    emoji: '⚖️',
    defaultStyle: 'pixar-antagonista',
    defaultExpression: 'determinado',
    contentTone: 'autoritativo',
    scriptFormula: 'Você sabia que [SITUAÇÃO JURÍDICA COMUM] pode custar [CONSEQUÊNCIA]? → Isso acontece porque [CAUSA LEGAL]. → Proteja-se assim: [SOLUÇÃO/DIREITO]. → Fala comigo antes que seja tarde.',
    objectTypes: [
      'Martelo de juiz (gavel)',
      'Livro de leis / código civil',
      'Balança da justiça',
      'Contrato e documentos',
      'Carteira de trabalho (CTPS)',
      'Processo judicial',
    ],
    environments: [
      'Tribunal com cadeiras e bancada do juiz',
      'Escritório de advocacia formal',
      'Mesa com documentos e processo',
      'Fórum ou prédio jurídico real',
      'Sala de reunião formal',
    ],
    bioTemplate: '⚖️ Defendo seus direitos com determinação\n📋 [ESPECIALIDADE] • [ÁREA DE ATUAÇÃO]\n🏛️ OAB: [NÚMERO]\n📲 Consulta gratuita: [WHATSAPP]',
    ctaOptions: [
      'Me chama no WhatsApp para uma consulta gratuita ⚖️',
      'Salva esse post — você pode precisar disso amanhã 📌',
      'Comenta a sua situação que oriento você 💬',
    ],
    hashtagStrategy: {
      primary: ['#direito', '#advocacia', '#advogado', '#justiça', '#leis'],
      secondary: ['#direitoseusdireitos', '#advogadobrasileiro', '#consultajuridica', '#direitotrabalhista', '#direitoconsumidor'],
      niche: ['#advogadodigital', '#direitosfundamentais', '#oab', '#juridico', '#legaltips'],
    },
    contentPillars: [
      'Direitos do consumidor que poucos conhecem',
      'Situações trabalhistas comuns e como resolver',
      'Alertas sobre golpes e fraudes jurídicas',
      'Desmistificando processos jurídicos',
      'Cases de sucesso (sem identificar clientes)',
    ],
    captionHooks: [
      'Você está perdendo [DIREITO] sem saber e eu preciso te contar ⚖️',
      'Seu [EMPREGADOR/VENDEDOR/PRESTADOR] deve isso a você por lei 📋',
      'Isso parece normal mas é ILEGAL e você pode processar 🔴',
    ],
  },

  educacao: {
    id: 'educacao',
    name: 'Educação & Cursos',
    tagline: 'Livros e materiais didáticos que motivam e ensinam de forma animada',
    emoji: '📚',
    defaultStyle: 'pixar-3d',
    defaultExpression: 'alegre',
    contentTone: 'inspirador',
    scriptFormula: 'Oi, estudante! Eu sou o [LIVRO/MATERIAL] de [DISCIPLINA] e hoje vou te ensinar [CONCEITO] de um jeito que você nunca esquece. → [Explicação divertida em 3 passos]. → Vem estudar com a gente!',
    objectTypes: [
      'Livro didático com face expressiva',
      'Lápis e caneta animados',
      'Calculadora personagem',
      'Globo terrestre animado',
      'Diploma e certificado',
    ],
    environments: [
      'Sala de aula moderna',
      'Biblioteca com livros coloridos',
      'Mesa de estudo com materiais',
      'Quadro branco com fórmulas',
      'Ambiente de curso online/home',
    ],
    bioTemplate: '📚 Aprender ficou mais fácil e divertido\n✏️ [DISCIPLINAS/CURSOS] para [PÚBLICO]\n🎓 [X] alunos aprovados\n📲 Primeira aula grátis: [LINK]',
    ctaOptions: [
      'Clica no link e começa sua primeira aula grátis hoje 📚',
      'Salva essa dica de estudo pra usar na prova 📌',
      'Comenta a matéria que mais tem dificuldade 💬',
    ],
    hashtagStrategy: {
      primary: ['#educacao', '#estudos', '#concurso', '#vestibular', '#aprendizagem'],
      secondary: ['#cursoonline', '#dicasdeestudo', '#aprovado', '#enem', '#resumos'],
      niche: ['#estudandoemcasa', '#meteuestudo', '#preparacaoenem', '#escoladigital', '#cursoprofissionalizante'],
    },
    contentPillars: [
      'Dicas de técnicas de estudo comprovadas',
      'Resumos de conteúdos mais cobrados',
      'Motivação e rotina de estudos',
      'Simulados e questões comentadas',
      'Histórias de aprovação de alunos',
    ],
    captionHooks: [
      'Esse [CONCEITO] sempre cai na prova e muita gente erra por isso 📚',
      'A técnica de estudo que fez [X] alunos passarem em [PROVA] ✏️',
      'Estudar [X] minutos assim vale mais do que [Y] horas do jeito errado ⏱️',
    ],
  },

  pet: {
    id: 'pet',
    name: 'Pet Shop & Veterinária',
    tagline: 'Produtos pet e animais animados que ensinam cuidados com amor',
    emoji: '🐾',
    defaultStyle: 'pixar-3d',
    defaultExpression: 'alegre',
    contentTone: 'educativo',
    scriptFormula: 'Oi tutor! Eu sou a [RAÇÃO/PRODUTO PET] e vou te contar o que o seu [ANIMAL] precisa para ser muito feliz e saudável. → [3 dicas de cuidado]. → Vem me buscar na loja/clínica!',
    objectTypes: [
      'Ração e petiscos animados',
      'Brinquedos pet com face expressiva',
      'Medicamentos veterinários',
      'Acessórios (coleira, cama, arranhador)',
      'Animais estilizados Pixar',
    ],
    environments: [
      'Pet shop colorido e organizado',
      'Clínica veterinária',
      'Parque ao ar livre com pets',
      'Sala de casa com animal de estimação',
      'Banho e tosa em andamento',
    ],
    bioTemplate: '🐾 Cuidando do seu pet com amor e ciência\n🏥 [SERVIÇOS: banho/tosa/veterinário]\n📍 [CIDADE]\n📲 Agende: [WHATSAPP]',
    ctaOptions: [
      'Agenda o banho do seu pet pelo link na bio 🐾',
      'Salva essa dica de saúde do pet pra compartilhar com outros tutores 📌',
      'Comenta o nome do seu pet 🐶🐱',
    ],
    hashtagStrategy: {
      primary: ['#petshop', '#caes', '#gatos', '#pet', '#veterinario'],
      secondary: ['#cachorros', '#petlovers', '#saude pet', '#cuidadospet', '#bichinhos'],
      niche: ['#petshopbrasil', '#veterinariabrasil', '#dicaspet', '#tutordepet', '#peludo'],
    },
    contentPillars: [
      'Dicas de saúde preventiva pet',
      'Alimentação saudável para animais',
      'Comportamento animal explicado',
      'Apresentação de serviços e pacotes',
      'Adoção responsável e conscientização',
    ],
    captionHooks: [
      'Seu [ANIMAL] está tentando te dizer algo com esse comportamento 🐾',
      'Você sabia que [ALIMENTO COMUM] pode ser perigoso pro seu pet? ⚠️',
      'O que acontece se você [HÁBITO] com seu pet todos os dias 💕',
    ],
  },

  personalizado: {
    id: 'personalizado',
    name: 'Personalizado',
    tagline: 'Defina seu próprio estilo e estratégia de conteúdo',
    emoji: '⚙️',
    defaultStyle: 'pixar-acao',
    defaultExpression: 'determinado',
    contentTone: 'educativo',
    scriptFormula: '[OBJETO] apresenta [TEMA DO NEGÓCIO] e convida o espectador para [AÇÃO DESEJADA].',
    objectTypes: ['Definido pelo cliente'],
    environments: ['Definido pelo cliente'],
    bioTemplate: '[PERSONALIZADO PELO CLIENTE]',
    ctaOptions: [
      'Personalize seu CTA principal aqui',
      'Personalize seu CTA de engajamento aqui',
      'Personalize seu CTA de conversão aqui',
    ],
    hashtagStrategy: {
      primary: [],
      secondary: [],
      niche: [],
    },
    contentPillars: ['Definidos pelo cliente'],
    captionHooks: ['Definidos pelo cliente'],
  },
}

/**
 * Returns the best persona for a given niche slug
 */
export function getPersonaForNiche(niche: string): ContentPersona {
  const nichePersonaMap: Record<string, PersonaId> = {
    financeiro:  'financeiro',
    nutricao:    'nutricao',
    saude:       'saude',
    casa:        'casa',
    beleza:      'beleza',
    tecnico:     'tecnico',
    juridico:    'juridico',
    educacao:    'educacao',
    pet:         'pet',
    engenharia:  'tecnico',
    fotografia:  'personalizado',
  }
  const personaId = nichePersonaMap[niche] ?? 'personalizado'
  return CONTENT_PERSONAS[personaId]
}

/**
 * Generate a bio suggestion for a business based on the selected persona
 */
export function generateBioSuggestion(params: {
  personaId: PersonaId
  businessName: string
  specialty?: string
  city?: string
  phone?: string
  linkUrl?: string
}): string {
  const persona = CONTENT_PERSONAS[params.personaId]
  return persona.bioTemplate
    .replace('[NOME]', params.businessName)
    .replace('[ESPECIALIDADE]', params.specialty ?? 'Especialista na área')
    .replace('[CIDADE]', params.city ?? 'Brasil')
    .replace('[NÚMERO]', params.phone ?? '')
    .replace('[LINK]', params.linkUrl ?? 'link na bio')
    .replace('[WHATSAPP]', params.phone ?? 'link na bio')
}

/**
 * Returns the list of personas suitable for a profile creation wizard
 * Ordered by average viral potential
 */
export const PERSONA_OPTIONS = Object.values(CONTENT_PERSONAS)
  .filter(p => p.id !== 'personalizado')
  .sort((a, b) => (b.referenceMaxViews ?? 0) - (a.referenceMaxViews ?? 0))
