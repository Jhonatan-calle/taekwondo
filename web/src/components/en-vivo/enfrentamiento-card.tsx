'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { EnfVivo } from '@/lib/en_vivo'
import { cn } from '@/lib/utils'

const ETIQUETAS_ESTADO: Record<EnfVivo['estado'], string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
}

const VARIANTE_ESTADO: Record<EnfVivo['estado'], 'default' | 'warning' | 'success'> = {
  pendiente: 'default',
  en_curso: 'warning',
  finalizado: 'success',
}

type Props = {
  enfrentamiento: EnfVivo
  porNombre: (id: string | null) => string
  puedeCargar: boolean
  onCargar?: () => void
}

// Tarjeta de una casilla del bracket en vivo: competidores, estado y (según rol
// y estado del enfrentamiento) el botón "Cargar resultado".
export function EnfrentamientoCardEnVivo({ enfrentamiento, porNombre, puedeCargar, onCargar }: Props) {
  const ganador = enfrentamiento.ganadorId

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={VARIANTE_ESTADO[enfrentamiento.estado]}>
          {ETIQUETAS_ESTADO[enfrentamiento.estado]}
        </Badge>
        {puedeCargar && onCargar && (
          <Button size="xs" variant="outline" onClick={onCargar}>
            Cargar resultado
          </Button>
        )}
      </div>
      <div className="flex items-stretch gap-2 text-sm">
        <Casilla
          lado="A"
          participanteId={enfrentamiento.a}
          porNombre={porNombre}
          esGanador={Boolean(ganador) && ganador === enfrentamiento.a}
        />
        <span className="self-center text-xs font-medium uppercase text-muted-foreground">vs</span>
        <Casilla
          lado="B"
          participanteId={enfrentamiento.b}
          porNombre={porNombre}
          esGanador={Boolean(ganador) && ganador === enfrentamiento.b}
        />
      </div>
    </div>
  )
}

function Casilla({
  lado,
  participanteId,
  porNombre,
  esGanador,
}: {
  lado: 'A' | 'B'
  participanteId: string | null
  porNombre: (id: string | null) => string
  esGanador: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-0.5 rounded-lg border px-2.5 py-2',
        esGanador ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-card',
      )}
    >
      <span className="text-[0.65rem] font-medium uppercase text-muted-foreground">{lado}</span>
      <span className="min-w-0 truncate font-medium">
        {participanteId ? porNombre(participanteId) : 'Libre (bye)'}
      </span>
      {esGanador && <span className="text-xs font-medium text-emerald-700">Ganador</span>}
    </div>
  )
}