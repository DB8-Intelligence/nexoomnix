'use client'

// AuthContext — fonte única de verdade da sessão Firebase no V2.
//
// Centraliza:
//   - user (Firebase User | null)
//   - loading (true durante o primeiro snapshot do auth state)
//   - idTokenResult (com claims customizadas)
//   - tenants[] e roles{} extraídos das claims (sincronizadas pelo trigger
//     membershipsOnWrite após writes em /memberships)
//   - refreshToken() para forçar re-fetch do ID token quando claims mudam
//
// Uso pelos consumers via hook `useAuth()`. O contexto está plugado em
// app/layout.tsx, então qualquer página/componente client pode consumir.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onIdTokenChanged,
  type IdTokenResult,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  idTokenResult: IdTokenResult | null
  tenants: string[]
  roles: Record<string, string>
  /** Força refresh do ID token (re-busca claims atualizadas do servidor). */
  refreshToken: () => Promise<void>
}

const defaultValue: AuthContextValue = {
  user: null,
  loading: true,
  idTokenResult: null,
  tenants: [],
  roles: {},
  refreshToken: async () => {},
}

const AuthContext = createContext<AuthContextValue>(defaultValue)

function extractTenancy(tr: IdTokenResult | null): {
  tenants: string[]
  roles: Record<string, string>
} {
  const claims = (tr?.claims ?? {}) as Record<string, unknown>
  const tenants = Array.isArray(claims.tenants)
    ? (claims.tenants as unknown[]).filter((t): t is string => typeof t === 'string')
    : []
  const roles =
    claims.roles && typeof claims.roles === 'object'
      ? (claims.roles as Record<string, string>)
      : {}
  return { tenants, roles }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [idTokenResult, setIdTokenResult] = useState<IdTokenResult | null>(null)

  useEffect(() => {
    // onIdTokenChanged dispara em login/logout E quando o token é refrescado
    // (incluindo após `getIdToken(true)` chamado em refreshToken()).
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const tr = await u.getIdTokenResult()
        setIdTokenResult(tr)
      } else {
        setIdTokenResult(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshToken = async () => {
    if (!auth.currentUser) return
    // forceRefresh=true vai ao servidor, traz custom claims atualizadas
    await auth.currentUser.getIdToken(true)
    const tr = await auth.currentUser.getIdTokenResult()
    setIdTokenResult(tr)
  }

  const { tenants, roles } = extractTenancy(idTokenResult)

  return (
    <AuthContext.Provider
      value={{ user, loading, idTokenResult, tenants, roles, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
