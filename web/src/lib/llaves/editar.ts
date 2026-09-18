// Edición manual de llaves (Panel del Organizador). Funciones puras y deterministas:
// operan sobre el estado de las llaves (CategoriaEditor[]) y devuelven un nuevo estado.
// Invariantes:
//   - Cada participante aparece a lo sumo UNA vez por categoría; puede aparecer en varias
//     categorías (doble categoría: SRS B.2.3 da control total al organizador).
//   - Un enfrentamiento nunca tiene al mismo participante en ambas casillas.
//   - Los enfrentamientos con ambas casillas vacías se podan.
import type { CategoriaEditor, DestinoMover, Lado } from './tipos'

export type Ubicacion = { categoriaId: string; enfrentamientoId: string; lado: Lado }

// Devuelve la primera aparición de un participante en cualquier categoría (o null
// si está totalmente sin ubicar). "Sin ubicar" = 0 apariciones en todo el torneo.
export function ubicacionDe(
  categorias: CategoriaEditor[],
  participanteId: string,
): Ubicacion | null {
  for (const cat of categorias) {
    for (const enf of cat.enfrentamientos) {
      if (enf.a === participanteId) return { categoriaId: cat.id, enfrentamientoId: enf.id, lado: 'a' }
      if (enf.b === participanteId) return { categoriaId: cat.id, enfrentamientoId: enf.id, lado: 'b' }
    }
  }
  return null
}

function estaEnCategoria(cat: CategoriaEditor, participanteId: string): boolean {
  return cat.enfrentamientos.some((enf) => enf.a === participanteId || enf.b === participanteId)
}

// Elimina los enfrentamientos que quedaron con ambas casillas vacías.
export function podarVacios(categorias: CategoriaEditor[]): CategoriaEditor[] {
  return categorias.map((cat) => ({
    ...cat,
    enfrentamientos: cat.enfrentamientos.filter((enf) => enf.a !== null || enf.b !== null),
  }))
}

// Libera a un participante DENTRO de una categoría específica (bye parcial).
// No afecta sus apariciones en otras categorías (doble categoría). No-op si no estaba ahí.
export function liberarDeCategoria(
  categorias: CategoriaEditor[],
  participanteId: string,
  categoriaId: string,
): CategoriaEditor[] {
  const copia = structuredClone(categorias)
  const cat = copia.find((c) => c.id === categoriaId)
  if (!cat) return copia

  for (const enf of cat.enfrentamientos) {
    if (enf.a === participanteId) enf.a = null
    if (enf.b === participanteId) enf.b = null
  }

  return podarVacios(copia)
}

// Libera a un participante de TODAS sus apariciones (bye total).
function liberarDeTodas(categorias: CategoriaEditor[], participanteId: string): CategoriaEditor[] {
  const copia = structuredClone(categorias)
  for (const cat of copia) {
    for (const enf of cat.enfrentamientos) {
      if (enf.a === participanteId) enf.a = null
      if (enf.b === participanteId) enf.b = null
    }
  }
  return podarVacios(copia)
}

// Mueve a un participante a una casilla destino dentro de una categoría.
//   - Solo se libera DENTRO de la categoría destino (las apariciones en otras se conservan).
//   - destino = null equivale a liberar de todas las categorías (bye total).
//   - Si la casilla destino estaba ocupada, el ocupante queda sin ubicar (dentro de esa
//     categoría; puede seguir en otras si estaba en doble categoría).
//   - Si el destino ya era su casilla, no cambia nada.
//   - El destino nunca desaparece por la liberación previa (aunque el participante sea el
//     único ocupante de ese enfrentamiento): la liberación y la colocación operan sobre el
//     mismo estado clonado, y la poda solo ocurre al final.
export function moverParticipante(
  categorias: CategoriaEditor[],
  participanteId: string,
  destino: DestinoMover,
): CategoriaEditor[] {
  if (!destino) return liberarDeTodas(categorias, participanteId)

  const copia = structuredClone(categorias)
  const cat = copia.find((c) => c.id === destino.categoriaId)
  const enf = cat?.enfrentamientos.find((e) => e.id === destino.enfrentamientoId)
  if (!cat || !enf) throw new Error('Destino de movimiento inexistente')

  const ocupante = destino.lado === 'a' ? enf.a : enf.b
  if (ocupante === participanteId) return copia

  // Quitar al participante de esta categoría (una vez por categoría) sin podar todavía,
  // para no eliminar el enfrentamiento destino si era su única casilla.
  for (const e of cat.enfrentamientos) {
    if (e.a === participanteId) e.a = null
    if (e.b === participanteId) e.b = null
  }

  // Desplazar al ocupante de la casilla destino (puede seguir en otras categorías).
  if (ocupante) {
    if (destino.lado === 'a') enf.a = null
    else enf.b = null
  }

  if (destino.lado === 'a') enf.a = participanteId
  else enf.b = participanteId

  return podarVacios(copia)
}

// Ubica a un participante en la primera casilla vacía de una categoría. Mantiene sus
// apariciones en otras categorías (doble categoría). No-op si el participante ya está
// en esa categoría (aparición única por categoría). Si no hay casilla vacía, crea un
// nuevo enfrentamiento bye (A = participante, B = null).
export function agregarParticipante(
  categorias: CategoriaEditor[],
  participanteId: string,
  categoriaId: string,
): CategoriaEditor[] {
  const copia = structuredClone(categorias)
  const cat = copia.find((c) => c.id === categoriaId)
  if (!cat) return copia
  if (estaEnCategoria(cat, participanteId)) return copia

  for (const enf of cat.enfrentamientos) {
    if (enf.a === null) {
      enf.a = participanteId
      return copia
    }
    if (enf.b === null) {
      enf.b = participanteId
      return copia
    }
  }

  cat.enfrentamientos.push({
    id: `nuevo_${cat.id}_${cat.enfrentamientos.length}`,
    a: participanteId,
    b: null,
  })
  return copia
}