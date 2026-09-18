'use client'

import type { CategoriaEditor, Lado, ParticipanteLlave } from '@/lib/llaves'

import { EnfrentamientoCard } from './enfrentamiento-card'

type Props = {
  categoria: CategoriaEditor
  porId: (id: string) => ParticipanteLlave | undefined
  seleccion: string | null
  onCasillaClick: (enfrentamientoId: string, lado: Lado) => void
  onLiberar: (participanteId: string, categoriaId: string) => void
}

// Bracket de una categoría: lista de enfrentamientos editables.
export function CategoriaBracket({
  categoria,
  porId,
  seleccion,
  onCasillaClick,
  onLiberar,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {categoria.enfrentamientos.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          Sin enfrentamientos en esta categoría.
        </p>
      ) : (
        categoria.enfrentamientos.map((enf) => (
          <EnfrentamientoCard
            key={enf.id}
            enfrentamiento={enf}
            porId={porId}
            seleccion={seleccion}
            onCasillaClick={(lado) => onCasillaClick(enf.id, lado)}
            onLiberar={(id) => onLiberar(id, categoria.id)}
          />
        ))
      )}
    </div>
  )
}