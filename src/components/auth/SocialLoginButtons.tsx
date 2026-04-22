'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Provider = 'google' | 'facebook'

interface SocialLoginButtonsProps {
  /** Onde redirecionar depois do OAuth callback. Default: /dashboard */
  next?: string
  /** Mostra divisor "ou" antes dos botões */
  showDivider?: boolean
}

export function SocialLoginButtons({
  next = '/dashboard',
  showDivider = true,
}: SocialLoginButtonsProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signInWith(provider: Provider) {
    setLoading(provider)
    setError(null)
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) {
      setError(`Erro ao entrar com ${provider}: ${error.message}`)
      setLoading(null)
    }
    // Se não houve erro, browser redireciona pro provider — sem setLoading(null)
  }

  return (
    <div className="space-y-3">
      {showDivider && (
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">ou</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => signInWith('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 hover:bg-gray-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading === 'google' ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        ) : (
          <GoogleIcon />
        )}
        <span className="text-sm font-medium text-gray-700">Continuar com Google</span>
      </button>

      <button
        type="button"
        onClick={() => signInWith('facebook')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg py-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading === 'facebook' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FacebookIcon />
        )}
        <span className="text-sm font-medium">Continuar com Facebook</span>
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC04" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}
