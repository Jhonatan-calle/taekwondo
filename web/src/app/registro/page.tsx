import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistroForm } from './registro-form'

export const metadata: Metadata = {
  title: 'Registrarse | Taekwondo ITF',
}

export default function RegistroPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <p className="text-sm text-muted-foreground">
            Necesitás el código de invitación de tu profesor/organizador.
          </p>
        </CardHeader>
        <CardContent>
          <RegistroForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="font-medium text-foreground underline">
              Ingresar
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}