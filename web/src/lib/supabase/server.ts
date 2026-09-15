import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY',
  )
}

// Cliente del servidor con SERVICE ROLE (Route Handlers / Server Components).
// Bypass de RLS: solo para operaciones internas y lectura de datos aislados.
export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})