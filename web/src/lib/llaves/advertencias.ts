// Advertencias de la edición manual de llaves (reglas del sistema). El organizador
// tiene control total (SRS B.2.3), por lo que estas advertencias informan y no bloquean.
// importamos las reglas puras del Motor de Emparejamiento sin modificarlas.
import { RANGOS_CINTURON, determinarRango } from '@/lib/emparejamiento/reglas'

import type { ParticipanteLlave } from './tipos'

export type AdvertenciaLlave = {
  clave: 'peso_infantil' | 'rango_fuera' | 'edad_fuera'
  mensaje: string
}

// Categoría infantil = banda con edad máxima ≤ 13 (espejo de EDAD_MAX_INFANTIL del motor).
export function esCategoriaInfantil(categoria: {
  edadMin: number | null
  edadMax: number | null
}): boolean {
  return categoria.edadMax !== null && categoria.edadMax <= 13
}

// Advertencias al conformar un par A/B dentro de una categoría concreta.
export function advertenciasPar(
  a: ParticipanteLlave | null,
  b: ParticipanteLlave | null,
  categoria: {
    rangoMin: string | null
    rangoMaxEspecial: string | null
    edadMin: number | null
    edadMax: number | null
  },
): AdvertenciaLlave[] {
  const advertencias: AdvertenciaLlave[] = []
  if (!a || !b) return advertencias

  if (
    esCategoriaInfantil(categoria) &&
    a.pesoKg !== null &&
    a.pesoKg > 0 &&
    b.pesoKg !== null &&
    b.pesoKg > 0
  ) {
    const diff = Math.abs(a.pesoKg - b.pesoKg)
    if (diff > 5) {
      advertencias.push({
        clave: 'peso_infantil',
        mensaje: `Categoría infantil: la diferencia de peso (${diff.toFixed(1)} kg) supera el tope de seguridad de 5 kg.`,
      })
    }
  }

  const rangoCategoria = RANGOS_CINTURON.find(
    (r) => r.rangoMin === categoria.rangoMin && r.rangoMaxEspecial === categoria.rangoMaxEspecial,
  )
  if (rangoCategoria) {
    for (const p of [a, b]) {
      const rango = p.grado ? determinarRango(p.grado) : null
      if (rango && rango.id !== rangoCategoria.id) {
        advertencias.push({
          clave: 'rango_fuera',
          mensaje: `${p.nombre} queda fuera del rango de cinturón de esta categoría (${rangoCategoria.etiqueta}).`,
        })
      }
    }
  }

  if (categoria.edadMin !== null && categoria.edadMax !== null) {
    for (const p of [a, b]) {
      if (p.edad !== null && (p.edad < categoria.edadMin || p.edad > categoria.edadMax)) {
        advertencias.push({
          clave: 'edad_fuera',
          mensaje: `${p.nombre} (${p.edad} años) queda fuera del rango de edad de esta categoría (${categoria.edadMin}-${categoria.edadMax} años).`,
        })
      }
    }
  }

  return advertencias
}