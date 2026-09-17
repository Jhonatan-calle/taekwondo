import { describe, expect, it } from 'vitest'

import { emparejar } from './emparejador'
import type { Participante } from './tipos'

function nacimientoDe(edad: number): string {
  const hoy = new Date()
  const nac = new Date(
    Date.UTC(hoy.getUTCFullYear() - edad, hoy.getUTCMonth(), hoy.getUTCDate()),
  )
  return nac.toISOString().slice(0, 10)
}

function participante(pesoKg: number, extras: Partial<Participante> = {}) {
  return {
    inscripcionId: `id-${pesoKg}-${extras.nivelAgresividad ?? 3}-${extras.alturaCm ?? 130}`,
    grado: 'blanco',
    fechaNacimiento: nacimientoDe(8),
    pesoKg,
    alturaCm: 130,
    nivelAgresividad: 3,
    ...extras,
  } satisfies Participante
}

function ids(pares: ReturnType<typeof emparejar>): string[] {
  return pares.map((p) => [p.participanteA.inscripcionId, p.participanteB?.inscripcionId].join('|'))
}

describe('emparejador: mínima diferencia de peso', () => {
  it('empareja por proximidad de peso (global greedy)', () => {
    const [a, b, c, d] = [30, 40, 50, 52].map((w) => participante(w))
    const pares = emparejar([a, b, c, d], null)
    // (50,52) dif 2 y (30,40) dif 10 suman menos que cualquier otra combinación.
    expect(ids(pares)).toContain(`${c.inscripcionId}|${d.inscripcionId}`)
    expect(ids(pares)).toContain(`${a.inscripcionId}|${b.inscripcionId}`)
  })

  it('deja bye al participante impar', () => {
    const [a, b, c] = [30, 40, 50].map((w) => participante(w))
    const pares = emparejar([a, b, c], null)
    expect(ids(pares)).toContain(`${a.inscripcionId}|${b.inscripcionId}`)
    expect(ids(pares)).toContain(`${c.inscripcionId}|`)
  })

  it('una sola persona queda libre (bye)', () => {
    const pares = emparejar([participante(50)], null)
    expect(pares).toHaveLength(1)
    expect(pares[0].participanteB).toBeNull()
  })
})

describe('emparejador: desempates', () => {
  it('a igualdad de peso prioriza agresividad similar', () => {
    const a = participante(30, { nivelAgresividad: 2 })
    const b = participante(30, { nivelAgresividad: 5 })
    const c = participante(30, { nivelAgresividad: 4 })
    const pares = emparejar([a, b, c], null)
    // (b,c) Δagr=1 gana a (a,b) Δagr=3 y a (a,c) Δagr=2.
    expect(ids(pares)).toContain(`${b.inscripcionId}|${c.inscripcionId}`)
    expect(ids(pares)).toContain(`${a.inscripcionId}|`)
  })

  it('a igualdad de peso y agresividad prioriza altura parecida', () => {
    const a = participante(30, { alturaCm: 120 })
    const b = participante(30, { alturaCm: 125 })
    const c = participante(30, { alturaCm: 140 })
    const pares = emparejar([a, b, c], null)
    expect(ids(pares)).toContain(`${a.inscripcionId}|${b.inscripcionId}`)
    expect(ids(pares)).toContain(`${c.inscripcionId}|`)
  })
})

describe('emparejador: regla de seguridad infantil (≤ 5 kg)', () => {
  it('bloquea pares que superan los 5 kg en infantiles', () => {
    const [a, b, c] = [30, 34, 45].map((w) => participante(w))
    const pares = emparejar([a, b, c], 5)
    expect(ids(pares)).toContain(`${a.inscripcionId}|${b.inscripcionId}`)
    expect(ids(pares)).toContain(`${c.inscripcionId}|`)
  })

  it('sin rival dentro del límite, todos quedan libres (bye)', () => {
    const [a, b] = [30, 36].map((w) => participante(w))
    const pares = emparejar([a, b], 5)
    expect(ids(pares)).toContain(`${a.inscripcionId}|`)
    expect(ids(pares)).toContain(`${b.inscripcionId}|`)
  })

  it('en adultos (sin límite) el mismo rango de pesos sí se empareja', () => {
    const [a, b] = [30, 36].map((w) => participante(w))
    expect(ids(emparejar([a, b], null))).toContain(`${a.inscripcionId}|${b.inscripcionId}`)
  })
})

describe('emparejador: determinismo', () => {
  it('produce el mismo resultado con la misma entrada', () => {
    const entrada = [31, 29, 40, 42, 55, 53].map((w) => participante(w, { nivelAgresividad: 4 }))
    const primera = emparejar(entrada, null)
    const segunda = emparejar(entrada, null)
    expect(ids(primera)).toEqual(ids(segunda))
  })
})