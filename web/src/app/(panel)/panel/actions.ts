'use server'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type ResultadoCrearTorneo = { error?: string } | undefined

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

// Alta mínima de torneo (Fase 3). Solo profesores: la política RLS
// torneos_insert_profesor valida es_profesor del usuario autenticado.
export async function crearTorneo(
  _estadoPrevio: ResultadoCrearTorneo,
  formData: FormData,
): Promise<ResultadoCrearTorneo> {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const fecha = String(formData.get('fecha') ?? '').trim()

  if (!nombre) return { error: 'Completá el nombre del torneo.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'Ingresá una fecha válida.' }
  const fechaValida = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(fechaValida.getTime())) return { error: 'Ingresá una fecha válida.' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.from('torneos').insert({
      nombre,
      fecha,
      estado: 'inscripciones',
    })
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'torneos', contexto: 'crearTorneo', error })
    return { error: 'No pudimos crear el torneo, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}