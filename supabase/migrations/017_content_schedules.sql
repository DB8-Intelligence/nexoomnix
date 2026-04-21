-- Migration 017: Content Schedules (autopilot de ideação)
--
-- Cada schedule define uma cadência de geração automática de rascunhos de post.
-- O cron worker /api/cron/generate-scheduled roda uma vez por dia, identifica
-- schedules cujo next_run_at <= now(), gera o texto do post (legenda, hashtags,
-- CTAs) com branding injetado, cria um content_project com status 'draft' e
-- agenda o next_run_at do schedule conforme a frequência.
--
-- A publicação automática (imagem + scheduled_posts) fica pra Sprint C quando
-- existir galeria de templates visuais. Por ora, o tenant revisa os rascunhos
-- gerados e converte em post publicável manualmente.

DO $$ BEGIN
  CREATE TYPE schedule_frequency AS ENUM ('daily', '3x_week', '5x_week', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS content_schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  topic_hint    TEXT,
  frequency     schedule_frequency NOT NULL DEFAULT 'weekly',
  days_of_week  INTEGER[] DEFAULT '{1,3,5}',
  hour_of_day   INTEGER NOT NULL DEFAULT 9 CHECK (hour_of_day BETWEEN 0 AND 23),
  timezone      TEXT NOT NULL DEFAULT 'America/Bahia',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_run_at   TIMESTAMPTZ,
  next_run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_content_schedules" ON content_schedules
  USING (tenant_id = get_tenant_id());

CREATE INDEX IF NOT EXISTS idx_content_schedules_worker
  ON content_schedules (next_run_at)
  WHERE is_active = true;

DO $$ BEGIN
  CREATE TRIGGER trg_content_schedules_updated_at BEFORE UPDATE ON content_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Linka o content_project ao schedule que o criou (nullable — projetos criados
-- manualmente pelo wizard não têm schedule).
ALTER TABLE content_projects
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES content_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_projects_schedule
  ON content_projects (schedule_id)
  WHERE schedule_id IS NOT NULL;
