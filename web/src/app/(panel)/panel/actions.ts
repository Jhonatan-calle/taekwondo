'use server'

import { redirect } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type ResultadoCrearTorneo = { error?: string } | undefined
export type ResultadoAccionInscripcion = { error?: string } | undefined

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Iniciá sesión para crear un torneo.' }

    const { error } = await supabase.from('torneos').insert({
      nombre,
      fecha,
      estado: 'inscripciones',
      organizador_id: user.id,
    })
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'torneos', contexto: 'crearTorneo', error })
    return { error: 'No pudimos crear el torneo, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}

// Confirma el pago/aval de una inscripción pendiente (solo el profesor del aval).
// RLS "inscripciones_update_profesor" garantiza que auth.uid() = profesor_id.
export async function confirmarInscripcion(
  _estadoPrevio: ResultadoAccionInscripcion,
  formData: FormData,
): Promise<ResultadoAccionInscripcion> {
  const inscripcionId = String(formData.get('inscripcion_id') ?? '').trim()
  if (!UUID_REGEX.test(inscripcionId)) return { error: 'La inscripción no es válida.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // estado='pendiente' evita procesar dos veces una inscripción (0 filas → ya procesada).
    const { data, error } = await supabase
      .from('inscripciones')
      .update({
        estado: 'confirmado',
        confirmado_por: user?.id,
        confirmado_en: new Date().toISOString(),
      })
      .eq('id', inscripcionId)
      .eq('estado', 'pendiente')
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      return { error: 'Esta inscripción ya fue procesada.' }
    }
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'confirmarInscripcion', error })
    return { error: 'No pudimos confirmar la inscripción, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}

// Rechaza una inscripción pendiente. Deja audit trail simétrico (rechazado_por/en).
export async function rechazarInscripcion(
  _estadoPrevio: ResultadoAccionInscripcion,
  formData: FormData,
): Promise<ResultadoAccionInscripcion> {
  const inscripcionId = String(formData.get('inscripcion_id') ?? '').trim()
  if (!UUID_REGEX.test(inscripcionId)) return { error: 'La inscripción no es válida.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('inscripciones')
      .update({
        estado: 'rechazado',
        rechazado_por: user?.id,
        rechazado_en: new Date().toISOString(),
      })
      .eq('id', inscripcionId)
      .eq('estado', 'pendiente')
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      return { error: 'Esta inscripción ya fue procesada.' }
    }
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'rechazarInscripcion', error })
    return { error: 'No pudimos rechazar la inscripción, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}

// Carga/actualiza el nivel de agresividad (dato interno, invisible al alumno).
// Upsert con inscripcion_id explícito (PK de inscripciones_datos_privados).
// RLS INSERT/UPDATE existentes limitan al profesor del aval u organizador.
export async function guardarAgresividad(
  _estadoPrevio: ResultadoAccionInscripcion,
  formData: FormData,
): Promise<ResultadoAccionInscripcion> {
  const inscripcionId = String(formData.get('inscripcion_id') ?? '').trim()
  const nivel = Number(formData.get('nivel_agresividad'))
  if (!UUID_REGEX.test(inscripcionId)) return { error: 'La inscripción no es válida.' }
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) {
    return { error: 'El nivel de agresividad debe ser un valor entre 1 y 5.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('inscripciones_datos_privados')
      .upsert({ inscripcion_id: inscripcionId, nivel_agresividad: nivel })
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'guardarAgresividad', error })
    return { error: 'No pudimos guardar el nivel de agresividad, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}