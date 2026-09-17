import { describe, expect, it } from 'vitest'

import { armarLlaves } from './index'
import type { Participante } from './tipos'

function nacimientoDe(edad: number): string {
  const hoy = new Date()
  const nac = new Date(
    Date.UTC(hoy.getUTCFullYear() - edad, hoy.getUTCMonth(), hoy.getUTCDate()),
  )
  return nac.toISOString().slice(0, 10)
}

function participante(inscripcionId: string, extras: Partial<Participante> = {}) {
  return {
    inscripcionId,
    grado: 'blanco',
    fechaNacimiento: nacimientoDe(8),
    pesoKg: 30,
    alturaCm: 130,
    nivelAgresividad: 3,
    ...extras,
  } satisfies Participante
}

describe('armarLlaves', () => {
  it('arma una categoría con enfrentamientos y bye al impar', () => {
    const a = participante('a', { pesoKg: 30 })
    const b = participante('b', { pesoKg: 34 })
    const c = participante('c', { pesoKg: 60 })

    const resultado = armarLlaves([a, b, c])

    expect(resultado.payload.categorias).toHaveLength(1)
    const cat = resultado.payload.categorias[0]
    expect(cat.nombre).toBe('Blanco a punta amarilla · 8-9 años')
    expect(cat.rango_min).toBe('blanco')
    expect(cat.rango_max_especial).toBeNull()
    expect(cat.edad_min).toBe(8)
    expect(cat.edad_max).toBe(9)
    expect(cat.enfrentamientos).toHaveLength(2)
    const bye = cat.enfrentamientos.find((e) => e.b === null)
    expect(bye?.a).toBe('c')

    expect(resultado.resumen.categorias[0]).toMatchObject({
      participantes: 3,
      enfrentamientos: 1,
      libres: 1,
      esInfantil: true,
    })
    expect(resultado.resumen.totalConfirmados).toBe(3)
  })

  it('deja como bye a infantiles sin oponente dentro del tope de 5 kg', () => {
    const a = participante('a', { pesoKg: 30 })
    const b = participante('b', { pesoKg: 50 })

    const resultado = armarLlaves([a, b])

    const cat = resultado.payload.categorias[0]
    expect(cat.enfrentamientos).toHaveLength(2) // 0 enfrentamientos válidos + 2 byes
    expect(cat.enfrentamientos.every((e) => e.b === null)).toBe(true)
    expect(resultado.resumen.categorias[0].libres).toBe(2)
  })

  it('formatea los Dan con rango_min null y rango_max_especial', () => {
    const a = participante('a', { grado: 'dan_1', fechaNacimiento: nacimientoDe(40), pesoKg: 80 })
    const b = participante('b', { grado: 'dan_3', fechaNacimiento: nacimientoDe(42), pesoKg: 82 })

    const resultado = armarLlaves([a, b])

    const cat = resultado.payload.categorias[0]
    expect(cat.nombre).toBe('1er Dan a 3er Dan · 35-50 años')
    expect(cat.rango_min).toBeNull()
    expect(cat.rango_max_especial).toBe('dan_3')
    expect(resultado.resumen.categorias[0].esInfantil).toBe(false)
  })

  it('reporta sinCategoria para datos que no encajan en ninguna categoría', () => {
    const raro = participante('x', { grado: 'cinta_espacial' })
    const normal = participante('a', { pesoKg: 30 })

    const resultado = armarLlaves([raro, normal])

    expect(resultado.resumen.sinCategoria).toBe(1)
    expect(resultado.resumen.totalConfirmados).toBe(2)
  })
})