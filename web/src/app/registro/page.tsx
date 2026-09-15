import type { Metadata } from 'next'
import Link from 'next/link'

import { RegistroForm } from './registro-form'

export const metadata: Metadata = {
  title: 'Registrarse | Taekwondo ITF',
}

export default function RegistroPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Necesitás el código de invitación de tu profesor/organizador.
        </p>
        <RegistroForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-medium text-foreground underline">
            Ingresar
          </Link>
        </p>
      </div>
    </main>
  )
}