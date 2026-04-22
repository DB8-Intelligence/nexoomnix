-- Migration 016: Retry tracking for scheduled_posts cron worker
--
-- The cron worker picks up scheduled_posts where status='scheduled' and
-- scheduled_for <= now(). When the Meta Graph API fails, the worker should
-- reschedule the post for a later retry instead of giving up immediately.
-- Three new columns drive this:
--
--   attempts          : how many publish attempts were made (0 = never tried)
--   max_attempts      : ceiling; default 3
--   next_attempt_at   : when the worker should consider this row again.
--                       Set to a future timestamp after a transient failure,
--                       cleared when the post is published or permanently failed.
--
-- The worker uses `WHERE status='scheduled' AND scheduled_for <= now() AND
-- (next_attempt_at IS NULL OR next_attempt_at <= now())` so a freshly-scheduled
-- post is picked up immediately and a retried post waits out the backoff.

ALTER TABLE scheduled_posts
  ADD COLUMN IF NOT EXISTS attempts          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts      INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS next_attempt_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_worker
  ON scheduled_posts (scheduled_for)
  WHERE status = 'scheduled';
