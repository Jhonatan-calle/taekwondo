import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from './actions'
import type { InscripcionesGrupo } from './inscripciones'
import { InscripcionesSeccion } from './inscripciones'
import { TorneoNuevoForm } from './torneo-nuevo-form'

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

type TorneoRow = {
  id: string
  nombre: string
  fecha: string
  estado: string
  link_token: string
}

const ESTADO_TORNEO: Record<string, string> = {
  borrador: 'Borrador',
  inscripciones: 'Inscripciones abiertas',
  armado_llaves: 'Armado de llaves',
  en_vivo: 'En vivo',
  finalizado: 'Finalizado',
}

const VARIANTE_ESTADO_TORNEO: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  borrador: 'default',
  inscripciones: 'success',
  armado_llaves: 'warning',
  en_vivo: 'warning',
  finalizado: 'default',
}

export default async function PanelPage() {
  const { user } = await requireProfesor()

  const supabase = await createClient()
  const [torneos, grupos] = await Promise.all([
    listarTorneos(supabase, user.id),
    listarInscripcionesAgrupadas(supabase, user.id),
  ])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Panel de Profesor</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido al panel de gestión del Módulo de Torneos.
          </p>
        </div>
        <form action={cerrarSesion}>
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscripciones para confirmar</CardTitle>
          <CardDescription>
            Confirmá el pago para otorgar tu aval oficial. El nivel de agresividad es un dato
            interno, invisible para el alumno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no tenés inscripciones como aval. Cuando un alumno complete el formulario
              con tu selección, aparecerá acá.
            </p>
          ) : (
            <InscripcionesSeccion grupos={grupos} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo torneo</CardTitle>
          <CardDescription>
            Al crearlo se genera automáticamente el link de inscripción para compartir con tus alumnos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TorneoNuevoForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus torneos</CardTitle>
        </CardHeader>
        <CardContent>
          {torneos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no creaste torneos. Usá el formulario de arriba para empezar.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {torneos.map((torneo) => (
                <li key={torneo.id} className="flex flex-col gap-1 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{torneo.nombre}</span>
                    <Badge variant={VARIANTE_ESTADO_TORNEO[torneo.estado]}>{ESTADO_TORNEO[torneo.estado]}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{fechaLegible(torneo.fecha)}</span>
                  <code className="mt-1 truncate rounded-md bg-muted px-2 py-1 text-xs">
                    {enlaceInscripcion(torneo.link_token)}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Compartí este link para que tus alumnos completen su inscripción.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

async function listarTorneos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizadorId: string,
) {
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
async function listarInscripcionesAgrupadas(
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

function fechaLegible(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${fecha}T00:00:00Z`))
}

function enlaceInscripcion(token: string): string {
  return `/t/${token}`
}