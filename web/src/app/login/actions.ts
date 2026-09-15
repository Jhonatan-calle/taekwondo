'use server'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type ResultadoLogin = { error?: string } | undefined

// Valida el destino post-login contra open redirect (solo rutas internas absolutas).
function rutaSegura(next: string): string {
  if (next.startsWith('/') && !next.startsWith('//')) return next
  return '/panel'
}

export async function iniciarSesion(
  _estadoPrevio: ResultadoLogin,
  formData: FormData,
): Promise<ResultadoLogin> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = rutaSegura(String(formData.get('next') ?? '/panel'))

  if (!email || !password) {
    return { error: 'Completá tu email y contraseña.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  } catch (error) {
    // Credenciales inválidas = fallo esperado: se registra para auditoría (warning) sin
    // exponer detalles técnicos a la UI.
    await registrarError({
      modulo: 'login',
      contexto: 'signInWithPassword',
      error,
      severidad: 'warning',
    })
    return { error: 'No pudimos iniciar sesión. Verificá tus datos e intentá de nuevo.' }
  }

  redirect(next)
}