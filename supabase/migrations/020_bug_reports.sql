-- Migration 020: Bug Reports (in-app bug-catcher)
--
-- Qualquer user autenticado pode criar um report via botão flutuante.
-- A UI só mostra o botão pra staff DB8 por ora (esconde UX pro cliente
-- final). Admin DB8 lê/atualiza a fila via /admin/bugs.
--
-- RLS: user insere próprio report (tenant_id via trigger da session).
-- Leitura/edição é admin-only — service_role bypassa, e a admin page
-- tem gate `isDb8Staff` server-side.

DO $$ BEGIN
  CREATE TYPE bug_report_status AS ENUM (
    'new', 'triaging', 'in_progress', 'resolved', 'wont_fix', 'duplicate'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bug_report_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS bug_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_email TEXT,
  description    TEXT NOT NULL,
  url            TEXT NOT NULL,
  user_agent     TEXT,
  viewport_w     INTEGER,
  viewport_h     INTEGER,
  console_logs   JSONB DEFAULT '[]'::jsonb,
  fetch_traces   JSONB DEFAULT '[]'::jsonb,
  selector       TEXT,
  element_html   TEXT,
  screenshot_url TEXT,
  replay_url     TEXT,
  severity       bug_report_severity NOT NULL DEFAULT 'medium',
  status         bug_report_status   NOT NULL DEFAULT 'new',
  assigned_to    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes    TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Insert: qualquer user autenticado pode criar report no próprio tenant.
CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (tenant_id IS NULL OR tenant_id = get_tenant_id())
  );

-- Select: user vê próprios reports. Staff DB8 lê tudo via service role
-- (admin page usa createServiceClient + gate isDb8Staff).
CREATE POLICY "bug_reports_select_own" ON bug_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bug_reports_status
  ON bug_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bug_reports_tenant
  ON bug_reports (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_bug_reports_updated_at BEFORE UPDATE ON bug_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
