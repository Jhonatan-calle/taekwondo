import { describe, expect, it } from 'vitest'

import type { CategoriaEditor } from './tipos'
import { agregarParticipante, liberarDeCategoria, moverParticipante, ubicacionDe } from './editar'

const CAT_A = 'cat-a'
const CAT_B = 'cat-b'

function baseCategorias(): CategoriaEditor[] {
  return [
    {
      id: CAT_A,
      nombre: 'Blanco a punta amarilla · 8-9 años',
      rangoMin: 'blanco',
      rangoMaxEspecial: null,
      edadMin: 8,
      edadMax: 9,
      enfrentamientos: [
        { id: 'ef-1', a: 'p1', b: 'p2' },
        { id: 'ef-2', a: 'p3', b: null },
      ],
    },
    {
      id: CAT_B,
      nombre: 'Amarillo a punta azul · 10-11 años',
      rangoMin: 'amarillo',
      rangoMaxEspecial: null,
      edadMin: 10,
      edadMax: 11,
      enfrentamientos: [{ id: 'ef-3', a: 'p4', b: 'p5' }],
    },
  ]
}

function ids(categorias: CategoriaEditor[]): string[] {
  const set = new Set<string>()
  for (const cat of categorias) {
    for (const enf of cat.enfrentamientos) {
      if (enf.a) set.add(enf.a)
      if (enf.b) set.add(enf.b)
    }
  }
  return Array.from(set)
}

function apariciones(categorias: CategoriaEditor[], participanteId: string): number {
  return categorias.reduce(
    (total, cat) =>
      total +
      cat.enfrentamientos.reduce(
        (n, enf) => n + (enf.a === participanteId ? 1 : 0) + (enf.b === participanteId ? 1 : 0),
        0,
      ),
    0,
  )
}

describe('editar: ubicación e invariantes', () => {
  it('encuentra la ubicación actual de un participante', () => {
    const u = ubicacionDe(baseCategorias(), 'p2')
    expect(u).toEqual({ categoriaId: CAT_A, enfrentamientoId: 'ef-1', lado: 'b' })
  })

  it('devuelve null para un participante sin ubicar', () => {
    expect(ubicacionDe(baseCategorias(), 'p99')).toBeNull()
  })
})

describe('editar: moverParticipante', () => {
  it('mueve a una casilla vacía liberando la posición original (misma categoría)', () => {
    const res = moverParticipante(baseCategorias(), 'p2', {
      categoriaId: CAT_A,
      enfrentamientoId: 'ef-2',
      lado: 'b',
    })
    expect(ubicacionDe(res, 'p2')).toEqual({ categoriaId: CAT_A, enfrentamientoId: 'ef-2', lado: 'b' })
    expect(res[0].enfrentamientos.find((e) => e.id === 'ef-1')?.b).toBeNull()
  })

  it('desplaza al ocupante de la casilla destino a "sin ubicar"', () => {
    const res = moverParticipante(baseCategorias(), 'p3', {
      categoriaId: CAT_A,
      enfrentamientoId: 'ef-1',
      lado: 'b',
    })
    expect(ubicacionDe(res, 'p3')).toEqual({ categoriaId: CAT_A, enfrentamientoId: 'ef-1', lado: 'b' })
    // p2 (ocupante desplazado) deja de estar en la llave.
    expect(ids(res)).not.toContain('p2')
  })

  it('poda el enfrentamiento que queda vacío al moverse a otra casilla de la misma categoría', () => {
    const res = moverParticipante(baseCategorias(), 'p3', {
      categoriaId: CAT_A,
      enfrentamientoId: 'ef-1',
      lado: 'a',
    })
    const catA = res.find((c) => c.id === CAT_A)!
    // ef-2 (bye de p3) quedó vacío y se poda.
    expect(catA.enfrentamientos.map((e) => e.id)).toEqual(['ef-1'])
    // p3 ocupa la casilla a de ef-1; p1 (desplazado) queda sin ubicar.
    expect(catA.enfrentamientos.find((e) => e.id === 'ef-1')!.a).toBe('p3')
    expect(ubicacionDe(res, 'p1')).toBeNull()
  })

  it('agrega a otra categoría conservando la aparición original (doble categoría)', () => {
    const res = moverParticipante(baseCategorias(), 'p1', {
      categoriaId: CAT_B,
      enfrentamientoId: 'ef-3',
      lado: 'b',
    })
    // p1 aparece en ambas categorías (una vez por categoría).
    expect(apariciones(res, 'p1')).toBe(2)
    expect(res.find((c) => c.id === CAT_A)!.enfrentamientos.find((e) => e.id === 'ef-1')!.a).toBe('p1')
    expect(res.find((c) => c.id === CAT_B)!.enfrentamientos.find((e) => e.id === 'ef-3')!.b).toBe('p1')
    // p5 (ocupante de la casilla destino) queda sin ubicar.
    expect(ids(res)).not.toContain('p5')
  })

  it('mueve a otra casilla de una categoría en la que ya figura (aparición única por categoría)', () => {
    const res = moverParticipante(baseCategorias(), 'p1', {
      categoriaId: CAT_B,
      enfrentamientoId: 'ef-3',
      lado: 'b',
    })
    const res2 = moverParticipante(res, 'p1', {
      categoriaId: CAT_B,
      enfrentamientoId: 'ef-3',
      lado: 'a',
    })
    expect(apariciones(res2, 'p1')).toBe(2)
    expect(res2.find((c) => c.id === CAT_B)!.enfrentamientos.find((e) => e.id === 'ef-3')!.a).toBe('p1')
    expect(res2.find((c) => c.id === CAT_B)!.enfrentamientos.find((e) => e.id === 'ef-3')!.b).toBeNull()
  })

  it('no-op al mover al mismo destino en el que ya estaba', () => {
    const res = moverParticipante(baseCategorias(), 'p2', {
      categoriaId: CAT_A,
      enfrentamientoId: 'ef-1',
      lado: 'b',
    })
    expect(res[0].enfrentamientos.find((e) => e.id === 'ef-1')).toEqual({ id: 'ef-1', a: 'p1', b: 'p2' })
  })

  it('no lanza error al mover a la casilla libre de su propio enfrentamiento bye', () => {
    // p3 es el único ocupante de ef-2 (bye). Al tocar su lado libre, la liberación
    // previa NO debe eliminar el enfrentamiento destino (regresión de Runtime Error).
    const res = moverParticipante(baseCategorias(), 'p3', {
      categoriaId: CAT_A,
      enfrentamientoId: 'ef-2',
      lado: 'b',
    })
    const ef2 = res[0].enfrentamientos.find((e) => e.id === 'ef-2')
    expect(ef2).toBeDefined()
    expect(ef2?.b).toBe('p3')
  })

  it('lanza error si el destino no existe', () => {
    expect(() =>
      moverParticipante(baseCategorias(), 'p1', {
        categoriaId: 'inexistente',
        enfrentamientoId: 'ef-x',
        lado: 'b',
      }),
    ).toThrow('Destino de movimiento inexistente')
  })

  it('mover con destino null equivale a liberar de todas las categorías', () => {
    const res = moverParticipante(baseCategorias(), 'p1', null)
    expect(ubicacionDe(res, 'p1')).toBeNull()
  })
})

describe('editar: liberarDeCategoria', () => {
  it('libera de la categoría indicada y mantiene el enfrentamiento si queda una casilla ocupada', () => {
    const res = liberarDeCategoria(baseCategorias(), 'p2', CAT_A)
    expect(ubicacionDe(res, 'p2')).toBeNull()
    expect(res[0].enfrentamientos.find((e) => e.id === 'ef-1')?.b).toBeNull()
    expect(res[0].enfrentamientos.find((e) => e.id === 'ef-1')?.a).toBe('p1')
  })

  it('poda el enfrentamiento si ambas casillas quedan vacías', () => {
    const res = liberarDeCategoria(baseCategorias(), 'p3', CAT_A)
    const catA = res.find((c) => c.id === CAT_A)!
    expect(catA.enfrentamientos.map((e) => e.id)).toEqual(['ef-1'])
  })

  it('libera SOLO la categoría indicada cuando el participante está en dos categorías', () => {
    const doble = moverParticipante(baseCategorias(), 'p1', {
      categoriaId: CAT_B,
      enfrentamientoId: 'ef-3',
      lado: 'b',
    })
    const res = liberarDeCategoria(doble, 'p1', CAT_B)
    expect(apariciones(res, 'p1')).toBe(1)
    expect(res.find((c) => c.id === CAT_A)!.enfrentamientos.find((e) => e.id === 'ef-1')?.a).toBe('p1')
    // p1 ya no está en CAT_B (el enfrentamiento ef-3 quedó con solo p4).
    expect(res.find((c) => c.id === CAT_B)!.enfrentamientos.find((e) => e.id === 'ef-3')?.b).toBeNull()
    expect(res.find((c) => c.id === CAT_B)!.enfrentamientos.find((e) => e.id === 'ef-3')?.a).toBe('p4')
  })

  it('no-op para un participante no ubicado en esa categoría', () => {
    const original = baseCategorias()
    const res = liberarDeCategoria(original, 'p99', CAT_A)
    expect(res).toEqual(original)
  })
})

describe('editar: agregarParticipante', () => {
  it('ubica en la primera casilla vacía de la categoría', () => {
    const res = agregarParticipante(baseCategorias(), 'p9', CAT_A)
    expect(ubicacionDe(res, 'p9')).toEqual({ categoriaId: CAT_A, enfrentamientoId: 'ef-2', lado: 'b' })
  })

  it('crea un enfrentamiento bye si la categoría no tiene casillas libres', () => {
    const res = agregarParticipante(baseCategorias(), 'p9', CAT_B)
    const catB = res.find((c) => c.id === CAT_B)!
    expect(catB.enfrentamientos).toHaveLength(2)
    const nuevo = catB.enfrentamientos.find((e) => e.a === 'p9')!
    expect(nuevo.b).toBeNull()
  })

  it('agrega a una categoría pero conserva la aparición en otra (doble categoría)', () => {
    const res = agregarParticipante(baseCategorias(), 'p1', CAT_B)
    // p1 sigue en CAT_A y ahora también aparece en CAT_B (bye).
    expect(apariciones(res, 'p1')).toBe(2)
    expect(res.find((c) => c.id === CAT_B)!.enfrentamientos.some((e) => e.a === 'p1')).toBe(true)
    expect(res.find((c) => c.id === CAT_A)!.enfrentamientos.find((e) => e.id === 'ef-1')?.a).toBe('p1')
    expect(res.find((c) => c.id === CAT_A)!.enfrentamientos.find((e) => e.id === 'ef-1')?.b).toBe('p2')
  })

  it('no-op si el participante ya está en esa categoría', () => {
    const res = agregarParticipante(baseCategorias(), 'p1', CAT_A)
    expect(res).toEqual(baseCategorias())
  })
})