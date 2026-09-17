import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

import { listarInscripcionesAgrupadas } from '../datos'
import { InscripcionesSeccion } from './seccion'

export default async function InscripcionesPage() {
  const { user } = await requireProfesor()
  const supabase = await createClient()
  const grupos = await listarInscripcionesAgrupadas(supabase, user.id)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
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
    </main>
  )
}