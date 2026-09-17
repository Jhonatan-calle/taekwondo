// Contratos de datos del Motor de Emparejamiento (puro y determinista).
// Solo funciona con datos ya validados (sin I/O ni dependencias de UI/BD).

// Input del motor: una inscripción confirmada enriquecida para el emparejamiento.
export type Participante = {
  inscripcionId: string
  grado: string
  fechaNacimiento: string
  pesoKg: number
  alturaCm: number
  nivelAgresividad: number
}

// Resultado de un emparejamiento. participanteB = null representa un bye
// (participante sin rival válido en su categoría).
export type Par = {
  participanteA: Participante
  participanteB: Participante | null
}

// Categoría armada: cinturón × edad con sus pares resueltos.
export type CategoriaArmada = {
  nombre: string
  rangoMin: string | null
  rangoMaxEspecial: string | null
  edadMin: number | null
  edadMax: number | null
  esInfantil: boolean
  inscripcionIds: string[]
  pares: Par[]
}

// Fila del payload jsonb que consume el RPC generar_llaves (espejo de categorias/enfrentamientos).
export type PayloadCategoria = {
  nombre: string
  rango_min: string | null
  rango_max_especial: string | null
  edad_min: number | null
  edad_max: number | null
  enfrentamientos: { a: string; b: string | null }[]
}

export type ResumenCategoria = {
  nombre: string
  esInfantil: boolean
  participantes: number
  enfrentamientos: number
  libres: number
}

export type ResumenEmparejamiento = {
  totalConfirmados: number
  sinDatos: number
  sinCategoria: number
  categorias: ResumenCategoria[]
}

export type ResultadoArmado = {
  categorias: CategoriaArmada[]
  payload: { categorias: PayloadCategoria[] }
  resumen: ResumenEmparejamiento
}