import { describe, expect, it } from 'vitest'

import {
  armarLlaveFormas,
  ganadorConocido,
  longitudRonda,
  marcarResultado,
  nombreRonda,
  prepararAvance,
} from './avance'
import type { CategoriaVivo, EnfVivo, LlaveVivo, ModalidadLlave } from './tipos'

function enf(
  id: string,
  orden: number,
  a: string | null,
  b: string | null,
  estado: EnfVivo['estado'] = 'pendiente',
  ganadorId: string | null = null,
): EnfVivo {
  return { id, orden, a, b, ganadorId, tipo: 'combate', estado, resultados: {} }
}

function llave(mod: ModalidadLlave, orden: number, enfrentamientos: EnfVivo[]): LlaveVivo {
  return {
    id: `llave-${mod}-${orden}`,
    categoriaId: 'cat-1',
    nombreRonda: `Ronda ${orden}`,
    orden,
    modalidad: mod,
    enfrentamientos,
  }
}

function cat(llaves: LlaveVivo[]): CategoriaVivo[] {
  return [{ id: 'cat-1', nombre: 'Categoría', llaves }]
}

describe('avance: pares consecutivos (modo válido)', () => {
  it('4 jugadores: ronda 0 (2 casillas) → final de 1 casilla, sin avance extra', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2', 'finalizado', 'p1'),
        enf('ef-1', 1, 'p3', 'p4', 'finalizado', 'p3'),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    expect(cambios).toHaveLength(1)
    expect(cambios[0]).toMatchObject({
      categoria_id: 'cat-1',
      modalidad: 'combate',
      orden: 1,
      nombre_ronda: 'Final',
      enfrentamientos: [{ orden: 0, a: 'p1', b: 'p3' }],
    })
  })

  it('8 jugadores: ronda 0 (4 casillas) → ronda 1 (2) en espera de semifinales', () => {
    const categorias = cat([
      llave(
        'combate',
        0,
        [0, 1, 2, 3].map((i) =>
          enf(`ef-${i}`, i, `p${2 * i + 1}`, `p${2 * i + 2}`, 'finalizado', `p${2 * i + 1}`),
        ),
      ),
    ])
    const cambios = prepararAvance(categorias)
    expect(cambios.map((c) => [c.orden, c.enfrentamientos.length])).toEqual([[1, 2]])
    expect(cambios[0].nombre_ronda).toBe('Semifinal')
    expect(cambios[0].enfrentamientos[0]).toEqual({ orden: 0, a: 'p1', b: 'p3' })
    expect(cambios[0].enfrentamientos[1]).toEqual({ orden: 1, a: 'p5', b: 'p7' })
  })

  it('8 jugadores: al finalizar la semifinal par, la final toma su lado del ganador conocido', () => {
    let categorias = cat([
      llave(
        'combate',
        0,
        [0, 1, 2, 3].map((i) =>
          enf(`ef-${i}`, i, `p${2 * i + 1}`, `p${2 * i + 2}`, 'finalizado', `p${2 * i + 1}`),
        ),
      ),
      llave('combate', 1, [
        enf('sf-0', 0, 'p1', 'p3', 'finalizado', 'p3'),
        enf('sf-1', 1, 'p5', 'p7'),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    const final = cambios.find((c) => c.nombre_ronda === 'Final')
    expect(final).toBeDefined()
    expect(final!.enfrentamientos[0]).toEqual({ orden: 0, a: 'p3', b: null })
  })

  it('el ganador de la casilla con índice par cae en el lado a y el impar en el b', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2', 'finalizado', 'p2'),
        enf('ef-1', 1, 'p3', 'p4', 'finalizado', 'p4'),
        enf('ef-2', 2, 'p5', 'p6', 'finalizado', 'p5'),
        enf('ef-3', 3, 'p7', 'p8', 'finalizado', 'p7'),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    // (ef-0, ef-1) → casilla 0: lado a = ganador par, lado b = ganador impar.
    expect(cambios[0].enfrentamientos[0]).toEqual({ orden: 0, a: 'p2', b: 'p4' })
    expect(cambios[0].enfrentamientos[1]).toEqual({ orden: 1, a: 'p5', b: 'p7' })
  })

  it('emite solo las casillas de la ronda siguiente con al menos un lado conocido', () => {
    // Solo se conoce la casilla impar (bye heredado); las dos primeras están pendientes.
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2'),
        enf('ef-1', 1, 'p3', 'p4'),
        enf('ef-2', 2, 'p5', 'p6', 'finalizado', 'p6'),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    expect(cambios[0].enfrentamientos).toEqual([{ orden: 1, a: 'p6', b: null }])
  })

  it('no emite nada si ninguna casilla decide (dos lados pendientes)', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2'),
        enf('ef-1', 1, 'p3', 'p4'),
      ]),
    ])
    expect(prepararAvance(categorias)).toEqual([])
  })
})

describe('avance: byes auto-avanzan', () => {
  it('3 jugadores: el bye de la ronda 0 llega a la final como lado b', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2'),
        enf('ef-1', 1, 'p3', null),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    expect(cambios).toHaveLength(1)
    expect(cambios[0].nombre_ronda).toBe('Final')
    expect(cambios[0].enfrentamientos[0]).toEqual({ orden: 0, a: null, b: 'p3' })
  })

  it('al finalizar el combate, el avance completa el lado a de la final', () => {
    let categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2'),
        enf('ef-1', 1, 'p3', null),
      ]),
    ])
    categorias = marcarResultado(categorias, 'ef-0', 'p2', {
      modalidad: 'combate',
      asaltos: [{ numero: 1, puntos_a: 1, puntos_b: 3, penalidades_a: 0, penalidades_b: 0 }],
      resolucion: 'puntos',
    })
    const cambios = prepararAvance(categorias)
    expect(cambios[0].enfrentamientos[0]).toEqual({ orden: 0, a: 'p2', b: 'p3' })
  })

  it('cascada de byes: 5 jugadores llega a la final sin pelear el último', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2'),
        enf('ef-1', 1, 'p3', 'p4'),
        enf('ef-2', 2, 'p5', null),
      ]),
    ])
    const cambios = prepararAvance(categorias)
    expect(cambios.map((c) => c.orden)).toEqual([1, 2])
    expect(cambios[0].enfrentamientos).toEqual([{ orden: 1, a: 'p5', b: null }])
    expect(cambios[1].enfrentamientos).toEqual([{ orden: 0, a: null, b: 'p5' }])
    expect(cambios[1].nombre_ronda).toBe('Final')
  })

  it('la final (ronda con ≤ 1 enf aritmético) nunca avanza más allá', () => {
    const categorias = cat([
      llave('combate', 0, [enf('ef-0', 0, 'p1', 'p2', 'finalizado', 'p1')]),
    ])
    expect(prepararAvance(categorias)).toEqual([])
  })
})

describe('avance: idempotencia y aritmética', () => {
  it('repetir prepararAvance sobre el mismo estado devuelve los mismos cambios', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('ef-0', 0, 'p1', 'p2', 'finalizado', 'p1'),
        enf('ef-1', 1, 'p3', 'p4', 'finalizado', 'p3'),
        enf('ef-2', 2, 'p5', 'p6', 'finalizado', 'p5'),
      ]),
    ])
    const una = prepararAvance(categorias)
    const otra = prepararAvance(categorias)
    expect(otra).toEqual(una)
  })

  it('longitud de ronda es aritmética desde la ronda 0', () => {
    expect(longitudRonda(3, 0)).toBe(3)
    expect(longitudRonda(3, 1)).toBe(2)
    expect(longitudRonda(3, 2)).toBe(1)
    expect(longitudRonda(5, 0)).toBe(5)
  })

  it('nombreRonda según la cantidad de casillas', () => {
    expect(nombreRonda(1, 1)).toBe('Final')
    expect(nombreRonda(2, 2)).toBe('Semifinal')
    expect(nombreRonda(1, 3)).toBe('Cuartos de final')
    expect(nombreRonda(1, 4)).toBe('Cuartos de final')
    expect(nombreRonda(1, 6)).toBe('Octavos de final')
    expect(nombreRonda(1, 10)).toBe('Dieciseisavos de final')
    expect(nombreRonda(1, 20)).toBe('Ronda 2')
  })

  it('ganadorConocido: finalizado, bye y dos lados sin decidir', () => {
    expect(ganadorConocido(enf('a', 0, 'p1', 'p2', 'finalizado', 'p1'))).toBe('p1')
    expect(ganadorConocido(enf('b', 0, 'p1', null))).toBe('p1')
    expect(ganadorConocido(enf('c', 0, null, 'p2'))).toBe('p2')
    expect(ganadorConocido(enf('d', 0, 'p1', 'p2'))).toBeNull()
    expect(ganadorConocido(null)).toBeNull()
  })
})

describe('avance: marcarResultado', () => {
  it('marca finalizado con ganador y resultados (clone)', () => {
    const original = cat([llave('combate', 0, [enf('ef-0', 0, 'p1', 'p2')])])
    const resultados = {
      modalidad: 'combate',
      asaltos: [{ numero: 1, puntos_a: 2, puntos_b: 1, penalidades_a: 0, penalidades_b: 1 }],
      resolucion: 'puntos',
    }
    const res = marcarResultado(original, 'ef-0', 'p1', resultados)
    const nuevo = res[0].llaves[0].enfrentamientos[0]
    expect(nuevo.estado).toBe('finalizado')
    expect(nuevo.ganadorId).toBe('p1')
    expect(nuevo.resultados).toEqual(resultados)
    // El original no muta.
    expect(original[0].llaves[0].enfrentamientos[0].estado).toBe('pendiente')
  })

  it('lanza si el enfrentamiento ya finalizó', () => {
    const categorias = cat([
      llave('combate', 0, [enf('ef-0', 0, 'p1', 'p2', 'finalizado', 'p1')]),
    ])
    expect(() =>
      marcarResultado(categorias, 'ef-0', 'p1', {
        modalidad: 'combate',
        asaltos: [],
        resolucion: 'puntos',
      }),
    ).toThrow('El enfrentamiento ya fue cargado.')
  })

  it('lanza si el ganador no está entre los competidores', () => {
    const categorias = cat([llave('combate', 0, [enf('ef-0', 0, 'p1', 'p2')])])
    expect(() =>
      marcarResultado(categorias, 'ef-0', 'p99', {
        modalidad: 'combate',
        asaltos: [],
        resolucion: 'puntos',
      }),
    ).toThrow('El ganador debe ser uno de los competidores del enfrentamiento.')
  })

  it('lanza si el enfrentamiento no existe', () => {
    const categorias = cat([llave('combate', 0, [enf('ef-0', 0, 'p1', 'p2')])])
    expect(() =>
      marcarResultado(categorias, 'ef-9', 'p1', {
        modalidad: 'combate',
        asaltos: [],
        resolucion: 'puntos',
      }),
    ).toThrow('Enfrentamiento inexistente.')
  })
})

describe('avance: armarLlaveFormas', () => {
  it('pares consecutivos con cantidad par', () => {
    expect(armarLlaveFormas(['p1', 'p2', 'p3', 'p4'])).toEqual([
      { orden: 0, a: 'p1', b: 'p2' },
      { orden: 1, a: 'p3', b: 'p4' },
    ])
  })

  it('cantidad impar → último enfrentamiento con bye', () => {
    expect(armarLlaveFormas(['p1', 'p2', 'p3', 'p4', 'p5'])).toEqual([
      { orden: 0, a: 'p1', b: 'p2' },
      { orden: 1, a: 'p3', b: 'p4' },
      { orden: 2, a: 'p5', b: null },
    ])
  })

  it('lista vacía → sin enfrentamientos', () => {
    expect(armarLlaveFormas([])).toEqual([])
  })
})