-- Migration 024 — Sprint Cleanup 3, Phase D
-- ============================================================
-- Remove schema/data residuals tied to features removidas em
-- Sprint Cleanup 3 Fases A/B/C:
--   1. Reel Creator AI / pipeline n8n / Talking Objects (deletados)
--   2. Imóveis / ImobPro / CRM imobiliário (legado fora de escopo)
--
-- Phase D Discovery (29/04/2026, project pclqjwegljrglaslppag):
--   - 0 rows em properties / property_media / brand_templates
--   - 0 tenants com niche='imoveis' ou addon_talking_objects=true
--   - 0 content_projects com talking_object_* preenchidos
--   - 0 content_schedules com format='reel'
--   - 0 scheduled_posts com media_type='reel' ou reel_creator_content
--   - 0 crm_pipelines com crm_type='imobiliario'
--   - Únicos hits: 1 row agent_skills (nicho='imoveis') + 1 skill_generation_log
--   - Bucket Supabase Storage 'properties' vazio (drop manual via Dashboard)
--   - Stripe: 0 subscriptions ativas → archive manual do produto
--             STRIPE_PRICE_ADDON_TALKING_OBJECTS via dashboard.stripe.com
--
-- "reel" como formato de publicação (Instagram Reels via Meta Graph API,
-- ContentType 'reel' em content_projects.formato TEXT) PERMANECE válido.
-- O que sai aqui é só o ENUM schedule_format='reel' (autopilot reel = no-op
-- desde Phase B) e o CHECK media_type='reel' (legado do AutoPostModal default).
-- O Meta Graph API publica IG Reels com mediaType='video' já mapeando pra REELS.

BEGIN;

-- ── 1. Delete legacy seed rows ─────────────────────────────────
-- agent_skills + skill_generation_log para nicho 'imoveis' (seed factory).
-- skill_generation_log e agent_skills compartilham apenas o campo nicho
-- (sem FK entre eles). agent_sessions tem FK skill_id → agent_skills com
-- ON DELETE SET NULL — discovery confirmou 0 sessions vinculadas.
DELETE FROM skill_generation_log WHERE nicho = 'imoveis';
DELETE FROM agent_skills        WHERE nicho = 'imoveis';

-- ── 2. Drop CRM imobiliário columns + FK property_id ───────────
-- crm_deals.property_id é FK para properties.id. Cai antes de DROP TABLE properties.
ALTER TABLE crm_deals
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS interest_type,
  DROP COLUMN IF EXISTS price_min,
  DROP COLUMN IF EXISTS price_max,
  DROP COLUMN IF EXISTS preferred_areas;

-- ── 3. Drop tabelas Imob (mig 004) ─────────────────────────────
-- Ordem: property_media → brand_templates → properties.
-- CASCADE limpa triggers locais (updated_at, RLS policies) e índices.
DROP TABLE IF EXISTS property_media  CASCADE;
DROP TABLE IF EXISTS brand_templates CASCADE;
DROP TABLE IF EXISTS properties      CASCADE;

-- ── 4. Drop colunas Talking Objects (mig 005, mig 010) ─────────
ALTER TABLE tenants
  DROP COLUMN IF EXISTS addon_talking_objects,
  DROP COLUMN IF EXISTS addon_talking_objects_stripe_sub;

ALTER TABLE content_projects
  DROP COLUMN IF EXISTS talking_object_options,
  DROP COLUMN IF EXISTS talking_object_selected;

-- Índice idx_tenants_addon_talking_objects (mig 010) cai junto com a coluna.

-- ── 5. Drop coluna reel_creator_content (mig 009) ──────────────
-- Coluna JSONB criada para snapshot do Reel Creator AI no scheduled_posts.
ALTER TABLE scheduled_posts
  DROP COLUMN IF EXISTS reel_creator_content;

-- ── 6. Recriar CHECK scheduled_posts.media_type sem 'reel' ─────
-- Mantém 'image','video','carousel'. Publicação de IG Reels usa
-- media_type='video' no Meta Graph API (lib/meta/publish-to-graph mapeia
-- video → REELS quando há aspect ratio 9:16).
ALTER TABLE scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_media_type_check;
ALTER TABLE scheduled_posts
  ADD CONSTRAINT scheduled_posts_media_type_check
  CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'carousel'::text]));

-- ── 7. Recriar ENUM crm_type sem 'imobiliario' ─────────────────
-- Postgres não suporta DROP VALUE em enum. Padrão rename → recreate → swap.
-- Default 'vendas'::crm_type é dropado e re-aplicado pra evitar dependência.
ALTER TABLE crm_pipelines ALTER COLUMN crm_type DROP DEFAULT;

ALTER TYPE crm_type RENAME TO crm_type_old;

CREATE TYPE crm_type AS ENUM ('vendas', 'atendimento');

ALTER TABLE crm_pipelines
  ALTER COLUMN crm_type TYPE crm_type
  USING crm_type::text::crm_type;

ALTER TABLE crm_pipelines ALTER COLUMN crm_type SET DEFAULT 'vendas'::crm_type;

DROP TYPE crm_type_old;

-- ── 8. Recriar ENUM schedule_format sem 'reel' ─────────────────
-- Mesmo padrão. Default era 'feed'::schedule_format.
ALTER TABLE content_schedules ALTER COLUMN format DROP DEFAULT;

ALTER TYPE schedule_format RENAME TO schedule_format_old;

CREATE TYPE schedule_format AS ENUM ('feed');

ALTER TABLE content_schedules
  ALTER COLUMN format TYPE schedule_format
  USING format::text::schedule_format;

ALTER TABLE content_schedules ALTER COLUMN format SET DEFAULT 'feed'::schedule_format;

DROP TYPE schedule_format_old;

COMMIT;

-- ── Pós-merge (manual, fora do SQL) ────────────────────────────
-- 1. Supabase Dashboard → Storage → Buckets: deletar bucket 'properties'
--    (vazio, confirmado em discovery). Bucket 'content' permanece.
-- 2. Stripe Dashboard → Products: archive do produto vinculado a
--    STRIPE_PRICE_ADDON_TALKING_OBJECTS (não delete — preserva audit).
-- 3. Vercel/Cloud Run env vars: remover STRIPE_PRICE_ADDON_TALKING_OBJECTS
--    após confirmar que código de Phase D removeu ADDON_PRICE_IDS,
--    addonFromPriceId e ADDON_LABELS de src/lib/stripe.ts.
-- 4. Limpar .env.example e CLAUDE.md das referências de addon talking_objects.
