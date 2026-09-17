import { describe, expect, it } from 'vitest'

import { agruparPorCategoria } from './agrupador'
import type { Participante } from './tipos'

function nacimientoDe(edad: number): string {
  const hoy = new Date()
  const nac = new Date(
    Date.UTC(hoy.getUTCFullYear() - edad, hoy.getUTCMonth(), hoy.getUTCDate()),
  )
  return nac.toISOString().slice(0, 10)
}

function participante(sobreescritos: Partial<Participante> & { inscripcionId: string }) {
  return {
    grado: 'blanco',
    fechaNacimiento: nacimientoDe(8),
    pesoKg: 30,
    alturaCm: 130,
    nivelAgresividad: 3,
    ...sobreescritos,
  }
}

describe('agrupador', () => {
  it('agrupa por cinturón × edad en la misma categoría', () => {
    const { grupos, sinCategoria } = agruparPorCategoria([
      participante({ inscripcionId: 'a', grado: 'blanco', fechaNacimiento: nacimientoDe(8) }),
      participante({ inscripcionId: 'b', grado: 'blanco_punta_amarilla', fechaNacimiento: nacimientoDe(9) }),
    ])
    expect(grupos).toHaveLength(1)
    expect(grupos[0].participantes).toHaveLength(2)
    expect(grupos[0].esInfantil).toBe(true)
    expect(sinCategoria).toEqual([])
  })

  it('separa bandas de edad distintas aunque el cinturón sea el mismo', () => {
    const { grupos } = agruparPorCategoria([
      participante({ inscripcionId: 'a', fechaNacimiento: nacimientoDe(8) }),
      participante({ inscripcionId: 'b', fechaNacimiento: nacimientoDe(30) }),
    ])
    expect(grupos).toHaveLength(2)
  })

  it('reporta sinCategoria a grados desconocidos y fechas inválidas', () => {
    const { grupos, sinCategoria } = agruparPorCategoria([
      participante({ inscripcionId: 'a', grado: 'cinta_espacial' }),
      participante({ inscripcionId: 'b', fechaNacimiento: 'no-es-fecha' }),
    ])
    expect(grupos).toHaveLength(0)
    expect(sinCategoria.sort()).toEqual(['a', 'b'])
  })
})