export type NicheSlug =
  | 'beleza'
  | 'tecnico'
  | 'saude'
  | 'juridico'
  | 'pet'
  | 'educacao'
  | 'nutricao'
  | 'engenharia'
  | 'fotografia'
  | 'gastronomia'
  | 'fitness'
  | 'financas'

export interface NicheConfig {
  slug: NicheSlug
  /** White-label brand name for this niche SaaS */
  brandName: string
  /** Instagram handle of the satellite profile */
  instagram: string
  /** Facebook page name of the satellite profile */
  facebook: string
  /** Short tagline shown in dashboard */
  tagline: string
  /** Category description for SEO and positioning */
  description: string
  /** Primary CSS color (HSL components for Tailwind var) */
  primaryColor: string
  /** Tailwind color class prefix (e.g. "violet") */
  colorClass: string
  /** Lucide icon name for this niche */
  icon: string
  /** Modules available for this niche */
  modules: NicheModule[]
  /** Terminology overrides — "client" might be "paciente" in saude */
  terms: NicheTerms
  /** Example KPI labels shown in dashboard */
  kpiLabels: KpiLabels
}

export interface NicheModule {
  id: string
  label: string
  icon: string
  available: boolean
  plans: ('starter' | 'pro' | 'pro_plus' | 'pro_max' | 'enterprise')[]
}

export interface NicheTerms {
  client: string       // paciente, cliente, aluno, etc.
  clients: string
  appointment: string  // consulta, atendimento, aula, visita
  appointments: string
  service: string      // serviço, tratamento, aula, procedimento
  services: string
  professional: string // médico, advogado, professor, fotógrafo
}

export interface KpiLabels {
  primary: string    // "Atendimentos hoje"
  secondary: string  // "Novos clientes"
  tertiary: string   // "Faturamento do mês"
  quaternary: string // "Taxa de retorno"
}

export const NICHE_CONFIGS: Record<NicheSlug, NicheConfig> = {
  beleza: {
    slug: 'beleza',
    brandName: 'Salão Pro',
    instagram: '@salaopro.app',
    facebook: 'Salão Pro Gestão',
    tagline: 'Gestão completa para salões e barbearias',
    description: 'Sistema de gestão para salões de beleza, barbearias e estéticas',
    primaryColor: '#ec4899',
    colorClass: 'pink',
    icon: 'Scissors',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'atendimento',
      appointments: 'atendimentos',
      service: 'serviço',
      services: 'serviços',
      professional: 'profissional',
    },
    kpiLabels: {
      primary: 'Atendimentos hoje',
      secondary: 'Novos clientes',
      tertiary: 'Faturamento do mês',
      quaternary: 'Taxa de retorno',
    },
    modules: [
      { id: 'agenda', label: 'Agenda', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'site', label: 'Site Público', icon: 'Globe', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  tecnico: {
    slug: 'tecnico',
    brandName: 'Ordem de Serviço Pro',
    instagram: '@ordemdeservico.pro',
    facebook: 'Ordem de Serviço Pro',
    tagline: 'Gestão de ordens de serviço e assistências técnicas',
    description: 'Sistema para assistências técnicas, manutenção e serviços gerais',
    primaryColor: '#f97316',
    colorClass: 'orange',
    icon: 'Wrench',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'ordem de serviço',
      appointments: 'ordens de serviço',
      service: 'serviço',
      services: 'serviços',
      professional: 'técnico',
    },
    kpiLabels: {
      primary: 'OS abertas hoje',
      secondary: 'OS concluídas',
      tertiary: 'Faturamento do mês',
      quaternary: 'Tempo médio de reparo',
    },
    modules: [
      { id: 'os', label: 'Ordens de Serviço', icon: 'ClipboardList', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'estoque', label: 'Estoque/Peças', icon: 'Package', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  saude: {
    slug: 'saude',
    brandName: 'ClínicaPro',
    instagram: '@clinicapro.gestao',
    facebook: 'ClínicaPro Sistema',
    tagline: 'Gestão para clínicas, consultórios e profissionais de saúde',
    description: 'Prontuário eletrônico, agenda e gestão financeira para saúde',
    primaryColor: '#06b6d4',
    colorClass: 'cyan',
    icon: 'Stethoscope',
    terms: {
      client: 'paciente',
      clients: 'pacientes',
      appointment: 'consulta',
      appointments: 'consultas',
      service: 'procedimento',
      services: 'procedimentos',
      professional: 'médico',
    },
    kpiLabels: {
      primary: 'Consultas hoje',
      secondary: 'Novos pacientes',
      tertiary: 'Faturamento do mês',
      quaternary: 'Taxa de retorno',
    },
    modules: [
      { id: 'agenda', label: 'Agenda Médica', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'pacientes', label: 'Pacientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'prontuario', label: 'Prontuário', icon: 'FileHeart', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  juridico: {
    slug: 'juridico',
    brandName: 'JurídicPro',
    instagram: '@juridicpro.app',
    facebook: 'JurídicPro',
    tagline: 'Gestão para escritórios de advocacia e jurídicos',
    description: 'Controle de processos, clientes e financeiro para advogados',
    primaryColor: '#1d4ed8',
    colorClass: 'blue',
    icon: 'Scale',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'audiência',
      appointments: 'audiências',
      service: 'processo',
      services: 'processos',
      professional: 'advogado',
    },
    kpiLabels: {
      primary: 'Audiências hoje',
      secondary: 'Processos ativos',
      tertiary: 'Honorários do mês',
      quaternary: 'Prazos vencendo',
    },
    modules: [
      { id: 'processos', label: 'Processos', icon: 'FolderOpen', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'agenda', label: 'Agenda/Prazos', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'documentos', label: 'Documentos', icon: 'FileText', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
    ],
  },

  pet: {
    slug: 'pet',
    brandName: 'PetPro',
    instagram: '@petpro.app',
    facebook: 'PetPro Gestão',
    tagline: 'Gestão para petshops, clínicas veterinárias e banho & tosa',
    description: 'Sistema completo para pet shops e clínicas veterinárias',
    primaryColor: '#8b5cf6',
    colorClass: 'violet',
    icon: 'PawPrint',
    terms: {
      client: 'tutor',
      clients: 'tutores',
      appointment: 'agendamento',
      appointments: 'agendamentos',
      service: 'serviço',
      services: 'serviços',
      professional: 'veterinário',
    },
    kpiLabels: {
      primary: 'Atendimentos hoje',
      secondary: 'Novos tutores',
      tertiary: 'Faturamento do mês',
      quaternary: 'Pets cadastrados',
    },
    modules: [
      { id: 'agenda', label: 'Agenda Pet', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Tutores & Pets', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'estoque', label: 'Estoque', icon: 'Package', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  educacao: {
    slug: 'educacao',
    brandName: 'EducaPro',
    instagram: '@educapro.app',
    facebook: 'EducaPro',
    tagline: 'Gestão para escolas, cursos e tutores',
    description: 'Gestão de alunos, turmas, mensalidades e conteúdo',
    primaryColor: '#eab308',
    colorClass: 'yellow',
    icon: 'GraduationCap',
    terms: {
      client: 'aluno',
      clients: 'alunos',
      appointment: 'aula',
      appointments: 'aulas',
      service: 'curso',
      services: 'cursos',
      professional: 'professor',
    },
    kpiLabels: {
      primary: 'Aulas hoje',
      secondary: 'Novos alunos',
      tertiary: 'Mensalidades do mês',
      quaternary: 'Taxa de frequência',
    },
    modules: [
      { id: 'agenda', label: 'Grade de Aulas', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'alunos', label: 'Alunos', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'cursos', label: 'Cursos/Turmas', icon: 'BookOpen', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Mensalidades', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  nutricao: {
    slug: 'nutricao',
    brandName: 'NutriPro',
    instagram: '@nutripro.app',
    facebook: 'NutriPro',
    tagline: 'Gestão para nutricionistas e personal trainers',
    description: 'Anamnese, planos alimentares e agenda para nutricionistas',
    primaryColor: '#22c55e',
    colorClass: 'green',
    icon: 'Apple',
    terms: {
      client: 'paciente',
      clients: 'pacientes',
      appointment: 'consulta',
      appointments: 'consultas',
      service: 'plano',
      services: 'planos',
      professional: 'nutricionista',
    },
    kpiLabels: {
      primary: 'Consultas hoje',
      secondary: 'Novos pacientes',
      tertiary: 'Faturamento do mês',
      quaternary: 'Metas atingidas',
    },
    modules: [
      { id: 'agenda', label: 'Agenda', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'pacientes', label: 'Pacientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'planos', label: 'Planos Alimentares', icon: 'Salad', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  engenharia: {
    slug: 'engenharia',
    brandName: 'EngePro',
    instagram: '@engepro.app',
    facebook: 'EngePro',
    tagline: 'Gestão para engenheiros, arquitetos e construtoras',
    description: 'Controle de obras, orçamentos e clientes para engenharia',
    primaryColor: '#78716c',
    colorClass: 'stone',
    icon: 'HardHat',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'visita técnica',
      appointments: 'visitas técnicas',
      service: 'obra',
      services: 'obras',
      professional: 'engenheiro',
    },
    kpiLabels: {
      primary: 'Obras em andamento',
      secondary: 'Novos contratos',
      tertiary: 'Faturamento do mês',
      quaternary: 'Obras concluídas',
    },
    modules: [
      { id: 'obras', label: 'Obras/Projetos', icon: 'Building2', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'orcamentos', label: 'Orçamentos', icon: 'Calculator', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
    ],
  },

  fotografia: {
    slug: 'fotografia',
    brandName: 'FotoPro',
    instagram: '@fotopro.app',
    facebook: 'FotoPro',
    tagline: 'Gestão para fotógrafos, videomakers e estúdios',
    description: 'Agenda, contratos e galeria de entregas para fotógrafos',
    primaryColor: '#6366f1',
    colorClass: 'indigo',
    icon: 'Camera',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'ensaio',
      appointments: 'ensaios',
      service: 'pacote',
      services: 'pacotes',
      professional: 'fotógrafo',
    },
    kpiLabels: {
      primary: 'Ensaios agendados',
      secondary: 'Novos clientes',
      tertiary: 'Faturamento do mês',
      quaternary: 'Entregas pendentes',
    },
    modules: [
      { id: 'agenda', label: 'Agenda de Ensaios', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'galeria', label: 'Galeria de Entregas', icon: 'Image', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'contratos', label: 'Contratos', icon: 'FileText', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  gastronomia: {
    slug: 'gastronomia',
    brandName: 'GastroPro',
    instagram: '@gastropro.app',
    facebook: 'GastroPro Gestão',
    tagline: 'Gestão para restaurantes, bares, lanchonetes e food trucks',
    description: 'Cardápio digital, reservas, comanda e financeiro para gastronomia',
    primaryColor: '#f59e0b',
    colorClass: 'amber',
    icon: 'UtensilsCrossed',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'reserva',
      appointments: 'reservas',
      service: 'prato',
      services: 'pratos',
      professional: 'chef',
    },
    kpiLabels: {
      primary: 'Pedidos hoje',
      secondary: 'Mesas ocupadas',
      tertiary: 'Faturamento do dia',
      quaternary: 'Ticket médio',
    },
    modules: [
      { id: 'agenda', label: 'Reservas', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'estoque', label: 'Estoque/Insumos', icon: 'Package', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  fitness: {
    slug: 'fitness',
    brandName: 'FitPro',
    instagram: '@fitpro.app',
    facebook: 'FitPro Gestão',
    tagline: 'Gestão para academias, personal trainers e studios fitness',
    description: 'Agenda, planos de treino, mensalidades e evolução para fitness',
    primaryColor: '#ef4444',
    colorClass: 'red',
    icon: 'Dumbbell',
    terms: {
      client: 'aluno',
      clients: 'alunos',
      appointment: 'aula',
      appointments: 'aulas',
      service: 'treino',
      services: 'treinos',
      professional: 'personal',
    },
    kpiLabels: {
      primary: 'Aulas hoje',
      secondary: 'Alunos ativos',
      tertiary: 'Mensalidades do mês',
      quaternary: 'Taxa de frequência',
    },
    modules: [
      { id: 'agenda', label: 'Agenda de Aulas', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'alunos', label: 'Alunos', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'treinos', label: 'Planos de Treino', icon: 'ClipboardList', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Mensalidades', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },

  financas: {
    slug: 'financas',
    brandName: 'ContábilPro',
    instagram: '@contabilpro.app',
    facebook: 'ContábilPro',
    tagline: 'Gestão para contadores, escritórios contábeis e consultores financeiros',
    description: 'Controle de clientes, obrigações fiscais e financeiro para contabilidade',
    primaryColor: '#0ea5e9',
    colorClass: 'sky',
    icon: 'Calculator',
    terms: {
      client: 'cliente',
      clients: 'clientes',
      appointment: 'reunião',
      appointments: 'reuniões',
      service: 'serviço contábil',
      services: 'serviços contábeis',
      professional: 'contador',
    },
    kpiLabels: {
      primary: 'Clientes ativos',
      secondary: 'Obrigações no mês',
      tertiary: 'Honorários do mês',
      quaternary: 'Obrigações vencendo',
    },
    modules: [
      { id: 'clientes', label: 'Clientes', icon: 'Users', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'agenda', label: 'Agenda/Prazos', icon: 'Calendar', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'obrigacoes', label: 'Obrigações Fiscais', icon: 'ClipboardList', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign', available: true, plans: ['starter', 'pro', 'pro_plus', 'enterprise'] },
      { id: 'contabilidade', label: 'Contabilidade', icon: 'BarChart3', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'nfe', label: 'Notas Fiscais', icon: 'FileText', available: true, plans: ['pro_plus', 'enterprise'] },
      { id: 'ia_contador', label: 'IA Contador', icon: 'Bot', available: true, plans: ['enterprise'] },
      { id: 'social', label: 'Redes Sociais IA', icon: 'Share2', available: true, plans: ['pro', 'pro_plus', 'enterprise'] },
    ],
  },
}

export const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 99,
    description: 'Para começar com o essencial',
    features: ['Agenda completa', 'Gestão de clientes', 'Financeiro básico', 'Relatórios simples'],
    highlight: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 199,
    description: 'Para profissionais que querem crescer',
    features: ['Tudo do Starter', 'Documentos e contratos', 'WhatsApp automático', 'Redes sociais IA', 'Site público'],
    highlight: false,
  },
  {
    id: 'pro_plus' as const,
    name: 'Pro Plus',
    price: 399,
    description: 'Com contabilidade operacional',
    features: ['Tudo do Pro', 'DRE automático', 'Fluxo de caixa real', 'Notas fiscais NFS-e', 'DAS/ISS automático', 'Pró-labore MEI'],
    highlight: true,
  },
  {
    id: 'pro_max' as const,
    name: 'PRO MAX',
    price: 499,
    description: 'Com publicação automática no Instagram',
    badge: '🚀 NOVO',
    features: ['Tudo do Pro Plus', 'Instagram Viral Engine IA', 'Auto-post Instagram & Facebook', 'Agendamento de posts', 'Análise de engajamento avançada'],
    highlight: false,
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: 699,
    description: 'Com Contador IA dedicado',
    features: ['Tudo do PRO MAX', 'Agente IA Contador 24h', 'Open Finance', 'Relatório contábil PDF', 'Suporte prioritário'],
    highlight: false,
  },
]

export function getNicheConfig(slug: string): NicheConfig {
  return NICHE_CONFIGS[slug as NicheSlug] ?? NICHE_CONFIGS.beleza
}

export function getNicheModulesForPlan(
  niche: NicheSlug,
  plan: 'starter' | 'pro' | 'pro_plus' | 'pro_max' | 'enterprise'
): NicheModule[] {
  const planOrder = ['starter', 'pro', 'pro_plus', 'pro_max', 'enterprise']
  const planIndex = planOrder.indexOf(plan)

  return NICHE_CONFIGS[niche].modules.filter((module) =>
    module.plans.some((p) => planOrder.indexOf(p) <= planIndex)
  )
}
