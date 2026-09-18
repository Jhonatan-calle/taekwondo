import { describe, expect, it } from 'vitest'

import type { ParticipanteLlave } from './tipos'
import { advertenciasPar, esCategoriaInfantil } from './advertencias'

function participante(sobre: Partial<ParticipanteLlave>): ParticipanteLlave {
  return {
    inscripcionId: '11111111-1111-1111-1111-111111111111',
    nombre: 'Participante',
    grado: 'blanco',
    pesoKg: 30,
    alturaCm: 130,
    edad: 9,
    agresividad: 3,
    ...sobre,
  }
}

const CATEGORIA_BLANCO_INFANTIL = {
  rangoMin: 'blanco',
  rangoMaxEspecial: null,
  edadMin: 8,
  edadMax: 9,
}

describe('advertencias: esCategoriaInfantil', () => {
  it('considera infantil a bandas con edad máxima ≤ 13', () => {
    expect(esCategoriaInfantil({ edadMin: 8, edadMax: 9 })).toBe(true)
    expect(esCategoriaInfantil({ edadMin: 12, edadMax: 13 })).toBe(true)
  })

  it('no considera infantil a bandas mayores o sin tope', () => {
    expect(esCategoriaInfantil({ edadMin: 14, edadMax: 16 })).toBe(false)
    expect(esCategoriaInfantil({ edadMin: null, edadMax: null })).toBe(false)
  })
})

describe('advertencias: advertenciasPar', () => {
  it('sin advertencias para un par dentro de todos los criterios', () => {
    const a = participante({ grado: 'blanco', pesoKg: 30, edad: 9 })
    const b = participante({ inscripcionId: '22222222-2222-2222-2222-222222222222', nombre: 'Rival', grado: 'blanco_punta_amarilla', pesoKg: 32, edad: 8 })
    expect(advertenciasPar(a, b, CATEGORIA_BLANCO_INFANTIL)).toEqual([])
  })

  it('advierte por peso en categoría infantil (diferencia > 5 kg)', () => {
    const a = participante({ pesoKg: 30 })
    const b = participante({ nombre: 'Rival', pesoKg: 41 })
    const resultado = advertenciasPar(a, b, CATEGORIA_BLANCO_INFANTIL)
    expect(resultado.some((w) => w.clave === 'peso_infantil')).toBe(true)
  })

  it('no advierte por peso si la categoría no es infantil', () => {
    const a = participante({ pesoKg: 30 })
    const b = participante({ nombre: 'Rival', pesoKg: 41 })
    const resultado = advertenciasPar(a, b, { ...CATEGORIA_BLANCO_INFANTIL, edadMin: 14, edadMax: 16 })
    expect(resultado.some((w) => w.clave === 'peso_infantil')).toBe(false)
  })

  it('advierte por rango de cinturón fuera de la categoría', () => {
    const a = participante({ grado: 'dan_2' })
    const b = participante({ nombre: 'Rival', grado: 'amarillo' })
    const resultado = advertenciasPar(a, b, CATEGORIA_BLANCO_INFANTIL)
    expect(resultado.some((w) => w.clave === 'rango_fuera')).toBe(true)
  })

  it('advierte por edad fuera del rango de la categoría', () => {
    const a = participante({ edad: 12 })
    const b = participante({ nombre: 'Rival', edad: 9 })
    const resultado = advertenciasPar(a, b, CATEGORIA_BLANCO_INFANTIL)
    expect(resultado.some((w) => w.clave === 'edad_fuera')).toBe(true)
  })

  it('devuelve vacío si falta alguno de los dos participantes', () => {
    expect(advertenciasPar(null, participante({}), CATEGORIA_BLANCO_INFANTIL)).toEqual([])
  })
})