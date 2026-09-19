'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import { aplicarEventoEnVivo, type EstadoVivo, type EventoEnVivo, type TablaEvento } from './index'

// Hook de la consola en vivo: recibe el snapshot del servidor, se suscribe a
// Supabase Realtime (postgres_changes filtrado por RLS) y reconcilia los eventos
// INSERT/UPDATE/DELETE de `llaves`, `enfrentamientos` y `torneos` sobre el estado
// local. Cada casilla del bracket tiene su propio filtro por llave; una llave
// recién insertada (Formas) agrega dinámicamente el filtro de sus enfrentamientos.

type PayloadRealtime = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  new: Record<string, unknown> | null
  old: Record<string, unknown> | null
}

function aEvento(payload: PayloadRealtime): EventoEnVivo | null {
  if (payload.table !== 'llaves' && payload.table !== 'enfrentamientos' && payload.table !== 'torneos') {
    return null
  }
  return {
    tabla: payload.table as TablaEvento,
    tipo: payload.eventType,
    nuevo: payload.new ?? {},
    anterior: payload.old ?? {},
  }
}

export function useEnVivo(
  torneoId: string,
  snapshot: EstadoVivo,
  activo: boolean,
  onDesincronizado?: () => void,
): { estado: EstadoVivo; suscrito: boolean } {
  const [estado, setEstado] = useState<EstadoVivo>(snapshot)
  const [suscrito, setSuscrito] = useState(false)
  const estadoRef = useRef(estado)
  const canalRef = useRef<RealtimeChannel | null>(null)
  const onDesincronizadoRef = useRef(onDesincronizado)
  onDesincronizadoRef.current = onDesincronizado

  // Re-sembrar cuando el snapshot cambia (router.refresh tras finalizar, etc.).
  useEffect(() => {
    estadoRef.current = snapshot
    setEstado(snapshot)
  }, [snapshot])

  useEffect(() => {
    if (!activo) return
    if (canalRef.current) return

    const canal = supabase.channel(`en-vivo-${torneoId}`)
    canalRef.current = canal

    const emitir = (payload: PayloadRealtime) => {
      const evento = aEvento(payload)
      if (!evento) return

      // Una llave nueva (p. ej. Formas) habilita el filtro de sus enfrentamientos.
      if (evento.tabla === 'llaves' && evento.tipo === 'INSERT' && typeof evento.nuevo.id === 'string') {
        canal.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'enfrentamientos',
          filter: `llave_id=eq.${evento.nuevo.id}`,
        }, emitir)
      }

      const resultado = aplicarEventoEnVivo(estadoRef.current, evento)
      estadoRef.current = resultado.estado
      setEstado(resultado.estado)
      if (resultado.desincronizado) onDesincronizadoRef.current?.()
    }

    for (const categoria of snapshot.categorias) {
      canal.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'llaves',
        filter: `categoria_id=eq.${categoria.id}`,
      }, emitir)
      for (const llave of categoria.llaves) {
        canal.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'enfrentamientos',
          filter: `llave_id=eq.${llave.id}`,
        }, emitir)
      }
    }
    canal.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'torneos',
      filter: `id=eq.${torneoId}`,
    }, emitir)

    canal.subscribe(async (estadoCanal) => {
      if (estadoCanal === 'SUBSCRIBED') setSuscrito(true)
    })

    return () => {
      supabase.removeChannel(canal)
      canalRef.current = null
      setSuscrito(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId, activo])

  return { estado, suscrito }
}