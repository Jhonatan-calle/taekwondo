import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

import { registrarError } from '@/lib/errores'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
}

// Cliente del servidor con sesión del usuario (Server Components, Server Actions y Route Handlers).
// Usa ÚNICAMENTE getAll/setAll de @supabase/ssr.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch (error) {
          // Los Server Components no pueden escribir cookies; el proxy refresca la sesión.
          registrarError({
            modulo: 'server',
            contexto: 'createClient:setAll',
            error,
            severidad: 'warning',
          })
        }
      },
    },
  })
}