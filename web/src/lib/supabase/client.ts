import { createBrowserClient } from '@supabase/ssr'
import { crearRegistrador } from '@/lib/errores'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
  )
}

// Cliente del navegador (Client Components). Maneja la sesión con cookies.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Registrador de errores del lado cliente (módulo por defecto: browser).
export const registrarError = crearRegistrador(supabase)