'use server'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type ResultadoRegistro = { error?: string } | undefined

export async function registrar(
  _estadoPrevio: ResultadoRegistro,
  formData: FormData,
): Promise<ResultadoRegistro> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const nombre = String(formData.get('nombre') ?? '').trim()
  const codigo = String(formData.get('codigo') ?? '').trim()

  const inviteCode = process.env.INVITE_CODE
  if (!inviteCode) {
    await registrarError({
      modulo: 'registro',
      contexto: 'registrar',
      error: new Error('INVITE_CODE no configurado en el servidor.'),
      severidad: 'critical',
    })
    return { error: 'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.' }
  }

  if (!email || !password || !nombre) {
    return { error: 'Completá email, contraseña y nombre.' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (codigo !== inviteCode) {
    return { error: 'El código de invitación no es válido.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_completo: nombre } },
    })
    if (error) throw error
    if (!data.user) throw new Error('No se pudo crear el usuario.')

    // La faceta profesor y el nombre se escriben EXCLUSIVAMENTE con el cliente
    // admin (Service Role): las políticas RLS + el trigger de seguridad impiden
    // que un usuario se auto-active como profesor.
    const { error: errorPerfil } = await supabaseAdmin
      .from('profiles')
      .update({ es_profesor: true, nombre_completo: nombre })
      .eq('id', data.user.id)
    if (errorPerfil) throw errorPerfil
  } catch (error) {
    await registrarError({ modulo: 'registro', contexto: 'registrar', error })
    return { error: 'No pudimos procesar tu solicitud, intentá de nuevo en unos minutos.' }
  }

  redirect('/login?registrado=1')
}