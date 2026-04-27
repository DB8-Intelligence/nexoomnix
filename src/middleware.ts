import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/api/auth',
  '/api/webhooks',
  // Crons: Vercel Cron chama sem sessão, auth via Authorization: Bearer CRON_SECRET (validado na própria rota).
  '/api/cron',
  // Compositor OG: consumido pelo Instagram Graph API (sem sessão) pra baixar o PNG na hora de publicar.
  '/api/og',
  // Niche landing pages (marketing)
  '/salaopro',
  '/clinicapro',
  '/ordemdeservico',
  '/juridicpro',
  '/petpro',
  '/educapro',
  '/nutripro',
  '/engepro',
  '/fotopro',
  '/gastronomia',
  '/fitness',
  '/financas',
]

// Rotas removidas do escopo do produto — redirect 301 pra raiz.
// Mantidas como redirect (não 404) para preservar links externos durante janela de SEO.
// Páginas internas serão deletadas em Sprint Cleanup futura.
const REMOVED_PATH_PREFIXES = ['/imobpro', '/reelcreator']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas fora de escopo → 301 pra home (preserva backlinks)
  if (REMOVED_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl, 301)
  }

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

// Rotas que NÃO devem passar pelo middleware (sem auth check, sem cookie parsing).
// Inclui artefatos do Next, arquivos de SEO/PWA e extensões estáticas comuns.
// `.webp` corrigido (era typo `.webpo`); `.ico/.txt/.xml/.json/.woff*/.ttf` adicionados
// para cobrir robots.txt, sitemap.xml, manifest.json, fontes e ícones servidos diretamente.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|woff|woff2|ttf)$).*)',
  ],
}
