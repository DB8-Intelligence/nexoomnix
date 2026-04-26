'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se já estiver autenticado, sair do /login
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      // AuthContext recebe via onIdTokenChanged; useEffect acima redireciona.
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
      <form
        onSubmit={submit}
        style={{
          background: '#161616',
          padding: 32,
          borderRadius: 12,
          border: '1px solid #262626',
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>NexoOmnix V2</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 13 }}>
          {mode === 'login' ? 'Entrar com email e senha' : 'Criar conta nova'}
        </p>

        <input
          type="email"
          required
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="senha (mín. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button type="submit" disabled={busy} style={primaryBtn}>
          {busy ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode(mode === 'login' ? 'signup' : 'login')
          }}
          style={ghostBtn}
        >
          {mode === 'login' ? 'Não tenho conta — cadastrar' : 'Já tenho conta — entrar'}
        </button>

        {error && (
          <pre style={errBox}>{error}</pre>
        )}
      </form>
    </main>
  )
}

const inputStyle: React.CSSProperties = {
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

const errBox: React.CSSProperties = {
  background: '#3b1212',
  border: '1px solid #5a1a1a',
  color: '#fca5a5',
  padding: 10,
  borderRadius: 8,
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  margin: 0,
}
