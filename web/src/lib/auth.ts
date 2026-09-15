import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

// Devuelve el usuario autenticado o null. Fallo de red/validación → registrado + null.
export async function getUser() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  } catch (error) {
    await registrarError({ modulo: 'auth', contexto: 'getUser', error, severidad: 'warning' })
    return null
  }
}

// Redirige a /login?next=<ruta> si no hay sesión.
export async function requireUser() {
  const user = await getUser()
  if (user) return user
  redirect('/login')
}

// Perfil del usuario (faceta profesor). Fallo de BD → registrado + null (nunca rompe la vista).
export async function getProfile() {
  const user = await getUser()
  if (!user) return null
  try {
    const supabase = await createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('es_profesor')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    return profile
  } catch (error) {
    await registrarError({ modulo: 'auth', contexto: 'getProfile', error })
    return null
  }
}

// Obliga a tener sesión + faceta profesor activa. Redirige a / si no cumple.
export async function requireProfesor() {
  const user = await requireUser()
  const profile = await getProfile()
  if (!profile || profile.es_profesor !== true) {
    redirect('/')
  }
  return { user, profile, esProfesor: profile.es_profesor }
}