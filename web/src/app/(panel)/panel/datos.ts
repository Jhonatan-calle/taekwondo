import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'

export type EstadoInscripcion = 'pendiente' | 'confirmado' | 'rechazado'

export type FilaInscripcion = {
  id: string
  alumnoNombre: string
  grado: string | null
  fechaNacimiento: string | null
  pesoKg: number | null
  alturaCm: number | null
  estado: EstadoInscripcion
  nivelAgresividad: number | null
}

export type InscripcionesGrupo = {
  torneoId: string
  torneoNombre: string
  torneoFecha: string
  pendientes: FilaInscripcion[]
  confirmados: FilaInscripcion[]
  rechazados: FilaInscripcion[]
}

export type TorneoRow = {
  id: string
  nombre: string
  fecha: string
  estado: string
  link_token: string
}

export type CategoriaLigera = {
  id: string
  nombre: string
  torneo_id: string
  enfrentamientos: number
  libres: number
}

export async function listarTorneos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizadorId: string,
): Promise<TorneoRow[]> {
  try {
    const { data, error } = await supabase
      .from('torneos')
      .select('id, nombre, fecha, estado, link_token')
      .eq('organizador_id', organizadorId)
      .order('fecha', { ascending: false })
    if (error) throw error
    return (data ?? []) as TorneoRow[]
  } catch (error) {
    await registrarError({ modulo: 'torneos', contexto: 'listarTorneos', error })
    return []
  }
}

// Inscripciones donde el profesor es AVAL (profesor_id), agrupadas por torneo y estado.
// El embed de `profiles` se desambigua con la FK del alumno (inscripciones_alumno_id_fkey).
export async function listarInscripcionesAgrupadas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profesorId: string,
): Promise<InscripcionesGrupo[]> {
  try {
    const { data, error } = await supabase
      .from('inscripciones')
      .select(
        `id, estado, datos_antropometricos, creado_en, confirmado_en,
         torneos(id, nombre, fecha),
         profiles!inscripciones_alumno_id_fkey(nombre_completo),
         inscripciones_datos_privados(nivel_agresividad)`,
      )
      .eq('profesor_id', profesorId)
      .order('creado_en', { ascending: false })
    if (error) throw error

    const grupos = new Map<string, InscripcionesGrupo>()

    for (const fila of data ?? []) {
      const torneo = Array.isArray(fila.torneos) ? fila.torneos[0] : fila.torneos
      if (!torneo) continue

      let grupo = grupos.get(torneo.id)
      if (!grupo) {
        grupo = {
          torneoId: torneo.id,
          torneoNombre: torneo.nombre,
          torneoFecha: torneo.fecha,
          pendientes: [],
          confirmados: [],
          rechazados: [],
        }
        grupos.set(torneo.id, grupo)
      }

      const antro = fila.datos_antropometricos ?? {}
      const alumno = Array.isArray(fila.profiles) ? fila.profiles[0] : fila.profiles
      const privado = Array.isArray(fila.inscripciones_datos_privados)
        ? fila.inscripciones_datos_privados[0]
        : fila.inscripciones_datos_privados

      const item: FilaInscripcion = {
        id: fila.id,
        alumnoNombre: alumno?.nombre_completo ?? 'Alumno sin nombre',
        grado: typeof antro.grado === 'string' ? antro.grado : null,
        fechaNacimiento:
          typeof antro.fecha_nacimiento === 'string' ? antro.fecha_nacimiento : null,
        pesoKg: typeof antro.peso_kg === 'number' ? antro.peso_kg : null,
        alturaCm: typeof antro.altura_cm === 'number' ? antro.altura_cm : null,
        estado: fila.estado as EstadoInscripcion,
        nivelAgresividad: privado?.nivel_agresividad ?? null,
      }

      if (item.estado === 'confirmado') grupo.confirmados.push(item)
      else if (item.estado === 'rechazado') grupo.rechazados.push(item)
      else grupo.pendientes.push(item)
    }

    return Array.from(grupos.values()).sort(
      (a, b) => new Date(b.torneoFecha).getTime() - new Date(a.torneoFecha).getTime(),
    )
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'listarInscripcionesAgrupadas', error })
    return []
  }
}

// Resumen de llaves por torneo (solo lectura, RLS organizador). Sirve para la card
// "Tus torneos": por categoría, cantidad de enfrentamientos y libres (byes).
export async function listarResumenLlaves(
  supabase: Awaited<ReturnType<typeof createClient>>,
  torneoIds: string[],
): Promise<Map<string, CategoriaLigera[]>> {
  const mapa = new Map<string, CategoriaLigera[]>()
  if (torneoIds.length === 0) return mapa

  try {
    const { data, error } = await supabase
      .from('categorias')
      .select(`id, nombre, torneo_id, llaves(enfrentamientos(id, participante_a, participante_b))`)
      .in('torneo_id', torneoIds)
    if (error) throw error

    for (const fila of data ?? []) {
      const llaves = Array.isArray(fila.llaves) ? fila.llaves : fila.llaves ? [fila.llaves] : []
      let enfrentamientos = 0
      let libres = 0
      for (const llave of llaves) {
        const ef = Array.isArray(llave.enfrentamientos)
          ? llave.enfrentamientos
          : llave.enfrentamientos
            ? [llave.enfrentamientos]
            : []
        for (const e of ef) {
          if (e.participante_b) enfrentamientos++
          else libres++
        }
      }
      const lista = mapa.get(fila.torneo_id) ?? []
      lista.push({
        id: fila.id,
        nombre: fila.nombre,
        torneo_id: fila.torneo_id,
        enfrentamientos,
        libres,
      })
      mapa.set(fila.torneo_id, lista)
    }
  } catch (error) {
    await registrarError({ modulo: 'emparejamiento', contexto: 'listarResumenLlaves', error })
  }

  return mapa
}

export function enlaceInscripcion(token: string): string {
  return `/t/${token}`
}