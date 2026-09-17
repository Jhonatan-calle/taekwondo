import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { listarInscripcionesAgrupadas, listarTorneos } from './datos'

const ESTADO_TORNEO: Record<string, string> = {
  borrador: 'Borrador',
  inscripciones: 'Inscripciones',
  armado_llaves: 'Armado de llaves',
  en_vivo: 'En vivo',
  finalizado: 'Finalizado',
}

export default async function PanelResumenPage() {
  const { user } = await requireProfesor()
  const supabase = await createClient()

  const [torneos, grupos] = await Promise.all([
    listarTorneos(supabase, user.id),
    listarInscripcionesAgrupadas(supabase, user.id),
  ])

  const pendientes = grupos.reduce((total, g) => total + g.pendientes.length, 0)
  const confirmados = grupos.reduce((total, g) => total + g.confirmados.length, 0)
  const rechazados = grupos.reduce((total, g) => total + g.rechazados.length, 0)

  const torneosPorEstado = new Map<string, number>()
  for (const torneo of torneos) {
    torneosPorEstado.set(torneo.estado, (torneosPorEstado.get(torneo.estado) ?? 0) + 1)
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>
            Estado general de tus torneos e inscripciones como aval.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat valor={pendientes} etiqueta="Pendientes" />
            <Stat valor={confirmados} etiqueta="Confirmados" />
            <Stat valor={rechazados} etiqueta="Rechazados" />
          </div>

          <div className="flex flex-col gap-1 rounded-xl bg-muted/50 p-3 text-sm">
            {torneos.length === 0 ? (
              <p className="text-muted-foreground">
                Todavía no creaste torneos. Usá la sección Torneos para empezar.
              </p>
            ) : (
              Array.from(torneosPorEstado.entries()).map(([estado, cantidad]) => (
                <p key={estado} className="text-muted-foreground">
                  {ESTADO_TORNEO[estado] ?? estado}: <span className="font-medium">{cantidad}</span>
                </p>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/panel/inscripciones" />}>Ir a Inscripciones</Button>
            <Button variant="outline" render={<Link href="/panel/torneos" />}>
              Ir a Torneos
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function Stat({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="flex flex-col rounded-xl border p-3">
      <span className="text-2xl font-semibold">{valor}</span>
      <span className="text-xs uppercase text-muted-foreground">{etiqueta}</span>
    </div>
  )
}