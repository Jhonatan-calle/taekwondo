'use client'

import { useActionState } from 'react'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SubmitButton } from '@/components/ui/submit-button'
import { ETIQUETA_GRADO_INSCRIPCION, GRADOS_INSCRIPCION } from '@/lib/grados'
import { registrarInscripcion, type MaestroParaInscripcion, type ResultadoInscripcion } from './actions'

type Props = {
  token: string
  maestros: MaestroParaInscripcion[]
}

export function InscripcionForm({ token, maestros }: Props) {
  const [state, formAction] = useActionState<ResultadoInscripcion, FormData>(registrarInscripcion, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <FormField label="Nombre completo" htmlFor="nombre">
        <Input id="nombre" name="nombre" type="text" autoComplete="name" required />
      </FormField>

      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>

      <FormField label="Fecha de nacimiento" htmlFor="fecha_nacimiento">
        <Input id="fecha_nacimiento" name="fecha_nacimiento" type="date" autoComplete="bday" required />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Peso (kg)" htmlFor="peso_kg">
          <Input
            id="peso_kg"
            name="peso_kg"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            required
          />
        </FormField>
        <FormField label="Altura (cm)" htmlFor="altura_cm">
          <Input
            id="altura_cm"
            name="altura_cm"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            required
          />
        </FormField>
      </div>

      <FormField label="Cinturón actual" htmlFor="grado">
        <Select id="grado" name="grado" required defaultValue="">
          <option value="" disabled>
            Seleccioná tu cinturón
          </option>
          {GRADOS_INSCRIPCION.map((grado) => (
            <option key={grado} value={grado}>
              {ETIQUETA_GRADO_INSCRIPCION[grado]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Tu maestro" htmlFor="maestro_id">
        <Select id="maestro_id" name="maestro_id" required defaultValue="">
          <option value="" disabled>
            Seleccioná tu maestro
          </option>
          {maestros.map((maestro) => (
            <option key={maestro.id} value={maestro.id}>
              {maestro.nombre_completo}
            </option>
          ))}
        </Select>
      </FormField>

      <p className="text-xs text-muted-foreground">
        El costo de la inscripción se abona directamente a tu maestro (efectivo o transferencia),
        fuera de esta plataforma. Tu profesor confirmará tu participación.
      </p>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <SubmitButton texto="Enviar inscripción" />
    </form>
  )
}