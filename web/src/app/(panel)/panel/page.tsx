import { Button } from '@/components/ui/button'
import { cerrarSesion } from './actions'

export default async function PanelPage() {
  return (
    <main className="flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Panel de Profesor</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido al panel de gestión del Módulo de Torneos.
          </p>
        </div>
        <form action={cerrarSesion}>
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <section className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Tus torneos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximamente vas a poder crear y gestionar torneos, validar inscripciones y armar las
          llaves desde acá.
        </p>
      </section>
    </main>
  )
}