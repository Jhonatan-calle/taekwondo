// Lecturas de la Gestión en Vivo (Server). Trabaja con el cliente autenticado:
// RLS filtra (el jurado ve solo lo propio y confirmados; el organizador lo suyo).
// Devuelve el bracket en el formato del módulo puro `lib/en_vivo` para el avance,
// la consola y el historial.

import { registrarError } from '@/lib/errores'
import type { CategoriaVivo, EnfVivo, LlaveVivo, ModalidadLlave, RestoTorneo, TorneoVivo } from '@/lib/en_vivo'
import { createClient } from '@/lib/supabase/server'

export type RolEnVivo = 'organizador' | 'jurado'

export type ParticipanteVivo = {
  inscripcionId: string
  nombre: string
  grado: string | null
}

export type TorneoEnVivo = {
  torneo: TorneoVivo
  rol: RolEnVivo | null
  categorias: CategoriaVivo[]
  confirmados: ParticipanteVivo[]
}

export type JuradoTorneo = {
  id: string
  nombre: string
}

// Lee el bracket completo de BD (categorías → llaves → enfrentamientos) en el
// formato del módulo puro. Usado por el loader y por las Server Actions para
// calcular el avance.
export async function cargarBracket(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoId: string,
): Promise<CategoriaVivo[]> {
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select(
        `id, nombre,
         llaves(id, categoria_id, nombre_ronda, orden, modalidad,
           enfrentamientos(id, llave_id, participante_a, participante_b, ganador_id, tipo, estado, resultados, orden))`,
      )
      .eq('torneo_id', torneoId)
    if (error) throw error

    return (data ?? [])
      .map((cat) => {
        const llaves = Array.isArray(cat.llaves) ? cat.llaves : cat.llaves ? [cat.llaves] : []
        return {
          id: cat.id,
          nombre: cat.nombre,
          llaves: llaves
            .map((llave) => {
              const ef = Array.isArray(llave.enfrentamientos)
                ? llave.enfrentamientos
                : llave.enfrentamientos
                  ? [llave.enfrentamientos]
                  : []
              return {
                id: llave.id,
                categoriaId: llave.categoria_id,
                nombreRonda: llave.nombre_ronda,
                orden: llave.orden,
                modalidad: (llave.modalidad ?? 'combate') as ModalidadLlave,
                enfrentamientos: ef
                  .map((e) => ({
                    id: e.id,
                    orden: e.orden,
                    a: e.participante_a,
                    b: e.participante_b,
                    ganadorId: e.ganador_id,
                    tipo: e.tipo,
                    estado: e.estado,
                    resultados: e.resultados ?? {},
                  }))
                  .sort((x: EnfVivo, y: EnfVivo) => x.orden - y.orden),
              } satisfies LlaveVivo
            })
            .sort((x: LlaveVivo, y: LlaveVivo) => x.orden - y.orden),
        }
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'cargarBracket', error })
    return []
  }
}

// Snapshot de la consola en vivo para un usuario: torneo, rol detectado, bracket
// y confirmados (para resolver nombres de participantes). Devuelve null si el
// torneo no existe o el usuario no tiene acceso (organizador o jurado asignado).
export async function listarTorneoEnVivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoId: string,
  userId: string,
): Promise<TorneoEnVivo | null> {
  try {
    const { data: torneo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('id, nombre, fecha, estado, organizador_id')
      .eq('id', torneoId)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return null

    const esOrganizador = torneo.organizador_id === userId

    let esJurado = false
    if (!esOrganizador) {
      const { data: jurado, error: errorJurado } = await supabase
        .from('jurados_torneo')
        .select('jurado_id')
        .eq('torneo_id', torneoId)
        .eq('jurado_id', userId)
        .maybeSingle()
      if (errorJurado) throw errorJurado
      esJurado = Boolean(jurado)
    }

    const rol: RolEnVivo | null = esOrganizador ? 'organizador' : esJurado ? 'jurado' : null
    if (!rol) return null

    const categorias = await cargarBracket(supabase, torneoId)

    const { data: inscripciones, error: errorInscripciones } = await supabase
      .from('inscripciones')
      .select(
        `id, datos_antropometricos,
         profiles!inscripciones_alumno_id_fkey(nombre_completo)`,
      )
      .eq('torneo_id', torneoId)
      .eq('estado', 'confirmado')
    if (errorInscripciones) throw errorInscripciones

    const confirmados: ParticipanteVivo[] = (inscripciones ?? []).map((fila) => {
      const antro = fila.datos_antropometricos ?? {}
      const alumno = Array.isArray(fila.profiles) ? fila.profiles[0] : fila.profiles
      return {
        inscripcionId: fila.id,
        nombre: alumno?.nombre_completo ?? 'Alumno sin nombre',
        grado: typeof antro.grado === 'string' ? antro.grado : null,
      }
    })

    return {
      torneo: { id: torneo.id, nombre: torneo.nombre, fecha: torneo.fecha, estado: torneo.estado },
      rol,
      categorias,
      confirmados,
    }
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'listarTorneoEnVivo', error })
    return null
  }
}

// Jurados asignados al torneo (organizador). RLS: `jurados_torneo` solo se lee
// a sí mismo o al dueño; esta helper se usa en el panel del organizador.
export async function listarJurados(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoId: string,
): Promise<JuradoTorneo[]> {
  try {
    const { data, error } = await supabase
      .from('jurados_torneo')
      .select(`jurado_id, profiles(nombre_completo)`)
      .eq('torneo_id', torneoId)
      .order('jurado_id')
    if (error) throw error

    return (data ?? []).map((fila) => {
      const perfil = Array.isArray(fila.profiles) ? fila.profiles[0] : fila.profiles
      return { id: fila.jurado_id, nombre: perfil?.nombre_completo ?? 'Jurado sin nombre' }
    })
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'listarJurados', error })
    return []
  }
}

// Historial final del torneo (organizador, torneo finalizado).
export async function listarResultadosEnVivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoId: string,
): Promise<RestoTorneo[]> {
  try {
    const { data, error } = await supabase
      .from('resultados_torneo')
      .select('categoria_id, inscripcion_id, modalidad, posicion, rondas_alcanzadas, ganadas, perdidas, detalle')
      .eq('torneo_id', torneoId)
      .order('posicion', { ascending: true, nullsFirst: false })
    if (error) throw error

    return (data ?? []) as RestoTorneo[]
  } catch (error) {
    await registrarError({ modulo: 'en_vivo', contexto: 'listarResultadosEnVivo', error })
    return []
  }
}