// Contratos de datos de la edición manual de llaves (Panel del Organizador).
// Módulo puro y determinista (sin I/O ni dependencias de UI/BD), espejo del Motor
// de Emparejamiento: el editor construye el estado final y se persiste vía RPC.

// Lado de una casilla dentro de un enfrentamiento.
export type Lado = 'a' | 'b'

// Enfrentamiento en el editor. a/b son ids de inscripciones confirmadas (null = libre).
export type EnfrentamientoEditor = {
  id: string
  a: string | null
  b: string | null
}

// Categoría en el editor (espejo de `categorias` + `llaves(enfrentamientos)`).
export type CategoriaEditor = {
  id: string
  nombre: string
  rangoMin: string | null
  rangoMaxEspecial: string | null
  edadMin: number | null
  edadMax: number | null
  enfrentamientos: EnfrentamientoEditor[]
}

// Participante confirmado enriquecido para la edición (lo que el organizador ve y mueve).
export type ParticipanteLlave = {
  inscripcionId: string
  nombre: string
  grado: string | null
  pesoKg: number | null
  alturaCm: number | null
  edad: number | null
  agresividad: number | null
}

// Destino de un movimiento. `null` = liberar (bye / sin ubicar).
export type DestinoMover = {
  categoriaId: string
  enfrentamientoId: string
  lado: Lado
} | null

// Payload jsonb del RPC (mismo contrato que `generar_llaves`).
export type PayloadCategoriaGuardar = {
  nombre: string
  rango_min: string | null
  rango_max_especial: string | null
  edad_min: number | null
  edad_max: number | null
  enfrentamientos: { a: string | null; b: string | null }[]
}

export type PayloadGuardarLlaves = {
  categorias: PayloadCategoriaGuardar[]
}