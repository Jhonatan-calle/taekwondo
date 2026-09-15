'use client'

import { useActionState } from 'react'

import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { registrar, type ResultadoRegistro } from './actions'

export function RegistroForm() {
  const [state, formAction] = useActionState<ResultadoRegistro, FormData>(registrar, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label="Nombre completo" htmlFor="nombre">
        <Input id="nombre" name="nombre" type="text" autoComplete="name" required />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField label="Contraseña" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </FormField>
      <FormField label="Código de invitación" htmlFor="codigo">
        <Input id="codigo" name="codigo" type="text" required autoComplete="off" />
      </FormField>
      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton texto="Crear cuenta de profesor" />
    </form>
  )
}