import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { registrarError } from '@/lib/errores'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { MaestroParaInscripcion } from './actions'
import { InscripcionForm } from './inscripcion-form'

type ParametrosPagina = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ ok?: string }>
}

type ResultadoTorneo =
  | { estado: 'ok'; torneoNombre: string; torneoFecha: string; maestros: MaestroParaInscripcion[] }
  | { estado: 'error'; mensaje: string }

async function resolverInscripcion(token: string): Promise<ResultadoTorneo> {
  try {
    const { data: torneo } = await supabaseAdmin
      .from('torneos')
      .select('nombre, fecha, estado')
      .eq('link_token', token)
      .maybeSingle()

    if (!torneo) return { estado: 'error', mensaje: 'El enlace de inscripción no es válido.' }
    if (torneo.estado !== 'inscripciones') {
      return { estado: 'error', mensaje: 'Las inscripciones para este torneo están cerradas.' }
    }

    const { data: maestros } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre_completo')
      .eq('es_profesor', true)
      .order('nombre_completo')

    return {
      estado: 'ok',
      torneoNombre: torneo.nombre,
      torneoFecha: torneo.fecha,
      maestros: (maestros ?? []).map((m) => ({ id: m.id, nombre_completo: m.nombre_completo })),
    }
  } catch (error) {
    await registrarError({ modulo: 'inscripcion', contexto: 'resolverInscripcion', error })
    return { estado: 'error', mensaje: 'No pudimos cargar el formulario, intentá de nuevo en unos minutos.' }
  }
}

export default async function InscripcionPagina({ params, searchParams }: ParametrosPagina) {
  const { token } = await params
  const { ok } = await searchParams

  if (ok === '1') {
    return (
      <Mensaje
        icono="✅"
        titulo="¡Inscripción enviada!"
        texto="Tu inscripción quedó en estado pendiente. Tu maestro la confirmará tras el pago (efectivo o transferencia)."
      />
    )
  }

  const resultado = await resolverInscripcion(token)

  if (resultado.estado === 'error') {
    return <Mensaje icono="⚠️" titulo="No pudimos mostrar la inscripción" texto={resultado.mensaje} />
  }

  const fechaLegible = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${resultado.torneoFecha}T00:00:00Z`))

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Inscripción a torneo</CardTitle>
          <p className="text-sm text-muted-foreground">
            {resultado.torneoNombre} · {fechaLegible}
          </p>
        </CardHeader>
        <CardContent>
          <InscripcionForm token={token} maestros={resultado.maestros} />
        </CardContent>
      </Card>
    </main>
  )
}

function Mensaje({ icono, titulo, texto }: { icono: string; titulo: string; texto: string }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="text-4xl" role="img" aria-hidden>
            {icono}
          </span>
          <CardTitle>{titulo}</CardTitle>
          <p className="text-sm text-muted-foreground">{texto}</p>
        </CardContent>
      </Card>
    </main>
  )
}