# NexoOmnix V2 Web (apps/v2)

Frontend mínimo do Firebase V2. Não toca no V1 (Supabase). Roda na porta `3010`.

## Pré-requisitos

- Node 20+
- `apps/v2/.env.local` preenchido com config do Firebase Web App
  (template: [`.env.local.example`](.env.local.example))

## Comandos

```bash
npm install
npm run dev      # http://localhost:3010
npm run build
```

## Fluxo de sessão (V2 hardening)

A sessão é gerenciada por `AuthProvider` em [`src/lib/auth-context.tsx`](src/lib/auth-context.tsx) — fonte única de verdade. Plugado em [`src/app/layout.tsx`](src/app/layout.tsx) na raiz.

```text
                                   ┌─────────────────────────────────────┐
                                   │  AuthProvider (root layout)         │
                                   │  • subscribes onIdTokenChanged      │
                                   │  • exposes:                         │
                                   │    user, loading,                   │
                                   │    idTokenResult,                   │
                                   │    tenants[], roles{},              │
                                   │    refreshToken()                   │
                                   └─────────────┬───────────────────────┘
                                                 │
                            ┌────────────────────┼────────────────────┐
                            ▼                    ▼                    ▼
                       useAuth()         useCurrentTenant()      direct consume
                       (genérico)       (tenant ativo + role)    (idTokenResult)
                            │                    │
                            ├──── /              │
                            │                    │
                            ├──── /login         │
                            │                    │
                            └──── /dashboard ────┘
                                       │
                                       ├─ loading?       → "Carregando…"
                                       ├─ !user          → router.replace('/login')
                                       ├─ !hasAnyTenant  → <Onboarding/> (form createTenant)
                                       └─ hasAnyTenant   → <TenantDashboard/>
```

### Hooks expostos

| Hook | O que retorna | Onde usar |
|---|---|---|
| `useAuth()` | `{ user, loading, idTokenResult, tenants, roles, refreshToken }` | Qualquer componente que precise de user/claims |
| `useCurrentTenant()` | `{ tenantId, role, hasAnyTenant, allTenants, allRoles, loading }` | Páginas que precisam saber tenant ativo |

`useCurrentTenant` deriva o tenant ativo do **claim** (primeiro de `tenants[]`) — não faz read em Firestore (rules continuam `deny-all`). Quando tivermos selector de tenant ou leitura segura de `users/{uid}.defaultTenantId`, evoluímos sem alterar consumidores.

### Fluxo de createTenant + sincronização de claims

`membershipsOnWrite` (Cloud Function trigger Firestore) é assíncrono — leva 2-7s típicos para sincronizar custom claims após o write em `/memberships`. O dashboard faz **polling**:

```
1. user click "Criar tenant"
2. callable createTenant(...) → cria 5 docs em transação
3. response → tenantId, isFirstTenant
4. membershipsOnWrite trigger dispara (assíncrono)
5. Dashboard entra em loop:
     a cada 2s → refreshToken() → checa idTokenResult.claims.tenants
     → quando tenants.length > 0 → useCurrentTenant detecta → re-render
6. <Onboarding/> sai, <TenantDashboard/> aparece
   (timeout: 30s. Se não chegar, mostra mensagem pra recarregar.)
```

`refreshToken()` chama `getIdToken(/*forceRefresh*/ true)` + recarrega `idTokenResult` no contexto. `onIdTokenChanged` dispara automático nesse caminho.

### Proteção de rotas

| Rota | Estado | Comportamento |
|---|---|---|
| `/` | qualquer | Redireciona para `/login` ou `/dashboard` baseado em `useAuth().user` |
| `/login` | `user` setado | Redireciona para `/dashboard` (não permite re-login se já autenticado) |
| `/dashboard` | sem user | Redireciona para `/login` |
| `/dashboard` | user sem tenant | Mostra `<Onboarding/>` |
| `/dashboard` | user com tenant | Mostra `<TenantDashboard/>` |

Toda proteção é **client-side** (este V2 não tem SSR auth-aware). Suficiente porque dados sensíveis são gateados por Firestore rules + custom claims, não pela rota Next.

## Não fazer (por ora)

- Não habilitar Firestore reads no client — rules estão `deny-all` por design. Use callables (server-only) para qualquer leitura sensível.
- Não adicionar billing, IA, ou integração com V1.
- Não ler `users/{uid}.defaultTenantId` direto — mover para callable (`getMyContext`) quando precisar.

## Próximos passos sugeridos

1. Callable `listMyTenants()` retornando tenant docs completos (nome, plan, branding) para o `<TenantDashboard/>` exibir info real
2. Tenant selector quando `allTenants.length > 1`
3. Persistência de "tenant escolhido" em localStorage (sobrescreve `tenants[0]` default)
4. Página `/tenants/new` separada (em vez de inline em `/dashboard`)
5. Evoluir Firestore rules para permitir read seletivo (membros do tenant veem `tenants/{tid}`)
