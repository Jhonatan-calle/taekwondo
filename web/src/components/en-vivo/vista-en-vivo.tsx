'use client'

import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import type { EnfVivo, EstadoVivo, TorneoVivo } from '@/lib/en_vivo'
import type { ParticipanteVivo } from '@/lib/en_vivo/datos'
import { useEnVivo } from '@/lib/en_vivo/use-en-vivo'

import { BracketCategoria } from './bracket-categoria'
import { CargarResultadoForm } from './cargar-resultado-form'

type Props = {
  torneoId: string
  rol: 'organizador' | 'jurado'
  torneo: TorneoVivo
  categorias: EstadoVivo['categorias']
  confirmados: ParticipanteVivo[]
  onDesincronizado?: () => void
}

// Consola en vivo: snapshot del servidor + suscripción Realtime. Renderiza el
// bracket por categoría y el modal de carga de resultados (rol con permiso).
export function VistaEnVivo({ torneoId, rol, torneo, categorias, confirmados, onDesincronizado }: Props) {
  const { estado, suscrito } = useEnVivo(torneoId, { torneo, categorias }, true, onDesincronizado)
  const [enfSeleccionadoId, setEnfSeleccionadoId] = useState<string | null>(null)

  const porNombre = useMemo(() => {
    const mapa = new Map(confirmados.map((c) => [c.inscripcionId, c.nombre]))
    return (id: string | null) => (id ? mapa.get(id) ?? 'Participante' : 'Libre (bye)')
  }, [confirmados])

  const puedeCargar = ['organizador', 'jurado'].includes(rol) && estado.torneo.estado === 'en_vivo'

  const enfSeleccionado = useMemo(() => {
    if (!enfSeleccionadoId) return null
    for (const categoria of estado.categorias) {
      for (const llave of categoria.llaves) {
        const encontrado = llave.enfrentamientos.find((e) => e.id === enfSeleccionadoId)
        if (encontrado) return encontrado
      }
    }
    return null
  }, [enfSeleccionadoId, estado.categorias])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">{estado.torneo.nombre}</h1>
        <Badge variant={suscrito ? 'success' : 'warning'}>
          {suscrito ? 'Tiempo real activo' : 'Conectando…'}
        </Badge>
      </div>

      {estado.categorias.map((categoria) => (
        <BracketCategoria
          key={categoria.id}
          categoria={categoria}
          porNombre={porNombre}
          puedeCargar={puedeCargar}
          onCargar={setEnfSeleccionadoId}
        />
      ))}

      {enfSeleccionado && (
        <ModalResultado
          torneoId={torneoId}
          enfrentamiento={enfSeleccionado}
          porNombre={porNombre}
          onClose={() => setEnfSeleccionadoId(null)}
        />
      )}
    </div>
  )
}

function ModalResultado({
  torneoId,
  enfrentamiento,
  porNombre,
  onClose,
}: {
  torneoId: string
  enfrentamiento: EnfVivo
  porNombre: (id: string | null) => string
  onClose: () => void
}) {
  return (
    <CargarResultadoForm
      torneoId={torneoId}
      enfrentamiento={enfrentamiento}
      porNombre={porNombre}
      onClose={onClose}
    />
  )
}