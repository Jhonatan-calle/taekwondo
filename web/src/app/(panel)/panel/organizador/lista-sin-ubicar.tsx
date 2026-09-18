'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Select } from '@/components/ui/select'
import type { CategoriaEditor, ParticipanteLlave } from '@/lib/llaves'

import { ChipParticipante } from './chip-participante'

type Props = {
  participantes: ParticipanteLlave[]
  categorias: CategoriaEditor[]
  onAgregar: (participanteId: string, categoriaId: string) => void
}

// Participantes confirmados que aún no están en ninguna casilla de las llaves.
// El organizador puede insertarlos a mano en la categoría que elija (SRS B.2.3).
export function ListaSinUbicar({ participantes, categorias, onAgregar }: Props) {
  if (participantes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todos los participantes confirmados están ubicados en las llaves.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {participantes.map((participante) => (
        <FilaSinUbicar
          key={participante.inscripcionId}
          participante={participante}
          categorias={categorias}
          onAgregar={onAgregar}
        />
      ))}
    </div>
  )
}

function FilaSinUbicar({
  participante,
  categorias,
  onAgregar,
}: {
  participante: ParticipanteLlave
  categorias: CategoriaEditor[]
  onAgregar: (participanteId: string, categoriaId: string) => void
}) {
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? '')
  const idUnico = `categoria-${participante.inscripcionId}`

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <ChipParticipante participante={participante} />
      <div className="flex items-center gap-2">
        <FormField label="Categoría" htmlFor={idUnico} className="m-0 min-w-0 flex-1">
          <Select id={idUnico} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </Select>
        </FormField>
        <Button
          type="button"
          variant="outline"
          className="mt-auto"
          disabled={!categoriaId}
          onClick={() => onAgregar(participante.inscripcionId, categoriaId)}
        >
          Agregar
        </Button>
      </div>
    </div>
  )
}