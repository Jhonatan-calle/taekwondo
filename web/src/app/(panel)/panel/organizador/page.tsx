import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { fechaLegible } from '@/lib/fechas'
import { createClient } from '@/lib/supabase/server'

import { listarTorneos } from '../datos'
import { contarConfirmadosPorTorneo } from './datos'

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

// Panel del Organizador: listado de los torneos propios (Dueño/Organizador), con la
// cantidad de inscripciones confirmadas. Los pendientes jamás llegan aquí (RLS).
export default async function OrganizadorPage() {
  const { user } = await requireProfesor()
  const supabase = await createClient()

  const torneos = await listarTorneos(supabase, user.id)
  const confirmados = await contarConfirmadosPorTorneo(
    supabase,
    torneos.map((t) => t.id),
  )

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Panel del Organizador</CardTitle>
          <CardDescription>
            Armado y edición manual de las llaves de tus torneos, alimentados solo con
            inscripciones confirmadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {torneos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no tenés torneos. Creá uno desde la sección Torneos para armar sus llaves.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {torneos.map((torneo) => (
                <li key={torneo.id} className="flex flex-col gap-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{torneo.nombre}</span>
                      <span className="text-sm text-muted-foreground">
                        {fechaLegible(torneo.fecha)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={VARIANTE_ESTADO_TORNEO[torneo.estado]}>
                        {ESTADO_TORNEO[torneo.estado]}
                      </Badge>
                      <Badge variant="success">
                        {confirmados.get(torneo.id) ?? 0} confirmado(s)
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/panel/organizador/${torneo.id}`} />}
                  >
                    Ver panel
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}