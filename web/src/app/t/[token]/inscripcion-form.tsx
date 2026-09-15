'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { ETIQUETA_GRADO_INSCRIPCION, GRADOS_INSCRIPCION } from '@/lib/grados'
import { registrarInscripcion, type MaestroParaInscripcion, type ResultadoInscripcion } from './actions'

type Props = {
  token: string
  maestros: MaestroParaInscripcion[]
}

const inputClase =
  'rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function InscripcionForm({ token, maestros }: Props) {
  const [state, formAction] = useActionState<ResultadoInscripcion, FormData>(registrarInscripcion, {})

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium">
          Nombre completo
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          className={inputClase}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClase}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha_nacimiento" className="text-sm font-medium">
          Fecha de nacimiento
        </label>
        <input
          id="fecha_nacimiento"
          name="fecha_nacimiento"
          type="date"
          autoComplete="bday"
          required
          className={inputClase}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="peso_kg" className="text-sm font-medium">
            Peso (kg)
          </label>
          <input
            id="peso_kg"
            name="peso_kg"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            required
            className={inputClase}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="altura_cm" className="text-sm font-medium">
            Altura (cm)
          </label>
          <input
            id="altura_cm"
            name="altura_cm"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            required
            className={inputClase}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grado" className="text-sm font-medium">
          Cinturón actual
        </label>
        <select id="grado" name="grado" required defaultValue="" className={inputClase}>
          <option value="" disabled>
            Seleccioná tu cinturón
          </option>
          {GRADOS_INSCRIPCION.map((grado) => (
            <option key={grado} value={grado}>
              {ETIQUETA_GRADO_INSCRIPCION[grado]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="maestro_id" className="text-sm font-medium">
          Tu maestro
        </label>
        <select id="maestro_id" name="maestro_id" required defaultValue="" className={inputClase}>
          <option value="" disabled>
            Seleccioná tu maestro
          </option>
          {maestros.map((maestro) => (
            <option key={maestro.id} value={maestro.id}>
              {maestro.nombre_completo}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        El costo de la inscripción se abona directamente a tu maestro (efectivo o transferencia),
        fuera de esta plataforma. Tu profesor confirmará tu participación.
      </p>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <BotonEnviar texto="Enviar inscripción" />
    </form>
  )
}

function BotonEnviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Procesando…' : texto}
    </Button>
  )
}