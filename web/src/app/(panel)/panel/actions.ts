'use server'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export async function cerrarSesion() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'logout', contexto: 'cerrarSesion', error })
  }
  redirect('/')
}