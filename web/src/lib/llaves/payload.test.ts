import { describe, expect, it } from 'vitest'

import type { CategoriaEditor, PayloadGuardarLlaves } from './tipos'
import { parsePayload, serializarPayload, validarReglasLlaves } from './payload'

const UUID = '11111111-1111-1111-1111-111111111111'
const UUID2 = '22222222-2222-2222-2222-222222222222'

function categorias(): CategoriaEditor[] {
  return [
    {
      id: 'cat-1',
      nombre: 'Blanco a punta amarilla · 8-9 años',
      rangoMin: 'blanco',
      rangoMaxEspecial: null,
      edadMin: 8,
      edadMax: 9,
      enfrentamientos: [
        { id: 'ef-1', a: UUID, b: UUID2 },
        { id: 'ef-2', a: UUID2, b: null },
      ],
    },
    {
      id: 'cat-2',
      nombre: '1er Dan a 3er Dan · 14-16 años',
      rangoMin: null,
      rangoMaxEspecial: 'dan_3',
      edadMin: 14,
      edadMax: 16,
      enfrentamientos: [{ id: 'ef-3', a: null, b: null }],
    },
  ]
}

describe('payload: serializarPayload', () => {
  it('serializa el estado del editor al contrato del RPC', () => {
    const payload = serializarPayload(categorias())
    expect(payload.categorias).toHaveLength(2)
    expect(payload.categorias[0]).toEqual({
      nombre: 'Blanco a punta amarilla · 8-9 años',
      rango_min: 'blanco',
      rango_max_especial: null,
      edad_min: 8,
      edad_max: 9,
      enfrentamientos: [
        { a: UUID, b: UUID2 },
        { a: UUID2, b: null },
      ],
    })
  })

  it('descarta enfrentamientos vacíos', () => {
    const payload = serializarPayload(categorias())
    expect(payload.categorias[1].enfrentamientos).toEqual([])
  })
})

describe('payload: parsePayload', () => {
  it('acepta un payload válido', () => {
    const crudo = JSON.stringify(serializarPayload(categorias()))
    const parsed = parsePayload(crudo)
    expect(parsed?.categorias).toHaveLength(2)
    expect(parsed?.categorias[0].enfrentamientos[0]).toEqual({ a: UUID, b: UUID2 })
  })

  it('rechaza JSON inválido', () => {
    expect(parsePayload('no-es-json')).toBeNull()
  })

  it('rechaza payload sin array de categorías', () => {
    expect(parsePayload('{"algo":"distinto"}')).toBeNull()
  })

  it('rechaza ids malformados', () => {
    const malo = serializarPayload(categorias())
    malo.categorias[0].enfrentamientos[0].a = 'no-uuid'
    expect(parsePayload(JSON.stringify(malo))).toBeNull()
  })

  it('rechaza enfrentamientos sin objeto', () => {
    const malo = '{"categorias":[{"nombre":"X","rango_min":null,"rango_max_especial":null,"edad_min":null,"edad_max":null,"enfrentamientos":[42]}]}'
    expect(parsePayload(malo)).toBeNull()
  })
})

describe('payload: validarReglasLlaves', () => {
  function categoria(enfrentamientos: CategoriaEditor['enfrentamientos']): PayloadGuardarLlaves {
    return serializarPayload([
      { id: 'cat-r', nombre: 'Roja', rangoMin: 'roja', rangoMaxEspecial: null, edadMin: 10, edadMax: 12, enfrentamientos },
    ])
  }

  it('no devuelve advertencias para un payload válido', () => {
    const payload = categoria([{ id: 'ef-1', a: UUID, b: UUID2 }, { id: 'ef-2', a: null, b: null }])
    expect(validarReglasLlaves(payload)).toEqual([])
  })

  it('detecta un participante repetido dentro de la misma categoría', () => {
    const payload = categoria([{ id: 'ef-1', a: UUID, b: UUID2 }, { id: 'ef-2', a: UUID, b: null }])
    const advertencias = validarReglasLlaves(payload)
    expect(advertencias).toHaveLength(1)
    expect(advertencias[0]).toContain('repetido')
  })

  it('detecta un auto-enfrentamiento (a === b)', () => {
    const payload = categoria([{ id: 'ef-1', a: UUID, b: UUID }])
    const advertencias = validarReglasLlaves(payload)
    expect(advertencias).toHaveLength(1)
    expect(advertencias[0]).toContain('sí mismo')
  })

  it('permite repetir el mismo participante entre categorías distintas (doble categoría)', () => {
    const payload = serializarPayload([
      { id: 'cat-a', nombre: 'A', rangoMin: null, rangoMaxEspecial: null, edadMin: null, edadMax: null, enfrentamientos: [{ id: 'ef-a', a: UUID, b: null }] },
      { id: 'cat-b', nombre: 'B', rangoMin: null, rangoMaxEspecial: null, edadMin: null, edadMax: null, enfrentamientos: [{ id: 'ef-b', a: UUID, b: null }] },
    ])
    expect(validarReglasLlaves(payload)).toEqual([])
  })
})