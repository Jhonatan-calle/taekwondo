import { calcularEdad } from '@/lib/emparejamiento/reglas'
import { registrarError } from '@/lib/errores'
import type { CategoriaEditor, ParticipanteLlave } from '@/lib/llaves'
import { createClient } from '@/lib/supabase/server'

import type { TorneoRow } from '../datos'

export type { CategoriaEditor, ParticipanteLlave }

export type DetalleOrganizador = {
  torneo: TorneoRow
  confirmados: ParticipanteLlave[]
  categorias: CategoriaEditor[]
}

// Cantidad de inscripciones confirmadas por torneo (solo lecturas por RLS:
// el organizador ve exclusivamente confirmados, nunca pendientes).
export async function contarConfirmadosPorTorneo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoIds: string[],
): Promise<Map<string, number>> {
  const mapa = new Map<string, number>()
  if (torneoIds.length === 0) return mapa

  try {
    const { data, error } = await supabase
      .from('inscripciones')
      .select('torneo_id')
      .eq('estado', 'confirmado')
      .in('torneo_id', torneoIds)
    if (error) throw error

    for (const fila of data ?? []) {
      mapa.set(fila.torneo_id, (mapa.get(fila.torneo_id) ?? 0) + 1)
    }
  } catch (error) {
    await registrarError({ modulo: 'organizador', contexto: 'contarConfirmadosPorTorneo', error })
  }

  return mapa
}

// Detalle completo de un torneo para el organizador: datos del torneo + solo
// inscripciones confirmadas + las llaves armadas por categoría. Devuelve null
// si el torneo no existe o el usuario no es el dueño (organizador_id).
export async function listarDetalleOrganizador(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoId: string,
  organizadorId: string,
): Promise<DetalleOrganizador | null> {
  try {
    const { data: torneo, error: errorTorneo } = await supabase
      .from('torneos')
      .select('id, nombre, fecha, estado, link_token')
      .eq('id', torneoId)
      .eq('organizador_id', organizadorId)
      .maybeSingle()
    if (errorTorneo) throw errorTorneo
    if (!torneo) return null

    const { data: inscripciones, error: errorInscripciones } = await supabase
      .from('inscripciones')
      .select(
        `id, datos_antropometricos,
         profiles!inscripciones_alumno_id_fkey(nombre_completo),
         inscripciones_datos_privados(nivel_agresividad)`,
      )
      .eq('torneo_id', torneoId)
      .eq('estado', 'confirmado')
      .order('creado_en', { ascending: false })
    if (errorInscripciones) throw errorInscripciones

    const confirmados: ParticipanteLlave[] = (inscripciones ?? []).map((fila) => {
      const antro = fila.datos_antropometricos ?? {}
      const alumno = Array.isArray(fila.profiles) ? fila.profiles[0] : fila.profiles
      const privado = Array.isArray(fila.inscripciones_datos_privados)
        ? fila.inscripciones_datos_privados[0]
        : fila.inscripciones_datos_privados

      const fechaNacimiento =
        typeof antro.fecha_nacimiento === 'string' ? antro.fecha_nacimiento : null

      return {
        inscripcionId: fila.id,
        nombre: alumno?.nombre_completo ?? 'Alumno sin nombre',
        grado: typeof antro.grado === 'string' ? antro.grado : null,
        pesoKg: typeof antro.peso_kg === 'number' && antro.peso_kg > 0 ? antro.peso_kg : null,
        alturaCm:
          typeof antro.altura_cm === 'number' && antro.altura_cm > 0 ? antro.altura_cm : null,
        edad: fechaNacimiento ? calcularEdad(fechaNacimiento) : null,
        agresividad: privado?.nivel_agresividad ?? null,
      }
    })

    const { data: categorias, error: errorCategorias } = await supabase
      .from('categorias')
      .select(
        `id, nombre, rango_min, rango_max_especial, edad_min, edad_max,
         llaves(id, nombre_ronda, orden, enfrentamientos(id, participante_a, participante_b))`,
      )
      .eq('torneo_id', torneoId)
      .order('edad_min', { ascending: true, nullsFirst: false })
    if (errorCategorias) throw errorCategorias

    const llavesEditor: CategoriaEditor[] = (categorias ?? []).map((cat) => {
      const llaves = Array.isArray(cat.llaves) ? cat.llaves : cat.llaves ? [cat.llaves] : []
      const enfrentamientos = llaves.flatMap((llave) => {
        const ef = Array.isArray(llave.enfrentamientos)
          ? llave.enfrentamientos
          : llave.enfrentamientos
            ? [llave.enfrentamientos]
            : []
        return ef.map((e) => ({
          id: e.id,
          a: e.participante_a,
          b: e.participante_b,
        }))
      })
      return {
        id: cat.id,
        nombre: cat.nombre,
        rangoMin: cat.rango_min,
        rangoMaxEspecial: cat.rango_max_especial,
        edadMin: cat.edad_min,
        edadMax: cat.edad_max,
        enfrentamientos,
      }
    })

    return { torneo, confirmados, categorias: llavesEditor }
  } catch (error) {
    await registrarError({ modulo: 'organizador', contexto: 'listarDetalleOrganizador', error })
    return null
  }
}