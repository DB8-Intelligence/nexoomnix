// ============================================================
// NexoOmnix — TypeScript Types
// Auto-sincronizados com o schema Supabase
// Rodar: npx supabase gen types typescript --local > src/types/database.ts
// ============================================================

export type NicheType =
  | 'beleza'
  | 'tecnico'
  | 'saude'
  | 'juridico'
  | 'imoveis'
  | 'pet'
  | 'educacao'
  | 'nutricao'
  | 'engenharia'
  | 'fotografia'
  | 'gastronomia'
  | 'fitness'
  | 'financas'

export type PlanType = 'trial' | 'starter' | 'pro' | 'pro_plus' | 'pro_max' | 'enterprise'

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'falta'

export type TransactionType = 'receita' | 'despesa' | 'transferencia'

export type TransactionStatus = 'pendente' | 'pago' | 'cancelado' | 'vencido'

export type DocumentStatus = 'rascunho' | 'enviado' | 'assinado' | 'cancelado'

export type NotificationType = 'agendamento' | 'cobranca' | 'fiscal' | 'sistema' | 'ia'

export type ContaTipo = 'corrente' | 'poupanca' | 'caixa' | 'cartao_credito' | 'outros'

export type CategoriaGrupo =
  | 'receita_servico'
  | 'receita_produto'
  | 'receita_outros'
  | 'despesa_pessoal'
  | 'despesa_fixo'
  | 'despesa_variavel'
  | 'despesa_fiscal'
  | 'despesa_investimento'

export type NfseStatus = 'pendente' | 'emitida' | 'cancelada' | 'erro'

export type ObrigacaoTipo = 'das' | 'iss' | 'inss' | 'irpf' | 'outros'

export type ObrigacaoStatus = 'pendente' | 'pago' | 'vencido' | 'dispensado'

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin'

export type ContentType = 'post' | 'reel' | 'carrossel' | 'stories'

export type ContentStatus = 'rascunho' | 'agendado' | 'publicado' | 'arquivado'

// ============================================================
// CORE TABLES
// ============================================================

export interface Tenant {
  id: string
  name: string
  slug: string
  niche: NicheType
  plan: PlanType
  plan_expires_at: string | null
  cnpj: string | null
  cpf: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address_street: string | null
  address_number: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  logo_url: string | null
  primary_color: string
  is_active: boolean
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  billing_cycle_anchor: string | null
  cancel_at_period_end: boolean
  addon_talking_objects: boolean
  addon_talking_objects_stripe_sub: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'staff'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  id: string
  tenant_id: string
  site_enabled: boolean
  site_title: string | null
  site_description: string | null
  site_hero_image: string | null
  site_cta_text: string
  whatsapp_enabled: boolean
  whatsapp_number: string | null
  notify_new_appointment: boolean
  notify_payment_overdue: boolean
  notify_tax_due: boolean
  theme: string
  regime_tributario: string | null
  cnae: string | null
  inscricao_municipal: string | null
  nfse_provider: string | null
  nfse_token: string | null
  nfse_environment: string
  branding_completed: boolean
  branding_about: string | null
  branding_audience: string | null
  branding_tone: string | null
  branding_differential: string | null
  branding_pain_point: string | null
  branding_colors: string | null
  branding_phrase: string | null
  branding_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface TenantModule {
  id: string
  tenant_id: string
  module_id: string
  is_enabled: boolean
  created_at: string
}

// ============================================================
// OPERATIONAL TABLES
// ============================================================

export interface Client {
  id: string
  tenant_id: string
  full_name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  cpf: string | null
  birth_date: string | null
  gender: string | null
  address_street: string | null
  address_number: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  tags: string[]
  notes: string | null
  source: string | null
  total_spent: number
  last_visit_at: string | null
  visits_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  duration_min: number
  category: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  tenant_id: string
  client_id: string | null
  service_id: string | null
  professional_id: string | null
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  price: number | null
  discount: number
  total: number | null
  payment_method: string | null
  payment_status: string
  notes: string | null
  internal_notes: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  created_at: string
  updated_at: string
  // Joins opcionais
  client?: Client
  service?: Service
  professional?: Profile
}

export interface Document {
  id: string
  tenant_id: string
  client_id: string | null
  title: string
  type: string
  content: string | null
  file_url: string | null
  status: DocumentStatus
  signed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  client?: Client
}

// ============================================================
// FINANCIAL TABLES
// ============================================================

export interface Transaction {
  id: string
  tenant_id: string
  client_id: string | null
  appointment_id: string | null
  type: TransactionType
  description: string
  amount: number
  status: TransactionStatus
  due_date: string | null
  paid_at: string | null
  category_id: string | null
  payment_method: string | null
  competencia_mes: number | null
  competencia_ano: number | null
  conta_bancaria_id: string | null
  nota_fiscal_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joins opcionais
  client?: Client
  category?: CategoriaFinanceira
  conta_bancaria?: ContaBancaria
}

// ============================================================
// ACCOUNTING MODULE (002)
// ============================================================

export interface ContaBancaria {
  id: string
  tenant_id: string
  nome: string
  tipo: ContaTipo
  banco: string | null
  agencia: string | null
  conta: string | null
  saldo_inicial: number
  saldo_atual: number
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CategoriaFinanceira {
  id: string
  tenant_id: string
  nome: string
  grupo: CategoriaGrupo
  cor: string
  is_system: boolean
  is_active: boolean
  created_at: string
}

export interface NotaFiscal {
  id: string
  tenant_id: string
  transaction_id: string | null
  client_id: string | null
  numero: string | null
  serie: string | null
  codigo_verificacao: string | null
  status: NfseStatus
  valor_servico: number
  aliquota_iss: number
  valor_iss: number
  valor_deducoes: number
  valor_liquido: number | null
  descricao_servico: string
  codigo_servico: string | null
  tomador_cpf_cnpj: string | null
  tomador_nome: string | null
  tomador_email: string | null
  provider: string | null
  provider_id: string | null
  provider_response: Record<string, unknown> | null
  xml_url: string | null
  pdf_url: string | null
  emitida_at: string | null
  cancelada_at: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface ObrigacaoFiscal {
  id: string
  tenant_id: string
  tipo: ObrigacaoTipo
  descricao: string
  competencia_mes: number
  competencia_ano: number
  valor_base: number | null
  aliquota: number | null
  valor_calculado: number | null
  valor_pago: number | null
  vencimento: string
  pago_at: string | null
  status: ObrigacaoStatus
  codigo_barras: string | null
  linha_digitavel: string | null
  alerta_7d_at: string | null
  alerta_1d_at: string | null
  created_at: string
  updated_at: string
}

export interface RelatorioContabil {
  id: string
  tenant_id: string
  tipo: 'dre' | 'fluxo_caixa' | 'balancete'
  titulo: string
  periodo_inicio: string
  periodo_fim: string
  dados: Record<string, unknown>
  pdf_url: string | null
  gerado_por_ia: boolean
  ia_insights: string | null
  created_at: string
}

// ============================================================
// SOCIAL MEDIA TABLES
// ============================================================

export interface SocialProfile {
  id: string
  tenant_id: string
  platform: SocialPlatform
  username: string
  display_name: string | null
  profile_url: string | null
  access_token: string | null
  is_connected: boolean
  connected_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface SocialContent {
  id: string
  tenant_id: string
  type: ContentType
  status: ContentStatus
  caption: string | null
  hashtags: string[]
  media_urls: string[]
  platforms: SocialPlatform[]
  scheduled_at: string | null
  published_at: string | null
  generated_by_ai: boolean
  prompt_used: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EditorialCalendar {
  id: string
  tenant_id: string
  content_id: string | null
  scheduled_date: string
  theme: string | null
  notes: string | null
  created_at: string
  content?: SocialContent
}

export interface MediaLibrary {
  id: string
  tenant_id: string
  file_name: string
  file_url: string
  mime_type: string
  file_size: number | null
  width: number | null
  height: number | null
  tags: string[]
  used_in: string[]
  created_at: string
}

// ============================================================
// IMOB MODULE (004)
// ============================================================

export type PropertyStatus =
  | 'new'
  | 'uploading'
  | 'processing'
  | 'caption_ready'
  | 'video_processing'
  | 'ready'
  | 'published'
  | 'error'

export interface Property {
  id: string
  tenant_id: string
  user_id: string | null
  title: string | null
  description: string | null
  price: string | null
  city: string | null
  neighborhood: string | null
  property_type: string | null
  property_standard: string | null
  investment_value: number | null
  built_area_m2: number | null
  highlights: string | null
  cover_url: string | null
  images: string[]
  status: PropertyStatus
  source: string
  db8_agent_id: string | null
  generated_caption: string | null
  generated_video_url: string | null
  generated_post_text: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface PropertyMedia {
  id: string
  property_id: string
  tenant_id: string
  url: string
  type: 'image' | 'video'
  order_index: number
  created_at: string
}

export interface BrandTemplate {
  id: string
  tenant_id: string
  name: string
  config: Record<string, unknown>
  preview_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ContentProjectStatus =
  | 'pending'
  | 'analyzing'
  | 'configuring'
  | 'generating_images'
  | 'generating_voice'
  | 'generating_video'
  | 'ready'
  | 'error'

export interface ContentScene {
  id: number
  description: string
  duration_sec: number
  image_prompt?: string
}

export interface ContentAnalysis {
  title: string
  target_audience: string
  key_messages: string[]
  tone: string
  suggested_format: string
  scenes: ContentScene[]
  hook: string
  cta: string
}

export interface ContentCTA {
  text: string
  type: 'whatsapp' | 'link' | 'phone'
  value: string
}

export interface ContentProject {
  id: string
  tenant_id: string
  user_id: string | null
  title: string | null
  source_url: string | null
  source_description: string | null
  status: ContentProjectStatus
  nicho: string | null
  formato: string | null
  plan_at_creation: string | null
  analysis: ContentAnalysis | null
  generated_scenes: ContentScene[] | null
  generated_images: Array<{ scene_id: number; url: string; prompt: string }> | null
  generated_voice_url: string | null
  generated_video_url: string | null
  generated_post_text: string | null
  generated_caption: string | null
  generated_hashtags: string[]
  generated_ctas: ContentCTA[] | null
  talking_object_options: Array<{ id: string; name: string; emoji: string; prompt: string }> | null
  talking_object_selected: { id: string; name: string; emoji: string } | null
  created_at: string
  updated_at: string
}

// ============================================================
// SYSTEM TABLES
// ============================================================

export interface Notification {
  id: string
  tenant_id: string
  profile_id: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  tenant_id: string
  profile_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

// ============================================================
// HELPER TYPES
// ============================================================

/** DRE calculado para exibição */
export interface DREData {
  periodo: { mes: number; ano: number }
  receitas: {
    servicos: number
    produtos: number
    outros: number
    total: number
  }
  despesas: {
    pessoal: number
    fixo: number
    variavel: number
    fiscal: number
    total: number
  }
  resultado_bruto: number
  resultado_liquido: number
  margem_liquida: number // percentual
}

/** Fluxo de caixa para exibição */
export interface FluxoCaixaData {
  saldo_inicial: number
  entradas: number
  saidas: number
  saldo_final: number
  por_dia: Array<{
    data: string
    entradas: number
    saidas: number
    saldo: number
  }>
}

// ============================================================
// STOCK + COURSES (007)
// ============================================================

export interface Product {
  id: string
  tenant_id: string
  name: string
  sku: string | null
  category: string | null
  description: string | null
  price: number
  cost: number
  stock_quantity: number
  min_quantity: number
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  tenant_id: string
  name: string
  description: string | null
  category: string | null
  instructor: string | null
  price: number
  duration_hours: number | null
  capacity: number | null
  enrolled: number
  starts_at: string | null
  ends_at: string | null
  schedule: string | null
  modality: 'presencial' | 'online' | 'hibrido'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CourseEnrollment {
  id: string
  tenant_id: string
  course_id: string
  client_id: string
  status: 'ativo' | 'concluido' | 'cancelado'
  enrolled_at: string
  client?: Client
  course?: Course
}

// ============================================================
// CRM PIPELINE (013)
// ============================================================

export type CrmType = 'vendas' | 'imobiliario' | 'atendimento'

export type DealPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export type CrmActivityType =
  | 'stage_change'
  | 'note'
  | 'call'
  | 'email_sent'
  | 'whatsapp_sent'
  | 'instagram_dm'
  | 'facebook_msg'
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'transaction_created'
  | 'proposal_sent'
  | 'visit_scheduled'
  | 'visit_done'
  | 'deal_won'
  | 'deal_lost'
  | 'system'

export type CrmChannelType =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'telegram'
  | 'site'
  | 'telefone'
  | 'indicacao'
  | 'google'
  | 'outro'

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface CrmPipeline {
  id: string
  tenant_id: string
  name: string
  crm_type: CrmType
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Joins
  stages?: CrmStage[]
}

export interface CrmStage {
  id: string
  pipeline_id: string
  tenant_id: string
  name: string
  color: string
  position: number
  is_won: boolean
  is_lost: boolean
  auto_days_alert: number | null
  created_at: string
  // Joins
  deals?: CrmDeal[]
}

export interface CrmDeal {
  id: string
  tenant_id: string
  pipeline_id: string
  stage_id: string
  client_id: string | null
  title: string
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  estimated_value: number
  source_channel: CrmChannelType
  source_detail: string | null
  priority: DealPriority
  assigned_to: string | null
  expected_close_at: string | null
  won_at: string | null
  lost_at: string | null
  lost_reason: string | null
  stage_entered_at: string
  // Imobiliário
  property_id: string | null
  interest_type: string | null
  price_min: number | null
  price_max: number | null
  preferred_areas: string[]
  // Atendimento
  next_appointment_id: string | null
  tags: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joins
  client?: Client
  stage?: CrmStage
  assigned?: Profile
  channels?: CrmDealChannel[]
  property?: Property
  next_appointment?: Appointment
}

export interface CrmDealChannel {
  id: string
  deal_id: string
  tenant_id: string
  channel: CrmChannelType
  identifier: string
  display_name: string | null
  is_primary: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface CrmActivity {
  id: string
  deal_id: string
  tenant_id: string
  user_id: string | null
  type: CrmActivityType
  title: string
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
  // Joins
  user?: Profile
}

export interface CrmMessage {
  id: string
  deal_id: string | null
  tenant_id: string
  client_id: string | null
  channel: CrmChannelType
  direction: 'inbound' | 'outbound'
  status: MessageStatus
  content: string
  template_id: string | null
  metadata: Record<string, unknown>
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  created_at: string
  // Joins
  client?: Client
  deal?: CrmDeal
}

export interface CrmMessageTemplate {
  id: string
  tenant_id: string
  name: string
  channel: CrmChannelType
  category: string
  content: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

/** CRM suggested type by niche */
export const CRM_TYPE_BY_NICHE: Record<string, CrmType> = {
  imoveis: 'imobiliario',
  beleza: 'atendimento',
  saude: 'atendimento',
  nutricao: 'atendimento',
  pet: 'atendimento',
  educacao: 'atendimento',
  fitness: 'atendimento',
  juridico: 'atendimento',
  gastronomia: 'atendimento',
  tecnico: 'vendas',
  engenharia: 'vendas',
  fotografia: 'vendas',
  financas: 'vendas',
}

/** Dashboard KPIs */
export interface DashboardKPIs {
  primary: { label: string; value: string | number; trend?: number }
  secondary: { label: string; value: string | number; trend?: number }
  tertiary: { label: string; value: string | number; trend?: number }
  quaternary: { label: string; value: string | number; trend?: number }
}

// Database type para Supabase client
export interface Database {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Tenant> }
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      tenant_settings: { Row: TenantSettings; Insert: Omit<TenantSettings, 'id' | 'created_at' | 'updated_at'>; Update: Partial<TenantSettings> }
      tenant_modules: { Row: TenantModule; Insert: Omit<TenantModule, 'id' | 'created_at'>; Update: Partial<TenantModule> }
      clients: { Row: Client; Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Client> }
      services: { Row: Service; Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Service> }
      appointments: { Row: Appointment; Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Appointment> }
      documents: { Row: Document; Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Document> }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Transaction> }
      contas_bancarias: { Row: ContaBancaria; Insert: Omit<ContaBancaria, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ContaBancaria> }
      categorias_financeiras: { Row: CategoriaFinanceira; Insert: Omit<CategoriaFinanceira, 'id' | 'created_at'>; Update: Partial<CategoriaFinanceira> }
      notas_fiscais: { Row: NotaFiscal; Insert: Omit<NotaFiscal, 'id' | 'created_at' | 'updated_at'>; Update: Partial<NotaFiscal> }
      obrigacoes_fiscais: { Row: ObrigacaoFiscal; Insert: Omit<ObrigacaoFiscal, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ObrigacaoFiscal> }
      relatorios_contabeis: { Row: RelatorioContabil; Insert: Omit<RelatorioContabil, 'id' | 'created_at'>; Update: Partial<RelatorioContabil> }
      social_profiles: { Row: SocialProfile; Insert: Omit<SocialProfile, 'id' | 'created_at' | 'updated_at'>; Update: Partial<SocialProfile> }
      social_content: { Row: SocialContent; Insert: Omit<SocialContent, 'id' | 'created_at' | 'updated_at'>; Update: Partial<SocialContent> }
      editorial_calendar: { Row: EditorialCalendar; Insert: Omit<EditorialCalendar, 'id' | 'created_at'>; Update: Partial<EditorialCalendar> }
      media_library: { Row: MediaLibrary; Insert: Omit<MediaLibrary, 'id' | 'created_at'>; Update: Partial<MediaLibrary> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification> }
      activity_logs: { Row: ActivityLog; Insert: Omit<ActivityLog, 'id' | 'created_at'>; Update: Partial<ActivityLog> }
      crm_pipelines: { Row: CrmPipeline; Insert: Omit<CrmPipeline, 'id' | 'created_at' | 'updated_at'>; Update: Partial<CrmPipeline> }
      crm_stages: { Row: CrmStage; Insert: Omit<CrmStage, 'id' | 'created_at'>; Update: Partial<CrmStage> }
      crm_deals: { Row: CrmDeal; Insert: Omit<CrmDeal, 'id' | 'created_at' | 'updated_at'>; Update: Partial<CrmDeal> }
      crm_deal_channels: { Row: CrmDealChannel; Insert: Omit<CrmDealChannel, 'id' | 'created_at'>; Update: Partial<CrmDealChannel> }
      crm_activities: { Row: CrmActivity; Insert: Omit<CrmActivity, 'id' | 'created_at'>; Update: Partial<CrmActivity> }
      crm_messages: { Row: CrmMessage; Insert: Omit<CrmMessage, 'id' | 'created_at'>; Update: Partial<CrmMessage> }
      crm_message_templates: { Row: CrmMessageTemplate; Insert: Omit<CrmMessageTemplate, 'id' | 'created_at' | 'updated_at'>; Update: Partial<CrmMessageTemplate> }
    }
    Functions: {
      get_tenant_id: { Args: Record<string, never>; Returns: string }
      setup_tenant: {
        Args: {
          p_user_id: string
          p_name: string
          p_slug: string
          p_niche: NicheType
          p_plan: PlanType
          p_full_name: string
          p_email: string
          p_phone?: string
          p_whatsapp?: string
        }
        Returns: string
      }
    }
    Enums: {
      niche_type: NicheType
      plan_type: PlanType
      appointment_status: AppointmentStatus
      transaction_type: TransactionType
      transaction_status: TransactionStatus
    }
  }
}
