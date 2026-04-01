-- ============================================================
-- Migration 013: CRM Pipeline (Kanban) + Messaging
-- Omnix CRM — 3 variantes: vendas, imobiliario, atendimento
-- ============================================================

-- Enum for CRM types
DO $$ BEGIN
  CREATE TYPE crm_type AS ENUM ('vendas', 'imobiliario', 'atendimento');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for deal priority
DO $$ BEGIN
  CREATE TYPE deal_priority AS ENUM ('baixa', 'media', 'alta', 'urgente');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for activity type
DO $$ BEGIN
  CREATE TYPE crm_activity_type AS ENUM (
    'stage_change', 'note', 'call', 'email_sent', 'whatsapp_sent',
    'instagram_dm', 'facebook_msg', 'appointment_created',
    'appointment_confirmed', 'transaction_created', 'proposal_sent',
    'visit_scheduled', 'visit_done', 'deal_won', 'deal_lost', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for channel type
DO $$ BEGIN
  CREATE TYPE crm_channel_type AS ENUM (
    'whatsapp', 'instagram', 'facebook', 'telegram',
    'site', 'telefone', 'indicacao', 'google', 'outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum for message status
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- CRM PIPELINES — Funis customizáveis por tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_pipelines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Pipeline Principal',
  crm_type      crm_type NOT NULL DEFAULT 'vendas',
  is_default    BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_pipelines" ON crm_pipelines
  USING (tenant_id = get_tenant_id());

-- ============================================================
-- CRM STAGES — Etapas de cada funil
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id   UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#6b7280',
  position      INTEGER NOT NULL DEFAULT 0,
  is_won        BOOLEAN NOT NULL DEFAULT false,
  is_lost       BOOLEAN NOT NULL DEFAULT false,
  auto_days_alert INTEGER DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_stages" ON crm_stages
  USING (tenant_id = get_tenant_id());

-- ============================================================
-- CRM DEALS — Cards no pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pipeline_id       UUID NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
  stage_id          UUID NOT NULL REFERENCES crm_stages(id),
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  -- Basic info
  title             TEXT NOT NULL,
  contact_name      TEXT,
  contact_phone     TEXT,
  contact_email     TEXT,
  contact_whatsapp  TEXT,
  -- Value
  estimated_value   NUMERIC(12,2) DEFAULT 0,
  -- Source
  source_channel    crm_channel_type DEFAULT 'outro',
  source_detail     TEXT,
  -- Priority
  priority          deal_priority DEFAULT 'media',
  -- Assigned
  assigned_to       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Dates
  expected_close_at TIMESTAMPTZ,
  won_at            TIMESTAMPTZ,
  lost_at           TIMESTAMPTZ,
  lost_reason       TEXT,
  -- Stage tracking
  stage_entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Real estate specific (CRM Imobiliário)
  property_id       UUID REFERENCES properties(id) ON DELETE SET NULL,
  interest_type     TEXT,
  price_min         NUMERIC(12,2),
  price_max         NUMERIC(12,2),
  preferred_areas   TEXT[],
  -- Appointment specific (CRM Atendimento)
  next_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  -- Tags & notes
  tags              TEXT[] DEFAULT '{}',
  notes             TEXT,
  -- Status
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_deals" ON crm_deals
  USING (tenant_id = get_tenant_id());

CREATE INDEX idx_crm_deals_pipeline ON crm_deals(pipeline_id, stage_id) WHERE is_active = true;
CREATE INDEX idx_crm_deals_client ON crm_deals(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_crm_deals_tenant ON crm_deals(tenant_id, is_active);

-- ============================================================
-- CRM DEAL CHANNELS — Canais de contato por deal
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_deal_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel       crm_channel_type NOT NULL,
  identifier    TEXT NOT NULL,
  display_name  TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_deal_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_deal_channels" ON crm_deal_channels
  USING (tenant_id = get_tenant_id());

-- ============================================================
-- CRM ACTIVITIES — Timeline de atividades por deal
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID NOT NULL REFERENCES crm_deals(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type          crm_activity_type NOT NULL DEFAULT 'note',
  title         TEXT NOT NULL,
  description   TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_activities" ON crm_activities
  USING (tenant_id = get_tenant_id());

CREATE INDEX idx_crm_activities_deal ON crm_activities(deal_id, created_at DESC);

-- ============================================================
-- CRM MESSAGES — Mensagens enviadas/recebidas (WhatsApp, Instagram, Facebook)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id       UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  channel       crm_channel_type NOT NULL,
  direction     TEXT NOT NULL DEFAULT 'outbound',
  status        message_status NOT NULL DEFAULT 'pending',
  content       TEXT NOT NULL,
  template_id   TEXT,
  metadata      JSONB DEFAULT '{}',
  sent_at       TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_messages" ON crm_messages
  USING (tenant_id = get_tenant_id());

CREATE INDEX idx_crm_messages_deal ON crm_messages(deal_id, created_at DESC);
CREATE INDEX idx_crm_messages_client ON crm_messages(client_id, created_at DESC);

-- ============================================================
-- CRM MESSAGE TEMPLATES — Templates de mensagem (WhatsApp, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_message_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  channel       crm_channel_type NOT NULL DEFAULT 'whatsapp',
  category      TEXT NOT NULL DEFAULT 'custom',
  content       TEXT NOT NULL,
  variables     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crm_message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_message_templates" ON crm_message_templates
  USING (tenant_id = get_tenant_id());

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_pipelines_updated_at BEFORE UPDATE ON crm_pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_deals_updated_at BEFORE UPDATE ON crm_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_crm_message_templates_updated_at BEFORE UPDATE ON crm_message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FUNCTION: Criar pipeline padrão por tipo de CRM
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_pipeline(
  p_tenant_id UUID,
  p_crm_type crm_type
) RETURNS UUID AS $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  INSERT INTO crm_pipelines (tenant_id, name, crm_type, is_default)
  VALUES (p_tenant_id,
    CASE p_crm_type
      WHEN 'vendas' THEN 'Pipeline de Vendas'
      WHEN 'imobiliario' THEN 'Pipeline Imobiliário'
      WHEN 'atendimento' THEN 'Pipeline de Atendimento'
    END,
    p_crm_type, true
  )
  RETURNING id INTO v_pipeline_id;

  -- Insert default stages based on CRM type
  IF p_crm_type = 'vendas' THEN
    INSERT INTO crm_stages (pipeline_id, tenant_id, name, color, position, auto_days_alert) VALUES
      (v_pipeline_id, p_tenant_id, 'Novo Lead',          '#6b7280', 0, 2),
      (v_pipeline_id, p_tenant_id, 'Primeiro Contato',   '#3b82f6', 1, 3),
      (v_pipeline_id, p_tenant_id, 'Qualificado',        '#eab308', 2, 5),
      (v_pipeline_id, p_tenant_id, 'Proposta Enviada',   '#f97316', 3, 7),
      (v_pipeline_id, p_tenant_id, 'Negociação',         '#8b5cf6', 4, 10),
      (v_pipeline_id, p_tenant_id, 'Fechado Ganho',      '#22c55e', 5, NULL),
      (v_pipeline_id, p_tenant_id, 'Perdido',            '#ef4444', 6, NULL);

    UPDATE crm_stages SET is_won = true WHERE pipeline_id = v_pipeline_id AND name = 'Fechado Ganho';
    UPDATE crm_stages SET is_lost = true WHERE pipeline_id = v_pipeline_id AND name = 'Perdido';

  ELSIF p_crm_type = 'imobiliario' THEN
    INSERT INTO crm_stages (pipeline_id, tenant_id, name, color, position, auto_days_alert) VALUES
      (v_pipeline_id, p_tenant_id, 'Lead Captado',       '#6b7280', 0, 1),
      (v_pipeline_id, p_tenant_id, 'Contato Inicial',    '#3b82f6', 1, 2),
      (v_pipeline_id, p_tenant_id, 'Visita Agendada',    '#eab308', 2, 3),
      (v_pipeline_id, p_tenant_id, 'Visita Realizada',   '#f97316', 3, 5),
      (v_pipeline_id, p_tenant_id, 'Proposta',           '#8b5cf6', 4, 7),
      (v_pipeline_id, p_tenant_id, 'Documentação',       '#1d4ed8', 5, 14),
      (v_pipeline_id, p_tenant_id, 'Fechado',            '#22c55e', 6, NULL),
      (v_pipeline_id, p_tenant_id, 'Desistência',        '#ef4444', 7, NULL);

    UPDATE crm_stages SET is_won = true WHERE pipeline_id = v_pipeline_id AND name = 'Fechado';
    UPDATE crm_stages SET is_lost = true WHERE pipeline_id = v_pipeline_id AND name = 'Desistência';

  ELSIF p_crm_type = 'atendimento' THEN
    INSERT INTO crm_stages (pipeline_id, tenant_id, name, color, position, auto_days_alert) VALUES
      (v_pipeline_id, p_tenant_id, 'Novo Contato',         '#6b7280', 0, 1),
      (v_pipeline_id, p_tenant_id, 'Agendamento Pendente', '#3b82f6', 1, 2),
      (v_pipeline_id, p_tenant_id, 'Agendado',             '#eab308', 2, NULL),
      (v_pipeline_id, p_tenant_id, 'Atendido',             '#22c55e', 3, NULL),
      (v_pipeline_id, p_tenant_id, 'Retorno Pendente',     '#f97316', 4, 7),
      (v_pipeline_id, p_tenant_id, 'Fidelizado',           '#059669', 5, NULL),
      (v_pipeline_id, p_tenant_id, 'Inativo',              '#ef4444', 6, NULL);

    UPDATE crm_stages SET is_won = true WHERE pipeline_id = v_pipeline_id AND name = 'Fidelizado';
    UPDATE crm_stages SET is_lost = true WHERE pipeline_id = v_pipeline_id AND name = 'Inativo';
  END IF;

  -- Insert default message templates
  INSERT INTO crm_message_templates (tenant_id, name, channel, category, content, variables) VALUES
    (p_tenant_id, 'Confirmação de Agendamento', 'whatsapp', 'agendamento',
     'Olá {{nome}}! Seu agendamento está confirmado para {{data}} às {{hora}}. Endereço: {{endereco}}. Qualquer dúvida, estamos à disposição!',
     ARRAY['nome', 'data', 'hora', 'endereco']),
    (p_tenant_id, 'Lembrete de Agendamento', 'whatsapp', 'agendamento',
     'Olá {{nome}}! Lembrando que amanhã, {{data}}, às {{hora}} você tem um agendamento conosco. Até lá! 😊',
     ARRAY['nome', 'data', 'hora']),
    (p_tenant_id, 'Boas-vindas', 'whatsapp', 'boas_vindas',
     'Olá {{nome}}! Bem-vindo(a) à {{empresa}}! Ficamos felizes em ter você como cliente. Como podemos ajudá-lo(a)?',
     ARRAY['nome', 'empresa']),
    (p_tenant_id, 'Follow-up', 'whatsapp', 'followup',
     'Olá {{nome}}! Tudo bem? Faz um tempo que não nos vemos. Que tal agendar um horário? Temos novidades para você! 🌟',
     ARRAY['nome']);

  RETURN v_pipeline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Add crm_type to tenant_settings for CRM type selection
-- ============================================================
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS crm_type crm_type DEFAULT 'vendas';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS crm_auto_whatsapp_confirmation BOOLEAN DEFAULT false;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS crm_auto_whatsapp_reminder BOOLEAN DEFAULT false;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS crm_reminder_hours_before INTEGER DEFAULT 24;
