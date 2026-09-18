'use server'

import { redirect, unstable_rethrow } from 'next/navigation'

import { registrarError } from '@/lib/errores'
import { parsePayload, validarReglasLlaves } from '@/lib/llaves'
import { createClient } from '@/lib/supabase/server'

export type ResultadoGuardarLlavesManuales = { error?: string } | undefined

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Persiste el estado final de las llaves editadas manualmente por el organizador.
// El editor invía el bracket completo (mismo contrato jsonb que generar_llaves) y
// el RPC guardar_llaves_manuales lo reemplaza de forma atómica (SRS B.2.3).
export async function guardarLlavesManuales(
  _estadoPrevio: ResultadoGuardarLlavesManuales,
  formData: FormData,
): Promise<ResultadoGuardarLlavesManuales> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  const payloadJson = String(formData.get('payload') ?? '').trim()
  if (!UUID_REGEX.test(torneoId)) return { error: 'El torneo no es válido.' }

  const payload = parsePayload(payloadJson)
  if (!payload) return { error: 'Los datos de las llaves no son válidos.' }

  const reglasVioladas = validarReglasLlaves(payload)
  if (reglasVioladas.length > 0) return { error: reglasVioladas[0] }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Iniciá sesión para modificar las llaves.' }

    const { data: torneo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('id, estado')
      .eq('id', torneoId)
      .eq('organizador_id', user.id)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return { error: 'El torneo no existe o no tenés permisos para modificarlo.' }
    if (torneo.estado !== 'armado_llaves') {
      return { error: 'El torneo ya está en curso o finalizado; no se pueden modificar las llaves.' }
    }

    const { error: errorRpc } = await supabase.rpc('guardar_llaves_manuales', {
      p_torneo_id: torneoId,
      p_categorias: payload.categorias,
    })
    if (errorRpc) throw errorRpc

    redirect(`/panel/organizador/${torneoId}?guardadas=1`)
  } catch (error) {
    unstable_rethrow(error)
    await registrarError({ modulo: 'organizador', contexto: 'guardarLlavesManuales', error })
    return { error: 'No pudimos guardar los cambios en las llaves, intentá de nuevo en unos minutos.' }
  }

  redirect('/panel/organizador')
}