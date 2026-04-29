-- Sprint 7: idempotência do webhook Stripe.
--
-- Stripe entrega webhooks at-least-once. Sem uma tabela de eventos processados,
-- um mesmo event.id reentregue re-executa DB updates e reenvia emails (welcome
-- duplicado = UX ruim). Esta tabela registra todo evento logo após a validação
-- de assinatura, impedindo side effects duplicados.
--
-- Fluxo de estados:
--   (novo evento)       INSERT status='processing'
--   (processou OK)      UPDATE status='processed',  processed_at = now()
--   (side effect falhou) UPDATE status='failed',     failed_at   = now(), error_message = <msg>
--   (retry de failed)   UPDATE status='processing', failed_at   = null, error_message = null
--
-- Race condition: dois deliveries do mesmo event.id chegando simultaneamente
-- são resolvidos pelo PRIMARY KEY em id (INSERT ... ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id             text        PRIMARY KEY,
  type           text        NOT NULL,
  status         text        NOT NULL CHECK (status IN ('processing', 'processed', 'failed')),
  received_at    timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz,
  failed_at      timestamptz,
  error_message  text,
  livemode       boolean,
  api_version    text,
  payload        jsonb
);

-- Apenas eventos não finalizados precisam de consulta operacional
-- (monitorar stuck/failed). Índice parcial economiza espaço em escala.
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_pending
  ON stripe_webhook_events (status, received_at)
  WHERE status != 'processed';

-- RLS ativo: só service_role acessa (webhook handler). Sem policies =
-- anon/authenticated 100% bloqueados. service_role bypassa RLS por default.
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE stripe_webhook_events IS
  'Idempotência do webhook Stripe. Um event.id aqui = já visto. Status processed = side effects aplicados.';
