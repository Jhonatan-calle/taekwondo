'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const SECCIONES = [
  { href: '/panel', label: 'Resumen' },
  { href: '/panel/inscripciones', label: 'Inscripciones' },
  { href: '/panel/torneos', label: 'Torneos' },
  { href: '/panel/organizador', label: 'Organizador' },
]

// Navegación persistente del panel (Mobile-First): pills con estado activo.
export function PanelNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background" aria-label="Secciones del panel">
      <div className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-6 py-2">
        {SECCIONES.map((seccion) => {
          const activo = pathname === seccion.href
          return (
            <Link
              key={seccion.href}
              href={seccion.href}
              aria-current={activo ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                activo
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {seccion.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}