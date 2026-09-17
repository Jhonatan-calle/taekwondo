'use server'

import { redirect, unstable_rethrow } from 'next/navigation'

import { armarLlaves } from '@/lib/emparejamiento'
import type { Participante } from '@/lib/emparejamiento'
import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type ResultadoCrearTorneo = { error?: string } | undefined
export type ResultadoAccionInscripcion = { error?: string } | undefined
export type ResultadoGenerarEmparejamiento = { error?: string } | undefined

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

// Arma las llaves de un torneo: solo inscripciones confirmadas (RLS), motor de
// emparejamiento puro y persistencia atómica vía RPC generar_llaves.
// El dueño (organizador_id) ejecuta la acción; el torneo pasa a 'armado_llaves'.
export async function generarEmparejamiento(
  _estadoPrevio: ResultadoGenerarEmparejamiento,
  formData: FormData,
): Promise<ResultadoGenerarEmparejamiento> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId)) return { error: 'El torneo no es válido.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Iniciá sesión para armar las llaves.' }

    const { data: torneo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('id, estado')
      .eq('id', torneoId)
      .eq('organizador_id', user.id)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return { error: 'El torneo no existe o no tenés permisos para modificarlo.' }
    if (torneo.estado !== 'inscripciones' && torneo.estado !== 'armado_llaves') {
      return { error: 'El torneo ya está en curso o finalizado; no se pueden regenerar las llaves.' }
    }

    const { data: inscripciones, error: errorInscripciones } = await supabase
      .from('inscripciones')
      .select(`id, datos_antropometricos, inscripciones_datos_privados(nivel_agresividad)`)
      .eq('torneo_id', torneoId)
      .eq('estado', 'confirmado')
    if (errorInscripciones) throw errorInscripciones

    const filas = inscripciones ?? []
    if (filas.length === 0) {
      return { error: 'Todavía no hay inscripciones confirmadas para armar las llaves.' }
    }

    const participantes: Participante[] = []
    let sinDatos = 0
    for (const fila of filas) {
      const antro = fila.datos_antropometricos ?? {}
      const privado = Array.isArray(fila.inscripciones_datos_privados)
        ? fila.inscripciones_datos_privados[0]
        : fila.inscripciones_datos_privados

      const grado = typeof antro.grado === 'string' ? antro.grado : null
      const fechaNacimiento =
        typeof antro.fecha_nacimiento === 'string' ? antro.fecha_nacimiento : null
      const pesoKg = typeof antro.peso_kg === 'number' && antro.peso_kg > 0 ? antro.peso_kg : null
      const alturaCm =
        typeof antro.altura_cm === 'number' && antro.altura_cm > 0 ? antro.altura_cm : null
      if (!grado || !fechaNacimiento || pesoKg === null || alturaCm === null) {
        sinDatos++
        continue
      }

      participantes.push({
        inscripcionId: fila.id,
        grado,
        fechaNacimiento,
        pesoKg,
        alturaCm,
        nivelAgresividad: privado?.nivel_agresividad ?? 3,
      })
    }

    const resultado = armarLlaves(participantes)
    if (resultado.payload.categorias.length === 0) {
      return { error: 'No se pudo armar ninguna categoría con los participantes confirmados.' }
    }

    const { error: errorRpc } = await supabase.rpc('generar_llaves', {
      p_torneo_id: torneoId,
      p_categorias: resultado.payload.categorias,
    })
    if (errorRpc) throw errorRpc

    redirect(`/panel?llaves=${torneoId}&omitidos=${sinDatos}`)
  } catch (error) {
    unstable_rethrow(error)
    await registrarError({ modulo: 'emparejamiento', contexto: 'generarEmparejamiento', error })
    return { error: 'No pudimos armar las llaves, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel')
}