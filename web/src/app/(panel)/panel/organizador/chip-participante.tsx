'use client'

import { Badge } from '@/components/ui/badge'
import { ETIQUETA_GRADO_INSCRIPCION } from '@/lib/grados'
import type { ParticipanteLlave } from '@/lib/llaves'
import { cn } from '@/lib/utils'

type Props = {
  participante: ParticipanteLlave
  seleccionado?: boolean
  onChipClick?: () => void
  onLiberar?: () => void
}

// Chip de participante del editor de llaves. Seleccionado = marcado para mover/sumar;
// onLiberar expone la acción "x" para sacarlo de esa categoría (bye parcial, doble categoría).
export function ChipParticipante({
  participante,
  seleccionado = false,
  onChipClick,
  onLiberar,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-1 rounded-lg border p-2.5 transition-colors',
        seleccionado ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onChipClick}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left',
            onChipClick && 'cursor-pointer',
          )}
        >
          <span className="font-medium">{participante.nombre}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {participante.grado && (
              <Badge>{ETIQUETA_GRADO_INSCRIPCION[participante.grado] ?? participante.grado}</Badge>
            )}
            {participante.pesoKg != null && <span>{participante.pesoKg} kg</span>}
            {participante.alturaCm != null && <span>{participante.alturaCm} cm</span>}
            {participante.edad != null && <span>{participante.edad} años</span>}
          </span>
        </button>
        {onLiberar && (
          <button
            type="button"
            onClick={onLiberar}
            title="Quitar de esta categoría (bye)"
            aria-label={`Quitar a ${participante.nombre} de esta categoría`}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            x
          </button>
        )}
      </div>
      {participante.agresividad != null && (
        <p className="text-xs text-muted-foreground">Agresividad (interno): {participante.agresividad}/5</p>
      )}
    </div>
  )
}