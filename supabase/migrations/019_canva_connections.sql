-- Migration 019: Canva Connect OAuth
--
-- Cada tenant pode conectar uma conta Canva via OAuth 2.0 (com PKCE).
-- Tokens ficam em canva_connections e são usados pelo backend pra listar
-- e exportar designs direto pra biblioteca content_templates.
--
-- Refresh automático: se access_token expirou (expires_at <= now()), a rota
-- consumidora tenta usar refresh_token pra obter novo par. Se refresh também
-- falhar, marca is_active=false e o tenant precisa reconectar.

CREATE TABLE IF NOT EXISTS canva_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  canva_user_id   TEXT,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  scope           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id)
);

ALTER TABLE canva_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_canva_connections" ON canva_connections
  USING (tenant_id = get_tenant_id());

DO $$ BEGIN
  CREATE TRIGGER trg_canva_connections_updated_at BEFORE UPDATE ON canva_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Armazena o state + code_verifier do PKCE enquanto o user está no Canva.
-- TTL curto (10min): entry expira via created_at checado no callback.
CREATE TABLE IF NOT EXISTS canva_oauth_states (
  state          TEXT PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_verifier  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sem RLS em oauth_states: acessada apenas via service role
-- (o callback não tem sessão do user no momento da troca de code).

-- Linka content_templates a design do Canva pra permitir re-sync futuro.
ALTER TABLE content_templates
  ADD COLUMN IF NOT EXISTS canva_design_id TEXT;

CREATE INDEX IF NOT EXISTS idx_content_templates_canva_design
  ON content_templates (canva_design_id)
  WHERE canva_design_id IS NOT NULL;
