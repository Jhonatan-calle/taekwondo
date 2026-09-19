'use server'

import { redirect, unstable_rethrow } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { registrarError } from '@/lib/errores'
import { construirHistorial } from '@/lib/en_vivo'
import { cargarBracket } from '@/lib/en_vivo/datos'
import { createClient } from '@/lib/supabase/server'

// Acciones del organizador para la Gestión en Vivo. Todas validan dueño
// (organizador_id) y flujo de estado; las escrituras sensibles (crear llave de
// Formas, finalizar) van por RPC `SECURITY DEFINER` como defensa en profundidad.

export type ResultadoAccionOrganizadorEnVivo = { error?: string } | undefined

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Verifica que el usuario sea el dueño del torneo y lo devuelve.
async function obtenerTorneoPropio(supabase: Awaited<ReturnType<typeof createClient>>, torneoId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: torneo, error } = await supabase
    .from('torneos')
    .select('id, estado, organizador_id')
    .eq('id', torneoId)
    .maybeSingle()
  if (error) throw error
  if (!torneo || torneo.organizador_id !== user.id) return null
  return torneo
}

// Transición armado_llaves → en_vivo (la política existente
// torneos_update_organizador cubre el UPDATE; aquí validamos el estado).
export async function iniciarTorneoEnVivo(
  _estadoPrevio: ResultadoAccionOrganizadorEnVivo,
  formData: FormData,
): Promise<ResultadoAccionOrganizadorEnVivo> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId)) return { error: 'El torneo no es válido.' }

  try {
    const supabase = await createClient()
    const torneo = await obtenerTorneoPropio(supabase, torneoId)
    if (!torneo) return { error: 'El torneo no existe o no lo administrás.' }
    if (torneo.estado !== 'armado_llaves') {
      return { error: 'El torneo debe estar en etapa de armado de llaves para iniciar.' }
    }

    const { error } = await supabase.from('torneos').update({ estado: 'en_vivo' }).eq('id', torneoId)
    if (error) throw error
  } catch (error) {
    unstable_rethrow(error)
    await registrarError({ modulo: 'en_vivo', contexto: 'iniciarTorneoEnVivo', error })
    return { error: 'No pudimos iniciar el torneo, intentá de nuevo en unos minutos.' }
  }

  redirect(`/panel/en-vivo/${torneoId}`)
}

// Calcula el historial (podio 3º compartido + stats) y lo persiste vía RPC
// `finalizar_torneo` (idempotente). El torneo pasa a `finalizado`.
export async function finalizarTorneoEnVivo(
  _estadoPrevio: ResultadoAccionOrganizadorEnVivo,
  formData: FormData,
): Promise<ResultadoAccionOrganizadorEnVivo> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId)) return { error: 'El torneo no es válido.' }

  try {
    const supabase = await createClient()
    const torneo = await obtenerTorneoPropio(supabase, torneoId)
    if (!torneo) return { error: 'El torneo no existe o no lo administrás.' }
    if (torneo.estado !== 'en_vivo') return { error: 'El torneo no está en vivo.' }

    const categorias = await cargarBracket(supabase, torneoId)
    const historial = construirHistorial(torneoId, categorias)

    const { error: errorRpc } = await supabase.rpc('finalizar_torneo', {
      p_torneo_id: torneoId,
      p_historial: historial,
    })
    if (errorRpc) throw errorRpc
  } catch (error) {
    unstable_rethrow(error)
    await registrarError({ modulo: 'en_vivo', contexto: 'finalizarTorneoEnVivo', error })
    return { error: 'No pudimos finalizar el torneo, intentá de nuevo en unos minutos.' }
  }

  revalidatePath(`/panel/en-vivo/${torneoId}`)
  return {}
}

// Asigna un jurado al torneo por id de perfil (autocomplete de buscarPerfiles).
export async function asignarJurado(
  _estadoPrevio: ResultadoAccionOrganizadorEnVivo,
  formData: FormData,
): Promise<ResultadoAccionOrganizadorEnVivo> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  const profileId = String(formData.get('perfil_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId) || !UUID_REGEX.test(profileId)) {
    return { error: 'Los datos del jurado no son válidos.' }
  }

  try {
    const supabase = await createClient()
    const torneo = await obtenerTorneoPropio(supabase, torneoId)
    if (!torneo) return { error: 'El torneo no existe o no lo administrás.' }

    const { error } = await supabase.from('jurados_torneo').insert({
      torneo_id: torneoId,
      jurado_id: profileId,
    })
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'asignarJurado', error })
    if (error instanceof Error && error.message.includes('duplicate')) {
      return { error: 'Ese perfil ya es jurado de este torneo.' }
    }
    return { error: 'No pudimos asignar el jurado, intentá de nuevo en unos minutos.' }
  }

  revalidatePath(`/panel/en-vivo/${torneoId}`)
  return {}
}

// Quita un jurado del torneo.
export async function quitarJurado(
  _estadoPrevio: ResultadoAccionOrganizadorEnVivo,
  formData: FormData,
): Promise<ResultadoAccionOrganizadorEnVivo> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  const juradoId = String(formData.get('jurado_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId) || !UUID_REGEX.test(juradoId)) {
    return { error: 'Los datos del jurado no son válidos.' }
  }

  try {
    const supabase = await createClient()
    const torneo = await obtenerTorneoPropio(supabase, torneoId)
    if (!torneo) return { error: 'El torneo no existe o no lo administrás.' }

    const { error } = await supabase
      .from('jurados_torneo')
      .delete()
      .eq('torneo_id', torneoId)
      .eq('jurado_id', juradoId)
    if (error) throw error
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'quitarJurado', error })
    return { error: 'No pudimos quitar el jurado, intentá de nuevo en unos minutos.' }
  }

  revalidatePath(`/panel/en-vivo/${torneoId}`)
  return {}
}

// Búsqueda de perfiles para el autocomplete de jurados (nombre completo ILIKE).
// `profiles_select_authenticated` permite SELECT a usuarios autenticados.
export async function buscarPerfiles(query: string): Promise<{ id: string; nombre: string }[]> {
  const termino = String(query ?? '').trim()
  if (termino.length < 3) return []

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo')
      .ilike('nombre_completo', `%${termino}%`)
      .limit(8)
    if (error) throw error
    return (data ?? []).map((p) => ({ id: p.id, nombre: p.nombre_completo }))
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'buscarPerfiles', error })
    return []
  }
}

// Arma la llave de Formas (tul) de una categoría con sus participantes de combate.
// El RPC `crear_llave_tul` valida etapa (armado_llaves), dueño y confirmados.
export async function crearLlaveFormas(
  _estadoPrevio: ResultadoAccionOrganizadorEnVivo,
  formData: FormData,
): Promise<ResultadoAccionOrganizadorEnVivo> {
  const torneoId = String(formData.get('torneo_id') ?? '').trim()
  const categoriaId = String(formData.get('categoria_id') ?? '').trim()
  if (!UUID_REGEX.test(torneoId) || !UUID_REGEX.test(categoriaId)) {
    return { error: 'Los datos de la categoría no son válidos.' }
  }

  try {
    const supabase = await createClient()
    const torneo = await obtenerTorneoPropio(supabase, torneoId)
    if (!torneo) return { error: 'El torneo no existe o no lo administrás.' }

    const { data: categoria, error: errorCategoria } = await supabase
      .from('categorias')
      .select(
        `id, torneo_id,
         llaves(modalidad, orden, enfrentamientos(participante_a, participante_b))`,
      )
      .eq('id', categoriaId)
      .eq('torneo_id', torneoId)
      .maybeSingle()
    if (errorCategoria) throw errorCategoria
    if (!categoria) return { error: 'La categoría no pertenece a este torneo.' }

    const participantes = new Set<string>()
    const llaves = Array.isArray(categoria.llaves) ? categoria.llaves : categoria.llaves ? [categoria.llaves] : []
    const rondaCombate = llaves
      .filter((l: { modalidad: string }) => (l.modalidad ?? 'combate') === 'combate')
      .sort((x: { orden: number }, y: { orden: number }) => x.orden - y.orden)[0]
    if (rondaCombate) {
      const ef = Array.isArray(rondaCombate.enfrentamientos)
        ? rondaCombate.enfrentamientos
        : rondaCombate.enfrentamientos
          ? [rondaCombate.enfrentamientos]
          : []
      for (const e of ef) {
        if (e.participante_a) participantes.add(e.participante_a)
        if (e.participante_b) participantes.add(e.participante_b)
      }
    }
    if (participantes.size === 0) return { error: 'La categoría no tiene participantes.' }

    const { error: errorRpc } = await supabase.rpc('crear_llave_tul', {
      p_torneo_id: torneoId,
      p_categoria_id: categoriaId,
      p_participantes: Array.from(participantes),
    })
    if (errorRpc) throw errorRpc
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'crearLlaveFormas', error })
    if (error instanceof Error && error.message) {
      const mensaje = error.message.toLowerCase()
      if (mensaje.includes('ya fue creada')) return { error: 'La llave de Formas de esta categoría ya fue creada.' }
      if (mensaje.includes('armado')) return { error: 'Las Formas solo pueden armarse en la etapa de armado.' }
    }
    return { error: 'No pudimos armar la llave de Formas, intentá de nuevo en unos minutos.' }
  }

  revalidatePath(`/panel/en-vivo/${torneoId}`)
  return {}
}