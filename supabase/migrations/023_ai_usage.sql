-- Sprint Cost Control: tabela de uso de AI por tenant.
--
-- Cada chamada externa de IA (Anthropic, Fal.ai, ElevenLabs, OpenAI TTS)
-- registra uma linha aqui antes de hit na API paga. Permite:
--   - rate limit diário por tipo (text/image/tts)
--   - audit trail de gasto
--   - distinguir chamadas reais de modo simulação (SIMULATE_AI=true)
--
-- Schema simples (uma linha por chamada). Para 20 text + 10 image + 5 tts/dia,
-- volume é trivial mesmo a 1000 tenants. Aggregation pode ser query ad-hoc.
-- Se virar gargalo, futuro sprint pode rollup pra tabela diária.

CREATE TABLE IF NOT EXISTS ai_usage (
  id          bigserial   PRIMARY KEY,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('text', 'image', 'tts')),
  simulate    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índice principal: count por tenant + tipo + janela temporal (rate limit).
CREATE INDEX IF NOT EXISTS idx_ai_usage_lookup
  ON ai_usage (tenant_id, type, created_at DESC);

-- RLS: só service_role acessa (rotas de API rodam server-side com service client).
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ai_usage IS
  'Rate limit + audit de chamadas de IA. Uma linha por chamada (real ou simulada).';
