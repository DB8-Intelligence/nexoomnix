-- Migration 021: Formato + duração em content_schedules (suporte a reels)
--
-- Schedule agora pode gerar rascunhos de posts estáticos (feed) ou reels em
-- vídeo. Reel é geração async: cron dispara o job no n8n/Railway, o pipeline
-- externo gera imagens + voz + FFmpeg assembly e callback /api/webhooks/reel
-- cria o scheduled_post quando pronto.
--
-- content_schedules.format  — 'feed' (default, compositor PNG) | 'reel'
-- content_schedules.duration_sec — duração do reel em segundos (15/30/60)
--
-- content_projects ganha colunas de tracking da fila:
--   generation_job_id — ID retornado pelo n8n/worker externo
--   generation_started_at — quando o job foi despachado
--   generation_error   — última mensagem de erro (pra debug)

DO $$ BEGIN
  CREATE TYPE schedule_format AS ENUM ('feed', 'reel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE content_schedules
  ADD COLUMN IF NOT EXISTS format schedule_format NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS duration_sec INTEGER NOT NULL DEFAULT 15
    CHECK (duration_sec IN (15, 30, 60));

ALTER TABLE content_projects
  ADD COLUMN IF NOT EXISTS generation_job_id TEXT,
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_error TEXT;

CREATE INDEX IF NOT EXISTS idx_content_projects_generation_job
  ON content_projects (generation_job_id)
  WHERE generation_job_id IS NOT NULL;
