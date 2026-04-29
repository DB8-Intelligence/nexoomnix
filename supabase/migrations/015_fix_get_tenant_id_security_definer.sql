-- Migration 015: Fix recursão infinita em get_tenant_id()
--
-- A função get_tenant_id() é usada em todas as RLS policies (ex.: profiles_select
-- usa `tenant_id = get_tenant_id()`). Sem SECURITY DEFINER, a função roda no
-- contexto do usuário chamador, o que faz a sub-query `SELECT tenant_id FROM
-- profiles` disparar o RLS de profiles, que chama get_tenant_id() de novo → loop
-- infinito → `stack depth limit exceeded`.
--
-- Efeito prático: SELECT * FROM profiles retorna 0 linhas mesmo quando o
-- profile existe, porque a query aborta. O dashboard/layout interpreta isso
-- como "usuário sem tenant" e redireciona pra /login, causando loop de
-- ERR_TOO_MANY_REDIRECTS com o middleware.
--
-- Fix: SECURITY DEFINER executa a função com os privilégios do owner (bypassa
-- RLS da sub-query). Padrão recomendado pelo Supabase para helpers de RLS.
-- STABLE mantido pro planner conseguir cachear o resultado.

CREATE OR REPLACE FUNCTION public.get_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;
