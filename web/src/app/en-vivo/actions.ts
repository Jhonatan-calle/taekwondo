'use server'

import { registrarError } from '@/lib/errores'
import { cargarBracket } from '@/lib/en_vivo/datos'
import {
  marcarResultado,
  prepararAvance,
  validarResultado,
  type ResultadoEnfrentamiento,
} from '@/lib/en_vivo'
import { createClient } from '@/lib/supabase/server'

// Acciones de la consola en vivo (jurado/organizador): cargar el resultado
// detallado de un enfrentamiento (combate/formas) y marcar una casilla como en
// curso. Ninguna usa redirect: el estado se refresca por Realtime.
//
// Escrituras SOLO vía RPC `SECURITY DEFINER` (`sincronizar_resultado_en_vivo` y
// `marcar_en_curso`), que revalidan autorización y estados. Los ids de
// enfrentamientos/llaves se conservan (upsert incremental) para que la
// suscripción realtime no pierda referencias.

export type ResultadoCargarResultado = { error?: string; ok?: boolean } | undefined

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Carga el resultado de un enfrentamiento y reconcilia la ronda siguiente.
// `formData`: torneo_id · enfrentamiento_id · ganador (id de inscripción) ·
// resultados (JSON con el contrato de `ResultadoEnfrentamiento`).
export async function registrarResultado(
  _estadoPrevio: ResultadoCargarResultado,
  formData: FormData,
): Promise<ResultadoCargarResultado> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  const enfrentamientoId = String(formData.get('enfrentamiento_id') ?? '').trim()
  const ganador = String(formData.get('ganador') ?? '').trim()
  const resultadosJson = String(formData.get('resultados') ?? '').trim()

  if (!UUID_REGEX.test(torneoId) || !UUID_REGEX.test(enfrentamientoId)) {
    return { error: 'El enfrentamiento no es válido.' }
  }
  if (!UUID_REGEX.test(ganador)) return { error: 'Elegí al ganador del enfrentamiento.' }

  let resultado: unknown
  try {
    resultado = JSON.parse(resultadosJson)
  } catch {
    return { error: 'El resultado no es válido.' }
  }

  const modalidad =
    typeof resultado === 'object' && resultado !== null
      ? String((resultado as { modalidad?: unknown }).modalidad ?? '')
      : ''
  const erroresValidacion = validarResultado(modalidad, resultado)
  if (erroresValidacion.length > 0) return { error: erroresValidacion[0] }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Iniciá sesión para cargar resultados.' }

    // 1. Torneo en vivo + rol (organizador o jurado asignado).
    const { data: torneo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('id, organizador_id, estado')
      .eq('id', torneoId)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return { error: 'El torneo no existe.' }
    if (torneo.estado !== 'en_vivo') return { error: 'El torneo no está en vivo.' }

    if (user.id !== torneo.organizador_id) {
      const { data: jurado, error: errorJurado } = await supabase
        .from('jurados_torneo')
        .select('jurado_id')
        .eq('torneo_id', torneoId)
        .eq('jurado_id', user.id)
        .maybeSingle()
      if (errorJurado) throw errorJurado
      if (!jurado) return { error: 'No tenés permiso para cargar resultados en este torneo.' }
    }

    // 2. El enfrentamiento: pertenece al torneo, no finalizado y ganador presente.
    const { data: enf, error: errorEnf } = await supabase
      .from('enfrentamientos')
      .select(`id, llave_id, participante_a, participante_b, estado`)
      .eq('id', enfrentamientoId)
      .maybeSingle()
    if (errorEnf) throw errorEnf
    if (!enf) return { error: 'El enfrentamiento no existe.' }
    if (enf.estado === 'finalizado') return { error: 'El enfrentamiento ya fue cargado.' }
    if (ganador !== enf.participante_a && ganador !== enf.participante_b) {
      return { error: 'El ganador debe ser uno de los competidores del enfrentamiento.' }
    }

    // 3. Bracket → marcar resultado en memoria → calcular avance → RPC idempotente.
    const categorias = await cargarBracket(supabase, torneoId)
    const bracketActualizado = marcarResultado(
      categorias,
      enfrentamientoId,
      ganador,
      resultado as ResultadoEnfrentamiento,
    )
    const rondas = prepararAvance(bracketActualizado)

    const { error: errorRpc } = await supabase.rpc('sincronizar_resultado_en_vivo', {
      p_torneo_id: torneoId,
      p_enfrentamiento: enfrentamientoId,
      p_ganador: ganador,
      p_resultados: resultado,
      p_rondas: rondas,
    })
    if (errorRpc) throw errorRpc

    return { ok: true }
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'registrarResultado', error })
    if (error instanceof Error && error.message) {
      const mensaje = error.message.toLowerCase()
      if (mensaje.includes('autorizado') || mensaje.includes('no tenés')) {
        return { error: 'No tenés permiso para cargar este resultado.' }
      }
      if (mensaje.includes('disponible') || mensaje.includes('no coincide')) {
        return { error: 'El enfrentamiento no está disponible para cargar resultados.' }
      }
    }
    return { error: 'No pudimos guardar el resultado, intentá de nuevo en unos minutos.' }
  }
}

// Marca un enfrentamiento como en curso (jurado/organizador del torneo).
export async function marcarEnCurso(enfrentamientoId: string): Promise<{ error?: string }> {
  if (!UUID_REGEX.test(enfrentamientoId)) return { error: 'El enfrentamiento no es válido.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Iniciá sesión para iniciar el enfrentamiento.' }

    const { error } = await supabase.rpc('marcar_en_curso', {
      p_enfrentamiento: enfrentamientoId,
    })
    if (error) throw error
    return {}
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'marcarEnCurso', error })
    return { error: 'No pudimos iniciar el enfrentamiento, intentá de nuevo en unos minutos.' }
  }
}