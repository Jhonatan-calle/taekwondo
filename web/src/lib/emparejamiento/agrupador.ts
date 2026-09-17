// Agrupación de participantes en categorías estrictas (cinturón × edad).
import { calcularEdad, determinarBanda, determinarRango, esInfantil } from './reglas'
import type { Participante } from './tipos'
import type { BandaEdad, RangoCinturon } from './reglas'

export type GrupoCategoria = {
  rango: RangoCinturon
  banda: BandaEdad
  esInfantil: boolean
  participantes: Participante[]
}

// Agrupa por (rango, banda). Los participantes sin datos válidos (grado desconocido
// o fecha de nacimiento inválida → sin banda) van a `sinCategoria`.
export function agruparPorCategoria(
  participantes: Participante[],
): { grupos: GrupoCategoria[]; sinCategoria: string[] } {
  const mapa = new Map<string, GrupoCategoria>()
  const sinCategoria: string[] = []

  for (const p of participantes) {
    const rango = determinarRango(p.grado)
    const banda = determinarBanda(calcularEdad(p.fechaNacimiento) ?? -1)
    if (!rango || !banda) {
      sinCategoria.push(p.inscripcionId)
      continue
    }
    const key = `${rango.id}|${banda.id}`
    const grupo = mapa.get(key)
    if (grupo) {
      grupo.participantes.push(p)
    } else {
      mapa.set(key, {
        rango,
        banda,
        esInfantil: esInfantil(banda),
        participantes: [p],
      })
    }
  }

  return {
    grupos: Array.from(mapa.values()),
    sinCategoria,
  }
}