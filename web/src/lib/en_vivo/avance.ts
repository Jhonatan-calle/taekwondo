// Avance de rondas de la Gestión en Vivo. Funciones puras y deterministas (sin
// I/O) sobre el bracket leído de la BD. Espeja el patrón del Motor y del Editor.
//
// Regla clave (D-4): pares consecutivos. El slot `i` de la ronda `r` alimenta al
// slot `floor(i/2)` de la ronda `r+1` (lado `a` si `i` es par, `b` si impar).
// La longitud de la ronda `r` es ARITMÉTICA (`ceil(n0 / 2^r)` con n0 = cantidad
// de enfrentamientos de la ronda 0), nunca el count parcial de la BD: así el
// avance es idempotente aunque una ronda esté a medio poblar.
//
// Un enfrentamiento con un solo lado (bye) "auto-avanza": su participante pasa
// de ronda sin pelear, incluso antes de finalizar la casilla (está decidido).
// Los desafíos con dos lados solo aportan su ganador cuando están `finalizado`.

import type {
  CambioRonda,
  CategoriaVivo,
  EnfVivo,
  EnfrentamientoRondaNueva,
  LlaveVivo,
  ModalidadLlave,
  ResultadoEnfrentamiento,
} from './tipos'

// ---- Atributos ----

// Ganador conocido de una casilla, si lo tiene:
//   - finalizada → `ganadorId`.
//   - bye (un solo lado) → su participante (avanza sí o sí).
//   - dos lados sin finalizar → null (aún no decidido).
export function ganadorConocido(enf: EnfVivo | null | undefined): string | null {
  if (!enf) return null
  if (enf.estado === 'finalizado' && enf.ganadorId) return enf.ganadorId
  if (enf.a && !enf.b) return enf.a
  if (enf.b && !enf.a) return enf.b
  return null
}

// Longitud aritmética (cantidad de enfrentamientos) de la ronda `r` de un
// bracket cuya ronda 0 tiene `n0Enfrentamientos` casillas.
export function longitudRonda(n0Enfrentamientos: number, r: number): number {
  return Math.ceil(n0Enfrentamientos / 2 ** r)
}

// Nombre canónico de una ronda según su posición en el bracket. `cantidad` es
// la cantidad de enfrentamientos de la ronda; `orden` su índice (0-based).
export function nombreRonda(orden: number, cantidad: number): string {
  if (cantidad === 1) return 'Final'
  if (cantidad === 2) return 'Semifinal'
  if (cantidad >= 3 && cantidad <= 4) return 'Cuartos de final'
  if (cantidad >= 5 && cantidad <= 8) return 'Octavos de final'
  if (cantidad >= 9 && cantidad <= 16) return 'Dieciseisavos de final'
  return `Ronda ${orden + 1}`
}

// ---- Avance ----

// Calcula la ronda siguiente a `ordenPrev` (la casillas padrastro de la ronda
// anterior + nuevas), con lados conocidos. Devuelve null si no hay avance:
// la ronda previa es la final (≤ 1 enfrentamiento aritmético) o ningún lado se
// conoce todavía.
function rondaSiguiente(
  categoriaId: string,
  modalidad: ModalidadLlave,
  ordenPrev: number,
  prevEnf: EnfVivo[],
  prevLenArit: number,
): CambioRonda | null {
  const nextLen = Math.ceil(prevLenArit / 2)
  if (nextLen < 1) return null

  const porOrden = new Map(prevEnf.map((e) => [e.orden, e]))
  const enfrentamientos: EnfrentamientoRondaNueva[] = []

  for (let i = 0; i < nextLen; i++) {
    const a = ganadorConocido(porOrden.get(2 * i))
    const b = ganadorConocido(porOrden.get(2 * i + 1))
    if (a || b) enfrentamientos.push({ orden: i, a, b })
  }

  if (enfrentamientos.length === 0) return null

  return {
    categoria_id: categoriaId,
    modalidad,
    orden: ordenPrev + 1,
    nombre_ronda: nombreRonda(ordenPrev + 1, nextLen),
    enfrentamientos,
  }
}

function aEnfVirtual(cambio: CambioRonda): EnfVivo[] {
  return cambio.enfrentamientos.map((e) => ({
    id: `virtual_${cambio.categoria_id}_${cambio.modalidad}_${cambio.orden}_${e.orden}`,
    orden: e.orden,
    a: e.a,
    b: e.b,
    ganadorId: null,
    tipo: cambio.modalidad,
    estado: 'pendiente',
    resultados: {},
  }))
}

// Devuelve los cambios de ronda (jsonb `p_rondas` del RPC) que hay que sincronizar
// en la BD para que el bracket avance según los resultados cargados. Determinístico
// e idempotente: re-emitir una ronda ya existente es inofensivo (el RPC hace
// `coalesce` — nunca pisa un lado ya conocido).
//
// Recorre la cadena de cada (categoría, modalidad) desde la ronda 0 y, cuando la
// casilla destino tiene al menos un lado conocido, emite la ronda `orden+1`. Los
// byes de la ronda nueva cascadan a la siguiente (su resultado está decidido);
// la final (ronda con ≤ 1 enfrentamiento aritmético) nunca avanza más allá.
export function prepararAvance(categorias: CategoriaVivo[]): CambioRonda[] {
  const cambios: CambioRonda[] = []

  for (const cat of categorias) {
    const cadenas = new Map<ModalidadLlave, LlaveVivo[]>()
    for (const llave of cat.llaves) {
      const arr = cadenas.get(llave.modalidad) ?? []
      arr.push(llave)
      cadenas.set(llave.modalidad, arr)
    }

    for (const [modalidad, llaves] of cadenas) {
      llaves.sort((x, y) => x.orden - y.orden)
      if (llaves.length === 0) continue

      const n0 = llaves[0].enfrentamientos.length
      if (n0 < 1) continue

      // Estado efectivo por ronda: ronda real de la BD o ronda virtual calculada.
      const estado = new Map<number, { enf: EnfVivo[]; virtual: boolean }>()
      for (const l of llaves) estado.set(l.orden, { enf: l.enfrentamientos, virtual: false })

      let orden = 0
      while (estado.has(orden)) {
        const lenArit = longitudRonda(n0, orden)
        if (lenArit <= 1) break // la ronda `orden` es la final: no avanza más

        const actual = estado.get(orden)!
        const cambio = rondaSiguiente(cat.id, modalidad, orden, actual.enf, lenArit)
        if (cambio) {
          cambios.push(cambio)
          if (!estado.has(cambio.orden)) {
            estado.set(cambio.orden, { enf: aEnfVirtual(cambio), virtual: true })
          }
        }
        orden++
      }
    }
  }

  return cambios
}

// ---- Marcar resultado (en memoria) ----

// Marca un enfrentamiento como `finalizado` con su ganador y resultados en el
// bracket (clone). Devuelve el bracket nuevo; lanza si la casilla no existe, ya
// finalizó (evita regrabar a ciegas) o el ganador no es uno de los presentes.
export function marcarResultado(
  categorias: CategoriaVivo[],
  enfrentamientoId: string,
  ganadorId: string,
  resultados: ResultadoEnfrentamiento,
): CategoriaVivo[] {
  const copia = structuredClone(categorias)

  for (const cat of copia) {
    for (const llave of cat.llaves) {
      const enf = llave.enfrentamientos.find((e) => e.id === enfrentamientoId)
      if (!enf) continue
      if (enf.estado === 'finalizado') {
        throw new Error('El enfrentamiento ya fue cargado.')
      }
      if (ganadorId !== enf.a && ganadorId !== enf.b) {
        throw new Error('El ganador debe ser uno de los competidores del enfrentamiento.')
      }
      enf.estado = 'finalizado'
      enf.ganadorId = ganadorId
      enf.resultados = resultados as unknown as Record<string, unknown>
      return copia
    }
  }

  throw new Error('Enfrentamiento inexistente.')
}

// ---- Llave de Formas ----

// Arma la ronda 0 de Formas (tul) por pares consecutivos (2i, 2i+1); con cantidad
// impar el último enfrentamiento queda con un solo lado (bye). Devuelve las casillas
// tal como las consume el RPC `crear_llave_tul` / el contrato `p_rondas`.
export function armarLlaveFormas(participantes: string[]): EnfrentamientoRondaNueva[] {
  const enfrentamientos: EnfrentamientoRondaNueva[] = []
  for (let i = 0; i < participantes.length; i += 2) {
    enfrentamientos.push({
      orden: i / 2,
      a: participantes[i],
      b: participantes[i + 1] ?? null,
    })
  }
  return enfrentamientos
}