// Reconciliación de eventos Realtime (postgres_changes) sobre el estado local de la
// Gestión en Vivo. Puro y determinista: recibe el estado y el evento, devuelve el
// nuevo estado (y una bandera de desincronización cuando llega un enfrentamiento
// cuya llave aún no se conoce — el hook dispara un refetch del snapshot).
//
// Los eventos llegan filtrados por RLS (el jurado solo recibe filas que pueda leer)
// y en forma de filas snake_case de Supabase.

import type { EnfVivo, EstadoVivo, LlaveVivo, ModalidadLlave } from './tipos'

export type TablaEvento = 'llaves' | 'enfrentamientos' | 'torneos'

export type EventoEnVivo = {
  tabla: TablaEvento
  tipo: 'INSERT' | 'UPDATE' | 'DELETE'
  nuevo: Record<string, unknown>
  anterior: Record<string, unknown>
}

export type ResultadoReducer = {
  estado: EstadoVivo
  desincronizado: boolean
}

function aId(valor: unknown): string | null {
  if (typeof valor === 'string' && valor !== '') return valor
  return null
}

function aEnfVivo(fila: Record<string, unknown>): EnfVivo {
  return {
    id: String(fila.id),
    orden: typeof fila.orden === 'number' ? fila.orden : 0,
    a: aId(fila.participante_a),
    b: aId(fila.participante_b),
    ganadorId: aId(fila.ganador_id),
    tipo: typeof fila.tipo === 'string' ? fila.tipo : 'combate',
    estado: (typeof fila.estado === 'string' ? fila.estado : 'pendiente') as EnfVivo['estado'],
    resultados:
      typeof fila.resultados === 'object' && fila.resultados !== null
        ? (fila.resultados as Record<string, unknown>)
        : {},
  }
}

// Encuentra la llave por id en cualquier categoría del estado.
function encontrarLlave(estado: EstadoVivo, llaveId: string): { categoria: number; llave: number } | null {
  for (let ci = 0; ci < estado.categorias.length; ci++) {
    const index = estado.categorias[ci].llaves.findIndex((l) => l.id === llaveId)
    if (index >= 0) return { categoria: ci, llave: index }
  }
  return null
}

function aplicarLlaves(estado: EstadoVivo, evento: EventoEnVivo): boolean {
  const fila = evento.tipo === 'DELETE' ? evento.anterior : evento.nuevo
  const id = aId(fila.id)
  if (!id) return false

  const categoriaId = aId(fila.categoria_id)
  const categoria = categoriaId
    ? estado.categorias.find((c) => c.id === categoriaId)
    : undefined

  if (evento.tipo === 'DELETE') {
    const ubicación = encontrarLlave(estado, id)
    if (ubicación) estado.categorias[ubicación.categoria].llaves.splice(ubicación.llave, 1)
    return true
  }

  if (!categoria) return false

  const llave: LlaveVivo = {
    id,
    categoriaId: categoria.id,
    nombreRonda: typeof fila.nombre_ronda === 'string' ? fila.nombre_ronda : '',
    orden: typeof fila.orden === 'number' ? fila.orden : 0,
    modalidad: (typeof fila.modalidad === 'string' ? fila.modalidad : 'combate') as ModalidadLlave,
    enfrentamientos: [],
  }

  const index = categoria.llaves.findIndex((l) => l.id === id)
  if (index >= 0) {
    // Conserva los enfrentamientos ya conocidos de la llave.
    llave.enfrentamientos = categoria.llaves[index].enfrentamientos
    categoria.llaves[index] = llave
  } else {
    categoria.llaves.push(llave)
  }
  return true
}

function aplicarEnfrentamientos(estado: EstadoVivo, evento: EventoEnVivo): boolean {
  const fila = evento.tipo === 'DELETE' ? evento.anterior : evento.nuevo
  const id = aId(fila.id)
  const llaveId = aId(fila.llave_id)
  if (!id || !llaveId) return false

  const ubicación = encontrarLlave(estado, llaveId)
  if (!ubicación) return false

  const llave = estado.categorias[ubicación.categoria].llaves[ubicación.llave]

  if (evento.tipo === 'DELETE') {
    llave.enfrentamientos = llave.enfrentamientos.filter((e) => e.id !== id)
    return true
  }

  const enf = aEnfVivo(fila)
  const index = llave.enfrentamientos.findIndex((e) => e.id === id)
  if (index >= 0) llave.enfrentamientos[index] = enf
  else llave.enfrentamientos.push(enf)
  llave.enfrentamientos.sort((x, y) => x.orden - y.orden)
  return true
}

function aplicarTorneos(estado: EstadoVivo, evento: EventoEnVivo): void {
  const fila = evento.nuevo
  if (aId(fila.id) !== estado.torneo.id) return
  if (typeof fila.nombre === 'string') estado.torneo.nombre = fila.nombre
  if (typeof fila.fecha === 'string') estado.torneo.fecha = fila.fecha
  if (typeof fila.estado === 'string') estado.torneo.estado = fila.estado
}

// Aplica un evento Realtime al estado. Devuelve el nuevo estado y si quedó
// desincronizado (enfrentamiento insertado/actualizado sin su llave en el estado).
export function aplicarEventoEnVivo(estado: EstadoVivo, evento: EventoEnVivo): ResultadoReducer {
  const copia: EstadoVivo = structuredClone(estado)
  let desincronizado = false

  if (evento.tabla === 'torneos') {
    aplicarTorneos(copia, evento)
  } else if (evento.tabla === 'llaves') {
    aplicarLlaves(copia, evento)
  } else if (evento.tabla === 'enfrentamientos') {
    if (evento.tipo !== 'DELETE') {
      const llaveId = aId(evento.nuevo.llave_id)
      const conocida = llaveId ? encontrarLlave(copia, llaveId) : null
      if (!conocida) {
        desincronizado = true
        return { estado: copia, desincronizado }
      }
    }
    aplicarEnfrentamientos(copia, evento)
  }

  return { estado: copia, desincronizado }
}