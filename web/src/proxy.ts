import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { registrarError } from '@/lib/errores'

// Proxy de Next.js 16 (runtime Node.js). Capa de UX/refresco de sesión, NO de seguridad:
// cada Server Action / Ruta protegida vuelve a verificar sesión y rol.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  // Cookies de sesión refrescadas en este request (para reenviarlas en redirects).
  const cookiesRefrescadas: {
    name: string
    value: string
    options?: Record<string, unknown>
  }[] = []

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options)
              cookiesRefrescadas.push({ name, value, options })
            })
          },
        },
      },
    )

    // IMPORTANTE: getUser() valida el token contra Auth y refresca la sesión.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname
    const esRutaLogin = path === '/login' || path === '/registro'

    if (!user && !esRutaLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('next', path)
      return redirectConCookies(url, cookiesRefrescadas)
    }

    if (user && esRutaLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/panel'
      url.search = ''
      return redirectConCookies(url, cookiesRefrescadas)
    }

    return supabaseResponse
  } catch (error) {
    // Fail gracefully: registramos el detalle técnico y seguimos con una respuesta neutra.
    await registrarError({ modulo: 'proxy', contexto: request.nextUrl.pathname, error })
    return NextResponse.next({ request })
  }
}

// Redirección preservando las cookies de sesión refrescadas (regla de cookie-forwarding).
function redirectConCookies(
  url: URL,
  cookies: { name: string; value: string; options?: Record<string, unknown> }[],
) {
  const response = NextResponse.redirect(url)
  cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}