// Emparejador basado en reglas (SRS §B.2):
//   - mínima diferencia de peso (primario)
//   - a igualdad: niveles de agresividad similares y estaturas parecidas
//   - categoría infantil: pares con |Δpeso| > límite son inválidos (regla bloqueante)
// Determinista: el desempate final usa inscripcionId.
import type { Par, Participante } from './tipos'

// Costo lexicográfico (Δpeso, Δagresividad, Δaltura, par ordenado de ids).
// Devuelve negativo si a < b, positivo si a > b, 0 si equivalentes.
function compararCosto(
  a: { diffPeso: number; diffAgr: number; diffAlt: number; a: string; b: string },
  b: { diffPeso: number; diffAgr: number; diffAlt: number; a: string; b: string },
): number {
  if (a.diffPeso !== b.diffPeso) return a.diffPeso - b.diffPeso
  if (a.diffAgr !== b.diffAgr) return a.diffAgr - b.diffAgr
  if (a.diffAlt !== b.diffAlt) return a.diffAlt - b.diffAlt
  // Par ordenado canónico (id menor primero) para comparación estable.
  const parA = [a.a, a.b].sort().join('/')
  const parB = [b.a, b.b].sort().join('/')
  return parA < parB ? -1 : parA > parB ? 1 : 0
}

export function emparejar(
  participantes: Participante[],
  limitePesoKg: number | null,
): Par[] {
  const restantes = [...participantes]
  const pares: Par[] = []

  while (restantes.length > 1) {
    let mejorPar: { a: Participante; b: Participante } | null = null
    let mejorCosto: { diffPeso: number; diffAgr: number; diffAlt: number; a: string; b: string } | null =
      null

    for (let i = 0; i < restantes.length; i++) {
      for (let j = i + 1; j < restantes.length; j++) {
        const a = restantes[i]
        const b = restantes[j]
        const diffPeso = Math.abs(a.pesoKg - b.pesoKg)

        // Regla de seguridad infantil (bloqueante): descartar pares que exceden el límite.
        if (limitePesoKg !== null && diffPeso > limitePesoKg) continue

        const diffs = {
          diffPeso,
          diffAgr: Math.abs(a.nivelAgresividad - b.nivelAgresividad),
          diffAlt: Math.abs(a.alturaCm - b.alturaCm),
          a: a.inscripcionId,
          b: b.inscripcionId,
        }

        if (!mejorCosto || compararCosto(diffs, mejorCosto) < 0) {
          mejorCosto = diffs
          mejorPar = { a, b }
        }
      }
    }

    // Sin pares válidos restantes (p. ej. todos los infantiles superan el tope): bye.
    if (!mejorPar) break

    pares.push({ participanteA: mejorPar.a, participanteB: mejorPar.b })
    restantes.splice(restantes.indexOf(mejorPar.a), 1)
    restantes.splice(restantes.indexOf(mejorPar.b), 1)
  }

  // Participantes sin rival (impar o ninguno válido) quedan como bye (participanteB = null).
  for (const restante of restantes) {
    pares.push({ participanteA: restante, participanteB: null })
  }

  return pares
}