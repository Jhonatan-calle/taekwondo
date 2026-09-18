'use client'

import type { EnfrentamientoEditor, Lado, ParticipanteLlave } from '@/lib/llaves'

import { ChipParticipante } from './chip-participante'

type CasillaProps = {
  participante?: ParticipanteLlave
  seleccion: string | null
  esSeleccion: boolean
  onClick: () => void
  onLiberar: (id: string) => void
}

function Casilla({ participante, seleccion, esSeleccion, onClick, onLiberar }: CasillaProps) {
  if (!participante) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!esSeleccion}
        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed px-2 py-4 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Libre
      </button>
    )
  }
  return (
    <ChipParticipante
      participante={participante}
      seleccionado={seleccion === participante.inscripcionId}
      onChipClick={onClick}
      onLiberar={() => onLiberar(participante.inscripcionId)}
    />
  )
}

type Props = {
  enfrentamiento: EnfrentamientoEditor
  porId: (id: string) => ParticipanteLlave | undefined
  seleccion: string | null
  onCasillaClick: (lado: Lado) => void
  onLiberar: (id: string) => void
}

// Tarjeta de un enfrentamiento (par o bye) en el editor de llaves.
export function EnfrentamientoCard({
  enfrentamiento,
  porId,
  seleccion,
  onCasillaClick,
  onLiberar,
}: Props) {
  const a = enfrentamiento.a ? porId(enfrentamiento.a) : undefined
  const b = enfrentamiento.b ? porId(enfrentamiento.b) : undefined

  return (
    <div className="flex items-stretch gap-2 rounded-xl border p-3">
      <Casilla
        participante={a}
        seleccion={seleccion}
        esSeleccion={seleccion !== null}
        onClick={() => onCasillaClick('a')}
        onLiberar={onLiberar}
      />
      <span className="self-center text-xs font-medium uppercase text-muted-foreground">vs</span>
      <Casilla
        participante={b}
        seleccion={seleccion}
        esSeleccion={seleccion !== null}
        onClick={() => onCasillaClick('b')}
        onLiberar={onLiberar}
      />
    </div>
  )
}