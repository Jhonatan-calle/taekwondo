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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Inscripción a torneo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {resultado.torneoNombre} · {fechaLegible}
        </p>
      </div>
      <InscripcionForm token={token} maestros={resultado.maestros} />
    </main>
  )
}

function Mensaje({ icono, titulo, texto }: { icono: string; titulo: string; texto: string }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-4xl" role="img" aria-hidden>
        {icono}
      </span>
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </main>
  )
}