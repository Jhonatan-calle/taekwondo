'use client'

import { useActionState } from 'react'

import { Badge } from '@/components/ui/badge'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { ETIQUETA_GRADO_INSCRIPCION } from '@/lib/grados'
import { edadLegible, fechaLegible } from '@/lib/fechas'

import {
  confirmarInscripcion,
  rechazarInscripcion,
  guardarAgresividad,
  type ResultadoAccionInscripcion,
} from '../actions'
import type { FilaInscripcion } from '../datos'

export type InscripcionesGrupo = {
  torneoId: string
  torneoNombre: string
  torneoFecha: string
  pendientes: FilaInscripcion[]
  confirmados: FilaInscripcion[]
  rechazados: FilaInscripcion[]
}

export function InscripcionesSeccion({ grupos }: { grupos: InscripcionesGrupo[] }) {
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <InscripcionesTorneo key={grupo.torneoId} grupo={grupo} />
      ))}
    </div>
  )
}

function InscripcionesTorneo({ grupo }: { grupo: InscripcionesGrupo }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{grupo.torneoNombre}</h3>
          <p className="text-sm text-muted-foreground">{fechaLegible(grupo.torneoFecha)}</p>
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {grupo.pendientes.length > 0 && (
            <Badge variant="warning">{grupo.pendientes.length} pendiente(s)</Badge>
          )}
          {grupo.confirmados.length > 0 && (
            <Badge variant="success">{grupo.confirmados.length} confirmado(s)</Badge>
          )}
          {grupo.rechazados.length > 0 && (
            <Badge variant="destructive">{grupo.rechazados.length} rechazado(s)</Badge>
          )}
        </div>
      </div>

      {grupo.pendientes.length > 0 && (
        <Subseccion titulo="Para confirmar">
          {grupo.pendientes.map((fila) => (
            <FilaPendiente key={fila.id} fila={fila} />
          ))}
        </Subseccion>
      )}

      {grupo.confirmados.length > 0 && (
        <Subseccion titulo="Confirmados">
          {grupo.confirmados.map((fila) => (
            <FilaConfirmado key={fila.id} fila={fila} />
          ))}
        </Subseccion>
      )}

      {grupo.rechazados.length > 0 && (
        <Subseccion titulo="Rechazados">
          {grupo.rechazados.map((fila) => (
            <FilaRechazado key={fila.id} fila={fila} />
          ))}
        </Subseccion>
      )}
    </div>
  )
}

function Subseccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-t pt-3 first:mt-0 first:border-t-0 first:pt-0">
      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">{titulo}</p>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

// --- Filas por estado ---

function FilaPendiente({ fila }: { fila: FilaInscripcion }) {
  const [estadoConf, actionConf] = useActionState<ResultadoAccionInscripcion, FormData>(
    confirmarInscripcion,
    {},
  )
  const [estadoRech, actionRech] = useActionState<ResultadoAccionInscripcion, FormData>(
    rechazarInscripcion,
    {},
  )

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <FilaDatos fila={fila} />

      {estadoConf?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{estadoConf.error}</p>}
      {estadoRech?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{estadoRech.error}</p>}

      <div className="flex gap-2">
        <form action={actionConf} className="contents">
          <input type="hidden" name="inscripcion_id" value={fila.id} />
          <SubmitButton texto="Confirmar pago" textoCargando="Confirmando…" className="w-auto flex-1" />
        </form>
        <form action={actionRech} className="contents">
          <input type="hidden" name="inscripcion_id" value={fila.id} />
          <SubmitButton texto="Rechazar" textoCargando="Rechazando…" variant="outline" className="w-auto flex-1 border-destructive/30 text-destructive hover:bg-destructive/5" />
        </form>
      </div>
    </div>
  )
}

function FilaConfirmado({ fila }: { fila: FilaInscripcion }) {
  const [estado, action] = useActionState<ResultadoAccionInscripcion, FormData>(
    guardarAgresividad,
    {},
  )

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <FilaDatos fila={fila} />
      <div className="flex items-center gap-2 border-t pt-2">
        <form action={action} className="contents">
          <input type="hidden" name="inscripcion_id" value={fila.id} />
          <FormField label="Agresividad (1–5)" htmlFor={`agresividad-${fila.id}`} className="m-0 w-32">
            <Select
              id={`agresividad-${fila.id}`}
              name="nivel_agresividad"
              defaultValue={String(fila.nivelAgresividad ?? 3)}
            >
              <option value="1">1 – Muy baja</option>
              <option value="2">2 – Baja</option>
              <option value="3">3 – Media</option>
              <option value="4">4 – Alta</option>
              <option value="5">5 – Muy alta</option>
            </Select>
          </FormField>
          <SubmitButton texto="Guardar" textoCargando="Guardando…" className="mt-auto w-auto self-end" />
        </form>
      </div>
      {estado?.error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{estado.error}</p>}
    </div>
  )
}

function FilaRechazado({ fila }: { fila: FilaInscripcion }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-destructive/10 bg-destructive/5 p-3">
      <FilaDatos fila={fila} />
    </div>
  )
}

// --- Componentes compartidos ---

function FilaDatos({ fila }: { fila: FilaInscripcion }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{fila.alumnoNombre}</span>
      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {fila.grado && <Badge>{ETIQUETA_GRADO_INSCRIPCION[fila.grado] ?? fila.grado}</Badge>}
        {fila.pesoKg != null && <span>{fila.pesoKg} kg</span>}
        {fila.alturaCm != null && <span>{fila.alturaCm} cm</span>}
        {fila.fechaNacimiento && <span>{edadLegible(fila.fechaNacimiento)}</span>}
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={fila.estado === 'confirmado' ? 'success' : fila.estado === 'rechazado' ? 'destructive' : 'warning'}>
          {fila.estado === 'pendiente' ? 'Pendiente' : fila.estado === 'confirmado' ? 'Confirmado' : 'Rechazado'}
        </Badge>
        {fila.nivelAgresividad != null && fila.estado !== 'pendiente' && (
          <span>Agresividad: {fila.nivelAgresividad}/5</span>
        )}
      </span>
    </div>
  )
}