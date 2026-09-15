'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { crearTorneo, type ResultadoCrearTorneo } from './actions'

const inputClase =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function TorneoNuevoForm() {
  const [state, formAction] = useActionState<ResultadoCrearTorneo, FormData>(crearTorneo, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre del torneo
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="off"
          required
          className={inputClase}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha" className="text-sm font-medium">
          Fecha
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          required
          className={inputClase}
        />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <BotonEnviar />
    </form>
  )
}

function BotonEnviar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Creando…' : 'Crear torneo'}
    </Button>
  )
}