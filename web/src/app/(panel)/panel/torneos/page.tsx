import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { fechaLegible } from '@/lib/fechas'
import { createClient } from '@/lib/supabase/server'

import { enlaceInscripcion, listarResumenLlaves, listarTorneos } from '../datos'
import { GenerarLlavesForm } from './generar-llaves-form'
import { TorneoNuevoForm } from './torneo-nuevo-form'

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

export default async function TorneosPage({
  searchParams,
}: {
  searchParams: Promise<{ llaves?: string; omitidos?: string }>
}) {
  const { user } = await requireProfesor()
  const params = await searchParams
  const supabase = await createClient()

  const torneos = await listarTorneos(supabase, user.id)
  const resumenLlaves = await listarResumenLlaves(
    supabase,
    torneos.map((t) => t.id),
  )

  const omitidos = Number(params.omitidos ?? 0)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      {params.llaves && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Las llaves se armaron correctamente.
          {omitidos > 0 && (
            <span className="mt-0.5 block text-xs text-emerald-600">
              Se omitieron {omitidos} inscripción(es) por datos incompletos. Revisá esas filas en{' '}
              <a className="underline" href="/panel/inscripciones">
                tus inscripciones
              </a>{' '}
              para completar su agresividad o datos.
            </span>
          )}
        </div>
      )}

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
                    <Badge variant={VARIANTE_ESTADO_TORNEO[torneo.estado]}>
                      {ESTADO_TORNEO[torneo.estado]}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{fechaLegible(torneo.fecha)}</span>
                  <code className="mt-1 truncate rounded-md bg-muted px-2 py-1 text-xs">
                    {enlaceInscripcion(torneo.link_token)}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Compartí este link para que tus alumnos completen su inscripción.
                  </p>
                  {(torneo.estado === 'inscripciones' || torneo.estado === 'armado_llaves') && (
                    <GenerarLlavesForm torneoId={torneo.id} />
                  )}
                  {torneo.estado === 'armado_llaves' &&
                    (resumenLlaves.get(torneo.id)?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          Llaves armadas
                        </p>
                        {(resumenLlaves.get(torneo.id) ?? []).map((cat) => (
                          <p key={cat.id} className="text-xs text-muted-foreground">
                            {cat.nombre}: {cat.enfrentamientos} enfrentamiento(s) · {cat.libres}{' '}
                            libre(s)
                          </p>
                        ))}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}