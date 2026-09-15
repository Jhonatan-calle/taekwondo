'use client'

import { useActionState } from 'react'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { crearTorneo, type ResultadoCrearTorneo } from './actions'

export function TorneoNuevoForm() {
  const [state, formAction] = useActionState<ResultadoCrearTorneo, FormData>(crearTorneo, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Nombre del torneo" htmlFor="nombre">
        <Input id="nombre" name="nombre" type="text" autoComplete="off" required />
      </FormField>
      <FormField label="Fecha" htmlFor="fecha">
        <Input id="fecha" name="fecha" type="date" required />
      </FormField>
      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton texto="Crear torneo" textoCargando="Creando…" />
    </form>
  )
}