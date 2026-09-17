import { Button } from '@/components/ui/button'
import { requireProfesor } from '@/lib/auth'

import { cerrarSesion } from './actions'
import { PanelNav } from './nav-panel'

// Shell del panel: guard de profesor + header persistente + navegación por rutas.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireProfesor()

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 p-6 pb-3">
          <div>
            <h1 className="text-2xl font-semibold">Panel de Profesor</h1>
            <p className="text-sm text-muted-foreground">
              Gestión del Módulo de Torneos.
            </p>
          </div>
          <form action={cerrarSesion}>
            <Button type="submit" variant="outline">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <PanelNav />
      {children}
    </div>
  )
}