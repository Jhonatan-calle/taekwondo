import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireProfesor } from '@/lib/auth'
import { fechaLegible } from '@/lib/fechas'
import { ETIQUETA_GRADO_INSCRIPCION } from '@/lib/grados'
import type { CategoriaEditor, ParticipanteLlave } from '@/lib/llaves'
import { createClient } from '@/lib/supabase/server'

import { listarDetalleOrganizador } from '../datos'
import { EditorLlaves } from '../editor-llaves'

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

export default async function OrganizadorDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ torneoId: string }>
  searchParams: Promise<{ guardadas?: string }>
}) {
  const { user } = await requireProfesor()
  const { torneoId } = await params
  const { guardadas } = await searchParams
  const supabase = await createClient()

  const detalle = await listarDetalleOrganizador(supabase, torneoId, user.id)
  if (!detalle) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              El torneo no existe o no tenés permisos para verlo.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const { torneo, confirmados, categorias } = detalle
  const llavesEditables = torneo.estado === 'armado_llaves'
  const esLectura = torneo.estado === 'en_vivo' || torneo.estado === 'finalizado'

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      {guardadas && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Los cambios en las llaves se guardaron correctamente.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{torneo.nombre}</CardTitle>
          <CardDescription>
            {fechaLegible(torneo.fecha)} · Panel del organizador. Alimentado solo con inscripciones
            confirmadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant={VARIANTE_ESTADO_TORNEO[torneo.estado]}>
            {ESTADO_TORNEO[torneo.estado]}
          </Badge>
          <Badge variant="success">{confirmados.length} confirmado(s)</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participantes confirmados</CardTitle>
          <CardDescription>
            {confirmados.length} competidor(es) avalados por sus maestros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay inscripciones confirmadas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {confirmados.map((participante) => (
                <FilaConfirmado key={participante.inscripcionId} participante={participante} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Llaves</CardTitle>
          <CardDescription>
            {llavesEditables
              ? 'Edición manual con control total del organizador. Mové, reemplazá o liberá participantes y guarda los cambios.'
              : esLectura
                ? 'Vista de solo lectura, el torneo ya está en curso o finalizado.'
                : 'Las llaves se generan por categoría desde la sección Torneos.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {esLectura ? (
            <LlavesLectura categorias={categorias} confirmados={confirmados} />
          ) : llavesEditables ? (
            <EditorLlaves
              torneoId={torneo.id}
              categoriasIniciales={categorias}
              confirmados={confirmados}
            />
          ) : (
            <p className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
              <span>Todavía no hay llaves armadas.</span>
              <Button variant="outline" nativeButton={false} render={<Link href="/panel/torneos" />}>
                Ir a Torneos para armarlas
              </Button>
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function FilaConfirmado({ participante }: { participante: ParticipanteLlave }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-lg border p-3">
      <span className="font-medium">{participante.nombre}</span>
      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {participante.grado && (
          <Badge>{ETIQUETA_GRADO_INSCRIPCION[participante.grado] ?? participante.grado}</Badge>
        )}
        {participante.pesoKg != null && <span>{participante.pesoKg} kg</span>}
        {participante.alturaCm != null && <span>{participante.alturaCm} cm</span>}
        {participante.edad != null && <span>{participante.edad} años</span>}
      </span>
      {participante.agresividad != null && (
        <span className="text-xs text-muted-foreground">
          Agresividad (interno): {participante.agresividad}/5
        </span>
      )}
    </li>
  )
}

function LlavesLectura({
  categorias,
  confirmados,
}: {
  categorias: CategoriaEditor[]
  confirmados: ParticipanteLlave[]
}) {
  const porId = new Map(confirmados.map((p) => [p.inscripcionId, p]))

  if (categorias.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay llaves armadas.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {categorias.map((categoria) => (
        <section key={categoria.id} className="flex flex-col gap-1.5">
          <h3 className="text-sm font-semibold">{categoria.nombre}</h3>
          {categoria.enfrentamientos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin enfrentamientos.</p>
          ) : (
            categoria.enfrentamientos.map((enfrentamiento) => {
              const a = enfrentamiento.a ? porId.get(enfrentamiento.a) : undefined
              const b = enfrentamiento.b ? porId.get(enfrentamiento.b) : undefined
              return (
                <p key={enfrentamiento.id} className="rounded-lg border p-2.5 text-sm">
                  <span className="font-medium">{a?.nombre ?? '—'}</span>
                  <span className="mx-1 text-muted-foreground">vs</span>
                  <span className="font-medium">{b?.nombre ?? 'Libre (bye)'}</span>
                </p>
              )
            })
          )}
        </section>
      ))}
    </div>
  )
}