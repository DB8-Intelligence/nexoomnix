'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '@/lib/firebase'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantName, setTenantName] = useState('')
  const [slug, setSlug] = useState('')
  const [niche, setNiche] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CreateTenantOutput | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [router])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const fn = httpsCallable<CreateTenantInput, CreateTenantOutput>(functions, 'createTenant')
      const res = await fn({
        tenantName: tenantName.trim(),
        slug: slug.trim().toLowerCase(),
        niche: niche.trim() || undefined,
      })
      setResult(res.data)
      // Refresh ID token para receber novas custom claims (tenants[], roles{})
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main style={center}>
        <p style={{ color: '#888' }}>Carregando…</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
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
            {user?.email} · uid {user?.uid.slice(0, 8)}…
          </p>
        </div>
        <button
          onClick={async () => {
            await signOut(auth)
            router.replace('/login')
          }}
          style={ghostBtn}
        >
          Sair
        </button>
      </header>

      <section style={card}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Criar tenant</h2>
        <p style={{ margin: '4px 0 16px', color: '#888', fontSize: 13 }}>
          Chama a Cloud Function callable <code>createTenant</code>.
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

        {result && (
          <div style={successBox}>
            <strong>Tenant criado ✓</strong>
            <pre style={{ margin: '8px 0 0', fontSize: 12 }}>
              {JSON.stringify(result, null, 2)}
            </pre>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#888' }}>
              Custom claims sincronizadas pelo trigger <code>membershipsOnWrite</code>.
              Token foi refrescado.
            </p>
          </div>
        )}

        {error && <pre style={errBox}>{error}</pre>}
      </section>
    </main>
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
