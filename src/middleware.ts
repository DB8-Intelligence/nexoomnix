import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getDomainConfig, isReelCreatorDomain, NICHE_COOKIE, PRODUCT_MODE_COOKIE } from '@/lib/domain-config'

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/api/auth',
  '/api/webhooks',
  // Niche landing pages (marketing)
  '/salaopro',
  '/clinicapro',
  '/ordemdeservico',
  '/imobpro',
  '/juridicpro',
  '/petpro',
  '/educapro',
  '/nutripro',
  '/engepro',
  '/fotopro',
  '/gastronomia',
  '/fitness',
  '/financas',
  '/reelcreator',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  // Site público dos clientes — sempre acessível
  if (pathname.startsWith('/s/')) {
    return NextResponse.next()
  }

  // Rotas públicas — acessíveis sem auth
  const isPublic = PUBLIC_ROUTES.some(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  )

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Domain detection — set niche cookie for the session
  const domainCfg = getDomainConfig(hostname)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Persist niche cookie for domain-specific deployments
  if (domainCfg) {
    response.cookies.set(NICHE_COOKIE, domainCfg.niche, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // Persist product-mode cookie for ReelCreator standalone dashboard
  if (isReelCreatorDomain(hostname)) {
    response.cookies.set(PRODUCT_MODE_COOKIE, 'reelcreator', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // Unauthenticated user on domain root → redirect to domain's landing page
  if (!user && pathname === '/' && domainCfg) {
    const landingUrl = request.nextUrl.clone()
    landingUrl.pathname = domainCfg.landingPath
    return NextResponse.redirect(landingUrl)
  }

  // Unauthenticated user on protected route → login
  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user on login → dashboard.
  // /cadastro é omitido: a página /cadastro detecta user logado sem tenant e
  // permite completar o onboarding (OAuth signup ou signup parcial).
  if (user && pathname === '/login') {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webpo)$).*)',
  ],
}
