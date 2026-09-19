// Contratos de datos de la Gestión en Vivo (Fase 3, ítem 5).
// Módulo puro y determinista (sin I/O): avance de rondas, validación de
// resultados ITF (combate y formas), construcción del historial y reducción
// de eventos Realtime. Espeja el patrón del Motor y del Editor de llaves.

export type ModalidadLlave = 'combate' | 'tul'

export type EstadoEnfrentamiento = 'pendiente' | 'en_curso' | 'finalizado'

// Enfrentamiento leído de la BD (una casilla de la ronda).
export type EnfVivo = {
  id: string
  orden: number
  a: string | null
  b: string | null
  ganadorId: string | null
  tipo: string
  estado: EstadoEnfrentamiento
  resultados: Record<string, unknown>
}

// Ronda (llaves): una fila de `llaves` con sus enfrentamientos.
export type LlaveVivo = {
  id: string
  categoriaId: string
  nombreRonda: string
  orden: number
  modalidad: ModalidadLlave
  enfrentamientos: EnfVivo[]
}

// Categoría del torneo con sus cadenas de rondas (combate y/o tul).
export type CategoriaVivo = {
  id: string
  nombre: string
  llaves: LlaveVivo[]
}

// ---- Resultados (jsonb de `enfrentamientos.resultados`) ----

export type AsaltoCombate = {
  numero: number
  puntos_a: number
  puntos_b: number
  penalidades_a: number
  penalidades_b: number
}

export type ResolucionCombate = 'puntos' | 'descalificacion' | 'retiro' | 'walkover'

export type ResultadoCombate = {
  modalidad: 'combate'
  asaltos: AsaltoCombate[]
  resolucion: ResolucionCombate
  observaciones?: string
}

export type FilaPuntajeTul = {
  jurado_nombre: string
  contenido_tecnico_a: number
  presentacion_a: number
  contenido_tecnico_b: number
  presentacion_b: number
}

export type ResultadoTul = {
  modalidad: 'tul'
  puntajes: FilaPuntajeTul[]
}

export type ResultadoEnfrentamiento = ResultadoCombate | ResultadoTul

// ---- Contrato de avance (jsonb `p_rondas` del RPC) ----

export type EnfrentamientoRondaNueva = {
  orden: number
  a: string | null
  b: string | null
}

export type CambioRonda = {
  categoria_id: string
  modalidad: ModalidadLlave
  orden: number
  nombre_ronda: string
  enfrentamientos: EnfrentamientoRondaNueva[]
}

// ---- Historial competitivo (filas de `resultados_torneo`) ----

export type RestoTorneo = {
  categoria_id: string
  inscripcion_id: string
  modalidad: ModalidadLlave
  posicion: number | null
  rondas_alcanzadas: number
  ganadas: number
  perdidas: number
  detalle: { enfrentamientos: number }
}

// ---- Estado en vivo (snapshot + reducer Realtime) ----

export type TorneoVivo = {
  id: string
  nombre: string
  fecha: string
  estado: string
}

export type EstadoVivo = {
  torneo: TorneoVivo
  categorias: CategoriaVivo[]
}