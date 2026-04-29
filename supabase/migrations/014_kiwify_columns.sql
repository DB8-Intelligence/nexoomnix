-- Migration 014: Colunas Kiwify na tabela tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS kiwify_order_id       text,
  ADD COLUMN IF NOT EXISTS kiwify_product_id     text,
  ADD COLUMN IF NOT EXISTS kiwify_billing_cycle  text CHECK (kiwify_billing_cycle IN ('monthly', 'yearly'));

-- Índice para idempotência (evita processar o mesmo pedido duas vezes)
CREATE UNIQUE INDEX IF NOT EXISTS tenants_kiwify_order_id_idx
  ON tenants (kiwify_order_id)
  WHERE kiwify_order_id IS NOT NULL;
