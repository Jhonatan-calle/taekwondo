import { describe, expect, it } from 'vitest'

import { aplicarEventoEnVivo } from './reducer'
import type { EstadoVivo, EventoEnVivo } from './index'

const estadoBase: EstadoVivo = {
  torneo: { id: 'tor-1', nombre: 'Torneo', fecha: '2026-01-10', estado: 'en_vivo' },
  categorias: [
    {
      id: 'cat-1',
      nombre: 'Categoría 1',
      llaves: [
        {
          id: 'llave-0',
          categoriaId: 'cat-1',
          nombreRonda: 'Ronda 0',
          orden: 0,
          modalidad: 'combate',
          enfrentamientos: [
            {
              id: 'ef-0',
              orden: 0,
              a: 'p1',
              b: 'p2',
              ganadorId: null,
              tipo: 'combate',
              estado: 'pendiente',
              resultados: {},
            },
          ],
        },
      ],
    },
  ],
}

function evento(
  tabla: EventoEnVivo['tabla'],
  tipo: EventoEnVivo['tipo'],
  nuevo: Record<string, unknown> = {},
  anterior: Record<string, unknown> = {},
): EventoEnVivo {
  return { tabla, tipo, nuevo, anterior }
}

describe('reducer: evento de llaves', () => {
  it('INSERT agrega la ronda a la categoría con sus enfrentamientos vacíos', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('llaves', 'INSERT', {
      id: 'llave-1',
      categoria_id: 'cat-1',
      nombre_ronda: 'Final',
      orden: 1,
      modalidad: 'combate',
    }))
    expect(res.desincronizado).toBe(false)
    const llaves = res.estado.categorias[0].llaves
    expect(llaves).toHaveLength(2)
    const nueva = llaves.find((l) => l.id === 'llave-1')!
    expect(nueva).toMatchObject({ nombreRonda: 'Final', orden: 1, modalidad: 'combate' })
    expect(nueva.enfrentamientos).toEqual([])
  })

  it('UPDATE actualiza la ronda conservando sus enfrentamientos', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('llaves', 'UPDATE', {
      id: 'llave-0',
      categoria_id: 'cat-1',
      nombre_ronda: 'Primera ronda',
      orden: 0,
      modalidad: 'combate',
    }))
    const llave = res.estado.categorias[0].llaves[0]
    expect(llave.nombreRonda).toBe('Primera ronda')
    expect(llave.enfrentamientos).toHaveLength(1)
  })

  it('DELETE quita la ronda', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('llaves', 'DELETE', {}, { id: 'llave-0' }))
    expect(res.estado.categorias[0].llaves).toEqual([])
  })

  it('ignora una llave de una categoría desconocida', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('llaves', 'INSERT', {
      id: 'llave-x',
      categoria_id: 'cat-inexistente',
    }))
    expect(res.estado.categorias[0].llaves).toHaveLength(1)
  })
})

describe('reducer: evento de enfrentamientos', () => {
  it('INSERT agrega la casilla ordenada por orden', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('enfrentamientos', 'INSERT', {
      id: 'ef-1',
      llave_id: 'llave-0',
      orden: 1,
      participante_a: 'p3',
      participante_b: null,
      ganador_id: null,
      tipo: 'combate',
      estado: 'pendiente',
      resultados: {},
    }))
    const enfs = res.estado.categorias[0].llaves[0].enfrentamientos
    expect(enfs.map((e) => e.id)).toEqual(['ef-0', 'ef-1'])
    expect(enfs[1]).toMatchObject({ a: 'p3', b: null })
  })

  it('UPDATE reemplaza la casilla (resultado cargado)', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('enfrentamientos', 'UPDATE', {
      id: 'ef-0',
      llave_id: 'llave-0',
      orden: 0,
      participante_a: 'p1',
      participante_b: 'p2',
      ganador_id: 'p1',
      tipo: 'combate',
      estado: 'finalizado',
      resultados: { modalidad: 'combate', asaltos: [] },
    }))
    const enf = res.estado.categorias[0].llaves[0].enfrentamientos[0]
    expect(enf.estado).toBe('finalizado')
    expect(enf.ganadorId).toBe('p1')
    expect(enf.resultados).toEqual({ modalidad: 'combate', asaltos: [] })
  })

  it('DELETE quita la casilla', () => {
    const res = aplicarEventoEnVivo(
      estadoBase,
      evento('enfrentamientos', 'DELETE', {}, { id: 'ef-0', llave_id: 'llave-0' }),
    )
    expect(res.estado.categorias[0].llaves[0].enfrentamientos).toEqual([])
  })

  it('marca desincronizado si llega una casilla sin su llave aún en el estado', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('enfrentamientos', 'INSERT', {
      id: 'ef-x',
      llave_id: 'llave-desconocida',
      orden: 0,
      participante_a: 'p1',
      participante_b: null,
      ganador_id: null,
    }))
    expect(res.desincronizado).toBe(true)
    expect(res.estado).toEqual(estadoBase)
  })
})

describe('reducer: evento de torneos', () => {
  it('UPDATE refleja el cambio de estado', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('torneos', 'UPDATE', {
      id: 'tor-1',
      nombre: 'Torneo',
      fecha: '2026-01-10',
      estado: 'finalizado',
    }))
    expect(res.estado.torneo.estado).toBe('finalizado')
  })

  it('ignora eventos de otro torneo', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('torneos', 'UPDATE', {
      id: 'tor-2',
      estado: 'finalizado',
    }))
    expect(res.estado.torneo.estado).toBe('en_vivo')
  })

  it('no muta el estado original', () => {
    const res = aplicarEventoEnVivo(estadoBase, evento('enfrentamientos', 'UPDATE', {
      id: 'ef-0',
      llave_id: 'llave-0',
      orden: 0,
      participante_a: 'p1',
      participante_b: 'p2',
      ganador_id: 'p1',
      tipo: 'combate',
      estado: 'finalizado',
      resultados: {},
    }))
    expect(res.estado).not.toBe(estadoBase)
    expect(estadoBase.categorias[0].llaves[0].enfrentamientos[0].estado).toBe('pendiente')
  })
})