'use client'

import { Badge } from '@/components/ui/badge'
import type { CategoriaVivo, ModalidadLlave } from '@/lib/en_vivo'

import { EnfrentamientoCardEnVivo } from './enfrentamiento-card'

type Props = {
  categoria: CategoriaVivo
  porNombre: (id: string | null) => string
  puedeCargar: boolean
  onCargar: (enfrentamientoId: string) => void
}

// Bracket de una categoría en vivo: cadenas de rondas por modalidad
// (Combate y, si existe, Formas). Cada llave = una ronda con sus casillas.
export function BracketCategoria({ categoria, porNombre, puedeCargar, onCargar }: Props) {
  const modalidades: ModalidadLlave[] = ['combate', 'tul']

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <p className="font-semibold">{categoria.nombre}</p>
      {modalidades.map((modalidad) => {
        const rondas = categoria.llaves.filter((l) => l.modalidad === modalidad)
        if (rondas.length === 0) return null

        return (
          <section key={modalidad} className="flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {modalidad === 'combate' ? 'Combate' : 'Formas'}
            </p>
            <div className="flex flex-col gap-3">
              {rondas.map((ronda) => (
                <div key={ronda.id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{ronda.nombreRonda}</span>
                    <Badge>
                      {ronda.enfrentamientos.length} {ronda.enfrentamientos.length === 1 ? 'casilla' : 'casillas'}
                    </Badge>
                  </div>
                  {ronda.enfrentamientos.map((enfrentamiento) => (
                    <EnfrentamientoCardEnVivo
                      key={enfrentamiento.id}
                      enfrentamiento={enfrentamiento}
                      porNombre={porNombre}
                      puedeCargar={puedeCargar && enfrentamiento.estado !== 'finalizado'}
                      onCargar={() => onCargar(enfrentamiento.id)}
                    />
                  ))}
                  {ronda.enfrentamientos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin enfrentamientos en esta ronda.</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}