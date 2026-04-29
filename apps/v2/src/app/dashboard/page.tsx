'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { useCurrentTenant } from '@/lib/use-current-tenant'

interface CreateTenantInput {
  tenantName: string
  slug: string
  niche?: string
}

interface CreateTenantOutput {
  tenantId: string
  membershipId: string
  isFirstTenant: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshToken } = useAuth()
  const { tenantId, role, hasAnyTenant, allTenants, loading: tenantLoading } = useCurrentTenant()

  // Redirect se sem user (após auth resolver)
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  if (authLoading || tenantLoading) {
    return (
      <main style={center}>
        <p style={{ color: '#888' }}>Carregando…</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main style={center}>
        <p style={{ color: '#888' }}>Redirecionando…</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <Header user={user} />
      {hasAnyTenant ? (
        <TenantDashboard
          tenantId={tenantId}
          role={role}
          allTenants={allTenants}
        />
      ) : (
        <Onboarding refreshToken={refreshToken} />
      )}
    </main>
  )
}

function Header({ user }: { user: { email: string | null; uid: string } }) {
  const router = useRouter()
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 22 }}>NexoOmnix V2 — Dashboard</h1>
        <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>
          {user.email} · uid {user.uid.slice(0, 8)}…
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOut(auth)
          router.replace('/login')
        }}
        style={ghostBtn}
      >
        Sair
      </button>
    </header>
  )
}

function TenantDashboard({
  tenantId,
  role,
  allTenants,
}: {
  tenantId: string | null
  role: string | null
  allTenants: string[]
}) {
  return (
    <>
      <section style={card}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Tenant ativo</h2>
        <dl style={{ margin: '16px 0 0', display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 13 }}>
          <dt style={{ color: '#888' }}>tenantId</dt>
          <dd style={{ margin: 0, fontFamily: 'monospace' }}>{tenantId}</dd>
          <dt style={{ color: '#888' }}>role</dt>
          <dd style={{ margin: 0 }}>{role ?? '—'}</dd>
          <dt style={{ color: '#888' }}>total tenants</dt>
          <dd style={{ margin: 0 }}>{allTenants.length}</dd>
        </dl>
        <p style={{ marginTop: 24, color: '#666', fontSize: 12 }}>
          Estado mínimo de validação. Próximas iterações: ler {`tenants/{tenantId}`} via callable
          seguro, exibir nome/plano/branding, listar membros.
        </p>
      </section>

      {tenantId && <ContentJobForm tenantId={tenantId} />}
    </>
  )
}

interface CreateContentJobOutput {
  jobId: string
  path: string
  status: 'queued'
  expiresInDays: number
}

function ContentJobForm({ tenantId }: { tenantId: string }) {
  const [type, setType] = useState<'text' | 'image' | 'reel'>('text')
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreateContentJobOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const fn = httpsCallable<
        { tenantId: string; type: string; prompt: string },
        CreateContentJobOutput
      >(functions, 'createContentJob')
      const res = await fn({
        tenantId,
        type,
        prompt: prompt.trim(),
      })
      setResult(res.data)
      setPrompt('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={{ ...card, marginTop: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Criar content job</h2>
      <p style={{ margin: '4px 0 16px', color: '#888', fontSize: 13 }}>
        Cria <code>tenants/{tenantId}/content_jobs/&#123;jobId&#125;</code> em status{' '}
        <code>queued</code>. Sem worker ainda — sem chamada a IA, sem custo externo.
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={label}>
          Tipo
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'text' | 'image' | 'reel')}
            style={input}
          >
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="reel">reel</option>
          </select>
        </label>
        <label style={label}>
          Prompt
          <textarea
            required
            maxLength={5000}
            placeholder="Ex: Gere um post para Instagram sobre cuidados com cabelo cacheado…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ ...input, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <small style={{ color: '#666' }}>1-5000 chars</small>
        </label>

        <button type="submit" disabled={busy || !prompt.trim()} style={primaryBtn}>
          {busy ? 'Criando…' : 'Criar job'}
        </button>
      </form>

      {result && (
        <div style={successBox}>
          <strong>Job criado ✓</strong>
          <pre style={{ margin: '8px 0 0', fontSize: 12 }}>{JSON.stringify(result, null, 2)}</pre>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
            Documento em status <code>queued</code>, aguardando worker (não implementado nesta fase).
            TTL: {result.expiresInDays} dias.
          </p>
        </div>
      )}

      {error && <pre style={errBox}>{error}</pre>}
    </section>
  )
}

function Onboarding({ refreshToken }: { refreshToken: () => Promise<void> }) {
  const [tenantName, setTenantName] = useState('')
  const [slug, setSlug] = useState('')
  const [niche, setNiche] = useState('')
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [result, setResult] = useState<CreateTenantOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    setStatusMsg('Chamando createTenant…')
    try {
      const fn = httpsCallable<CreateTenantInput, CreateTenantOutput>(
        functions,
        'createTenant'
      )
      const res = await fn({
        tenantName: tenantName.trim(),
        slug: slug.trim().toLowerCase(),
        niche: niche.trim() || undefined,
      })
      setResult(res.data)
      setStatusMsg('Aguardando trigger sincronizar custom claims…')

      // membershipsOnWrite é assíncrono — refresh token em loop até claim aparecer
      // (max ~30s; valor típico observado: 4-7s).
      const maxWaitMs = 30000
      const pollMs = 2000
      const start = Date.now()
      while (Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, pollMs))
        await refreshToken()
        const tr = await auth.currentUser?.getIdTokenResult()
        const tenantsClaim = (tr?.claims as { tenants?: string[] } | undefined)?.tenants
        if (tenantsClaim && tenantsClaim.length > 0) {
          setStatusMsg(null)
          // useCurrentTenant vai re-renderizar com hasAnyTenant=true; o componente
          // pai (DashboardPage) trocará automaticamente para TenantDashboard.
          return
        }
      }
      setStatusMsg(
        'Tenant criado mas claims ainda não chegaram. Tente recarregar a página em alguns segundos.'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStatusMsg(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section style={card}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Onboarding — criar primeiro tenant</h2>
      <p style={{ margin: '4px 0 16px', color: '#888', fontSize: 13 }}>
        Você ainda não pertence a nenhum tenant. Crie agora para acessar o dashboard.
      </p>

      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={label}>
          Nome do tenant
          <input
            type="text"
            required
            maxLength={100}
            placeholder="Salão Bella"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            style={input}
          />
        </label>
        <label style={label}>
          Slug
          <input
            type="text"
            required
            pattern="^[a-z][a-z0-9-]{2,49}$"
            placeholder="salao-bella"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={input}
          />
          <small style={{ color: '#666' }}>
            kebab-case, 3-50 chars, começa com letra
          </small>
        </label>
        <label style={label}>
          Nicho (opcional)
          <select value={niche} onChange={(e) => setNiche(e.target.value)} style={input}>
            <option value="">(nenhum)</option>
            {[
              'imoveis',
              'beleza',
              'tecnico',
              'saude',
              'juridico',
              'pet',
              'educacao',
              'nutricao',
              'engenharia',
              'fotografia',
              'gastronomia',
              'fitness',
              'financas',
            ].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? 'Criando…' : 'Criar tenant'}
        </button>
      </form>

      {statusMsg && <p style={infoBox}>{statusMsg}</p>}

      {result && (
        <div style={successBox}>
          <strong>Tenant criado ✓</strong>
          <pre style={{ margin: '8px 0 0', fontSize: 12 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {error && <pre style={errBox}>{error}</pre>}
    </section>
  )
}

const center: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
}

const card: React.CSSProperties = {
  background: '#161616',
  border: '1px solid #262626',
  borderRadius: 12,
  padding: 24,
}

const label: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: '#bbb',
}

const input: React.CSSProperties = {
  background: '#0a0a0a',
  border: '1px solid #303030',
  color: '#e5e5e5',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 14,
}

const primaryBtn: React.CSSProperties = {
  background: '#3b82f6',
  border: 'none',
  color: 'white',
  padding: '10px 14px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 4,
}

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #303030',
  color: '#888',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
}

const successBox: React.CSSProperties = {
  marginTop: 16,
  background: '#0d2818',
  border: '1px solid #14532d',
  color: '#86efac',
  padding: 12,
  borderRadius: 8,
  fontSize: 13,
}

const infoBox: React.CSSProperties = {
  marginTop: 12,
  background: '#0f1d2e',
  border: '1px solid #1e3a5c',
  color: '#93c5fd',
  padding: 10,
  borderRadius: 8,
  fontSize: 13,
}

const errBox: React.CSSProperties = {
  marginTop: 16,
  background: '#3b1212',
  border: '1px solid #5a1a1a',
  color: '#fca5a5',
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  whiteSpace: 'pre-wrap',
}
