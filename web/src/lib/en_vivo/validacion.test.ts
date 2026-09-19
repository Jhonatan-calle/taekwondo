import { describe, expect, it } from 'vitest'

import {
  esResultadoCombate,
  esResultadoTul,
  sugerirGanador,
  totalesCombate,
  totalesTul,
  validarResultado,
} from './validacion'

const combateOk = {
  modalidad: 'combate',
  asaltos: [{ numero: 1, puntos_a: 3, puntos_b: 1, penalidades_a: 1, penalidades_b: 0 }],
  resolucion: 'puntos',
}

const tulOk = {
  modalidad: 'tul',
  puntajes: [
    { jurado_nombre: 'Máster', contenido_tecnico_a: 8, presentacion_a: 7, contenido_tecnico_b: 9, presentacion_b: 8 },
  ],
}

describe('validacion: combate', () => {
  it('acepta un combate válido', () => {
    expect(validarResultado('combate', combateOk)).toEqual([])
  })

  it('rechaza entre 0 y 4 asaltos', () => {
    expect(validarResultado('combate', { ...combateOk, asaltos: [] })).toContain(
      'El combate debe tener entre 1 y 3 asaltos.',
    )
    expect(
      validarResultado('combate', {
        ...combateOk,
        asaltos: [
          combateOk.asaltos[0],
          { numero: 2, puntos_a: 1, puntos_b: 1, penalidades_a: 0, penalidades_b: 0 },
          { numero: 3, puntos_a: 1, puntos_b: 1, penalidades_a: 0, penalidades_b: 0 },
          { numero: 4, puntos_a: 1, puntos_b: 1, penalidades_a: 0, penalidades_b: 0 },
        ],
      }),
    ).toContain('El combate debe tener entre 1 y 3 asaltos.')
  })

  it('rechaza puntos o penalidades negativas', () => {
    const mal = { numero: 1, puntos_a: -1, puntos_b: 1, penalidades_a: 0, penalidades_b: 0 }
    expect(validarResultado('combate', { ...combateOk, asaltos: [mal] })).toContain(
      'Los asaltos deben tener puntos y penalidades con valores válidos.',
    )
  })

  it('rechaza una resolución desconocida', () => {
    expect(validarResultado('combate', { ...combateOk, resolucion: 'empate' })).toContain(
      'La resolución del combate no es válida.',
    )
  })

  it('acepta descalificación, retiro y walkover como resoluciones', () => {
    for (const resolucion of ['descalificacion', 'retiro', 'walkover']) {
      expect(validarResultado('combate', { ...combateOk, resolucion })).toEqual([])
    }
  })

  it('rechaza estructuras rotas', () => {
    expect(validarResultado('combate', { modalidad: 'combate' })).toContain(
      'El resultado del combate no es válido.',
    )
  })
})

describe('validacion: tul (formas)', () => {
  it('acepta una forma válida', () => {
    expect(validarResultado('tul', tulOk)).toEqual([])
  })

  it('rechaza sin puntajes de jurado', () => {
    expect(validarResultado('tul', { modalidad: 'tul', puntajes: [] })).toContain(
      'Debe cargarse al menos un puntaje de jurado.',
    )
  })

  it('rechaza puntajes negativos', () => {
    const mal = { ...tulOk.puntajes[0], contenido_tecnico_a: -1 }
    expect(validarResultado('tul', { modalidad: 'tul', puntajes: [mal] })).toContain(
      'Los puntajes deben ser valores válidos no negativos.',
    )
  })

  it('rechaza una modalidad desconocida', () => {
    expect(validarResultado('katas', combateOk)).toContain('La modalidad del resultado no es válida.')
  })
})

describe('validacion: totales', () => {
  it('suma los puntos de cada lado en el combate', () => {
    const r = {
      ...combateOk,
      asaltos: [
        { numero: 1, puntos_a: 1, puntos_b: 2, penalidades_a: 0, penalidades_b: 0 },
        { numero: 2, puntos_a: 3, puntos_b: 1, penalidades_a: 1, penalidades_b: 0 },
        { numero: 3, puntos_a: 0, puntos_b: 2, penalidades_a: 0, penalidades_b: 1 },
      ],
    }
    expect(totalesCombate(r)).toEqual({ a: 4, b: 5 })
  })

  it('suma contenido técnico + presentación en formas', () => {
    const r = {
      modalidad: 'tul',
      puntajes: [
        { jurado_nombre: 'J1', contenido_tecnico_a: 8, presentacion_a: 7, contenido_tecnico_b: 9, presentacion_b: 8 },
        { jurado_nombre: 'J2', contenido_tecnico_a: 9, presentacion_a: 8, contenido_tecnico_b: 8, presentacion_b: 7 },
      ],
    }
    expect(totalesTul(r)).toEqual({ a: 32, b: 32 })
  })

  it('sugiere ganador por totales (a, b o null ante empate)', () => {
    expect(sugerirGanador('combate', combateOk)).toBe('a')
    const empate = { ...combateOk, asaltos: [{ numero: 1, puntos_a: 2, puntos_b: 2, penalidades_a: 0, penalidades_b: 0 }] }
    expect(sugerirGanador('combate', empate)).toBeNull()
    expect(sugerirGanador('tul', tulOk)).toBe('b')
    const empateTul = {
      modalidad: 'tul',
      puntajes: [
        { jurado_nombre: 'Máster', contenido_tecnico_a: 8, presentacion_a: 8, contenido_tecnico_b: 8, presentacion_b: 8 },
      ],
    }
    expect(sugerirGanador('tul', empateTul)).toBeNull()
  })
})

describe('validacion: guards de tipo', () => {
  it('distingue combate de tul', () => {
    expect(esResultadoCombate(combateOk)).toBe(true)
    expect(esResultadoCombate(tulOk)).toBe(false)
    expect(esResultadoTul(tulOk)).toBe(true)
    expect(esResultadoTul(combateOk)).toBe(false)
    expect(esResultadoTul(null)).toBe(false)
  })
})