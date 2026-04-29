-- Migration 018: Content Templates — biblioteca visual reusável
--
-- Cada template é um ativo visual pronto pra ser reutilizado em posts:
-- uma imagem de background (upload do tenant, exportada do Canva, ou URL
-- externa). O tenant constrói uma biblioteca uma vez, e o autopilot
-- (ou o wizard manual) usa esses ativos como mídia de fundo. O texto do
-- post é gerado separadamente pela IA e renderizado sobre o template
-- no Instagram via legenda (MVP) ou via composição visual (futuro).
--
-- tenant_id NULL = template default compartilhado DB8 (seed institucional).

CREATE TABLE IF NOT EXISTS content_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  niche         TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'feed' CHECK (format IN ('feed', 'story', 'reel_cover')),
  source        TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'canva', 'external')),
  canva_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  usage_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Select: o tenant vê seus próprios templates + os defaults (tenant_id NULL).
CREATE POLICY "content_templates_select" ON content_templates FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = get_tenant_id());

-- Insert/update/delete só nos próprios templates (defaults são imutáveis pelo tenant).
CREATE POLICY "content_templates_insert" ON content_templates FOR INSERT
  WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "content_templates_update" ON content_templates FOR UPDATE
  USING (tenant_id = get_tenant_id());

CREATE POLICY "content_templates_delete" ON content_templates FOR DELETE
  USING (tenant_id = get_tenant_id());

CREATE INDEX IF NOT EXISTS idx_content_templates_tenant
  ON content_templates (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_content_templates_niche
  ON content_templates (niche, is_active)
  WHERE tenant_id IS NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_content_templates_updated_at BEFORE UPDATE ON content_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Linka schedule a um pool de templates (quando gerar rascunho, sorteia um).
-- Array de UUIDs ao invés de FK pra permitir rotação entre vários.
ALTER TABLE content_schedules
  ADD COLUMN IF NOT EXISTS template_ids UUID[] DEFAULT '{}';
