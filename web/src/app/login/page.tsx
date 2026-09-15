import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Ingresar | Taekwondo ITF',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registrado?: string }>
}) {
  const params = await searchParams
  const next =
    params.next && params.next.startsWith('/') && !params.next.startsWith('//')
      ? params.next
      : '/panel'

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Ingresar</h1>
        <p className="text-sm text-muted-foreground">
          Acceso al panel de gestión del Módulo de Torneos.
        </p>
        {params.registrado === '1' && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Tu cuenta fue creada. Ya podés ingresar.
          </p>
        )}
        <LoginForm next={next} />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="font-medium text-foreground underline">
            Registrarse
          </Link>
        </p>
      </div>
    </main>
  )
}