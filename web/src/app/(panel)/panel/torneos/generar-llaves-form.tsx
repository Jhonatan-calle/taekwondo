'use client'

import { useActionState } from 'react'

import { SubmitButton } from '@/components/ui/submit-button'

import { generarEmparejamiento, type ResultadoGenerarEmparejamiento } from '../actions'

// Botón "Generar llaves" por torneo (trigger mínimo del Motor de Emparejamiento).
// Solo visible para torneos del organizador en estados que admiten (re)armado.
export function GenerarLlavesForm({ torneoId }: { torneoId: string }) {
  const [state, action] = useActionState<ResultadoGenerarEmparejamiento, FormData>(
    generarEmparejamiento,
    {},
  )

  return (
    <div className="mt-2 flex flex-col gap-2">
      <form action={action} className="contents">
        <input type="hidden" name="torneo_id" value={torneoId} />
        <SubmitButton
          texto="Generar llaves"
          textoCargando="Generando…"
          variant="outline"
          className="w-auto self-start"
        />
      </form>
      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {state.error}
        </p>
      )}
    </div>
  )
}