import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { registrarError } from '@/lib/errores'
import { createClient } from '@/lib/supabase/server'
import { cerrarSesion } from './actions'
import { TorneoNuevoForm } from './torneo-nuevo-form'

const ESTADO_TORNEO: Record<string, string> = {
  borrador: 'Borrador',
  inscripciones: 'Inscripciones abiertas',
  armado_llaves: 'Armado de llaves',
  en_vivo: 'En vivo',
  finalizado: 'Finalizado',
}

export default async function PanelPage() {
  const { user } = await requireProfesor()

  const supabase = await createClient()
  const torneos = await listarTorneos(supabase, user.id)

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
          <CardTitle>Nuevo torneo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Al crearlo se genera automáticamente el link de inscripción para compartir con tus alumnos.
          </p>
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
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {ESTADO_TORNEO[torneo.estado] ?? torneo.estado}
                    </span>
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

async function listarTorneos(supabase: Awaited<ReturnType<typeof createClient>>, organizadorId: string) {
  try {
    const { data, error } = await supabase
      .from('torneos')
      .select('id, nombre, fecha, estado, link_token')
      .eq('organizador_id', organizadorId)
      .order('fecha', { ascending: false })
    if (error) throw error
    return data ?? []
  } catch (error) {
    await registrarError({ modulo: 'torneos', contexto: 'listarTorneos', error })
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