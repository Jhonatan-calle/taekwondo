'use client'

import { useActionState, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { SubmitButton } from '@/components/ui/submit-button'
import type { CategoriaEditor, Lado, ParticipanteLlave } from '@/lib/llaves'
import {
  advertenciasPar,
  agregarParticipante,
  liberarDeCategoria,
  moverParticipante,
  serializarPayload,
  ubicacionDe,
} from '@/lib/llaves'
import { cn } from '@/lib/utils'

import { guardarLlavesManuales, type ResultadoGuardarLlavesManuales } from './actions'
import { CategoriaBracket } from './categoria-bracket'
import { ListaSinUbicar } from './lista-sin-ubicar'

type Props = {
  torneoId: string
  categoriasIniciales: CategoriaEditor[]
  confirmados: ParticipanteLlave[]
}

// Editor manual de llaves (control total del organizador, SRS B.2.3).
// Interacción: tocar un participante lo selecciona; tocar una casilla destino
// (libre '+') o un rival lo ubica ahí (se suma a la categoría, sin quitarlo de otras →
// doble categoría); 'x' lo saca solo de esa categoría (bye parcial).
// El guardado envía el estado final de la llave al RPC guardar_llaves_manuales.
export function EditorLlaves({ torneoId, categoriasIniciales, confirmados }: Props) {
  const [categorias, setCategorias] = useState(categoriasIniciales)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [estado, action] = useActionState<ResultadoGuardarLlavesManuales, FormData>(
    guardarLlavesManuales,
    {},
  )

  const porId = useMemo(
    () => new Map(confirmados.map((p) => [p.inscripcionId, p])),
    [confirmados],
  )

  const sinUbicar = useMemo(
    () => confirmados.filter((p) => !ubicacionDe(categorias, p.inscripcionId)),
    [categorias, confirmados],
  )

  const payload = useMemo(() => serializarPayload(categorias), [categorias])

  function confirmarAdvertencias(advertencias: { mensaje: string }[]): boolean {
    if (advertencias.length === 0) return true
    const detalle = [
      advertencias.map((a) => a.mensaje).join('\n'),
      '',
      '¿Aplicar la modificación de todos modos?',
    ].join('\n')
    return window.confirm(detalle)
  }

  function clickCasilla(categoriaId: string, enfrentamientoId: string, lado: Lado) {
    const cat = categorias.find((c) => c.id === categoriaId)
    const enf = cat?.enfrentamientos.find((e) => e.id === enfrentamientoId)
    if (!cat || !enf) return

    if (seleccion) {
      const movido = porId.get(seleccion)
      if (!movido) return

      const otroId = lado === 'a' ? enf.b : enf.a
      if (otroId && otroId !== seleccion) {
        const rival = porId.get(otroId)
        if (rival && !confirmarAdvertencias(advertenciasPar(movido, rival, cat))) return
      }

      setCategorias((prev) =>
        moverParticipante(prev, seleccion, { categoriaId, enfrentamientoId, lado }),
      )
      setSeleccion(null)
      return
    }

    const ocupado = lado === 'a' ? enf.a : enf.b
    if (ocupado) setSeleccion(ocupado)
  }

  function liberar(participanteId: string, categoriaId: string) {
    setCategorias((prev) => liberarDeCategoria(prev, participanteId, categoriaId))
    setSeleccion(null)
  }

  function agregar(participanteId: string, categoriaId: string) {
    setCategorias((prev) => agregarParticipante(prev, participanteId, categoriaId))
  }

  const seleccionado = seleccion ? porId.get(seleccion) : null

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm',
          seleccion ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-muted-foreground',
        )}
      >
        {seleccion ? (
          <p>
            Moviendo a <span className="font-medium">{seleccionado?.nombre}</span>. Tocá una casilla
            destino (+ = libre) o un rival: se lo ubica ahí sin quitarlo de otras categorías.
          </p>
        ) : (
          <p>
            Tocá un participante para moverlo o sumarlo a otra categoría (doble categoría); luego una
            casilla libre (+) o un rival. La &apos;x&apos; lo saca solo de esa categoría.
          </p>
        )}
      </div>

      {categorias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay categorías armadas.</p>
      ) : (
        categorias.map((cat) => (
          <section key={cat.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{cat.nombre}</h3>
              <Badge>{cat.enfrentamientos.length} enfrentamiento(s)</Badge>
            </div>
            <CategoriaBracket
              categoria={cat}
              porId={(id) => porId.get(id)}
              seleccion={seleccion}
              onCasillaClick={(enfId, lado) => clickCasilla(cat.id, enfId, lado)}
              onLiberar={liberar}
            />
          </section>
        ))
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">Participantes sin ubicar</h3>
        <ListaSinUbicar
          participantes={sinUbicar}
          categorias={categorias}
          onAgregar={(id, catId) => agregar(id, catId)}
        />
      </section>

      <form action={action} className="flex flex-col gap-2 border-t pt-4">
        <input type="hidden" name="torneo_id" value={torneoId} />
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />
        <SubmitButton texto="Guardar llaves" textoCargando="Guardando…" />
        {estado?.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {estado.error}
          </p>
        )}
      </form>
    </div>
  )
}