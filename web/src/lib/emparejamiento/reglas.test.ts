import { describe, expect, it } from 'vitest'

import {
  BANDAS_EDAD,
  EDAD_MAX_INFANTIL,
  calcularEdad,
  determinarBanda,
  determinarRango,
  esInfantil,
} from './reglas'

// Nacimiento tal que hoy cumple exactamente `edad` años (determinista en el tiempo).
function nacimientoDe(edad: number): string {
  const hoy = new Date()
  const nac = new Date(
    Date.UTC(hoy.getUTCFullYear() - edad, hoy.getUTCMonth(), hoy.getUTCDate()),
  )
  return nac.toISOString().slice(0, 10)
}

describe('reglas: rangos de cinturón', () => {
  it('mapea cada grado a su rango estricto', () => {
    expect(determinarRango('blanco')?.id).toBe('blanco_a_punta_amarilla')
    expect(determinarRango('blanco_punta_amarilla')?.id).toBe('blanco_a_punta_amarilla')
    expect(determinarRango('amarillo_punta_verde')?.id).toBe('amarillo_a_punta_azul')
    expect(determinarRango('rojo_punta_negra')?.id).toBe('azul_a_punta_negra')
    expect(determinarRango('dan_2')?.id).toBe('dan_1_a_3')
    expect(determinarRango('dan_5')?.id).toBe('dan_4_en_adelante')
  })

  it('devuelve null para grados desconocidos o vacíos', () => {
    expect(determinarRango('cinta_espacial')).toBeNull()
    expect(determinarRango(null)).toBeNull()
  })
})

describe('reglas: bandas de edad', () => {
  it('cubre los nueve rangos del SRS', () => {
    expect(determinarBanda(4)?.id).toBe('hasta_7')
    expect(determinarBanda(9)?.id).toBe('8_9')
    expect(determinarBanda(11)?.id).toBe('10_11')
    expect(determinarBanda(13)?.id).toBe('12_13')
    expect(determinarBanda(15)?.id).toBe('14_16')
    expect(determinarBanda(18)?.id).toBe('17_20')
    expect(determinarBanda(30)?.id).toBe('21_34')
    expect(determinarBanda(45)?.id).toBe('35_50')
    expect(determinarBanda(55)?.id).toBe('50_plus')
    expect(determinarBanda(50)?.id).toBe('35_50')
  })

  it('rechaza edades fuera de rango', () => {
    expect(determinarBanda(-1)).toBeNull()
  })
})

describe('reglas: cálculo de edad e infantil', () => {
  it('calcula la edad exacta con aniversario cumplido', () => {
    expect(calcularEdad(nacimientoDe(10))).toBe(10)
  })

  it('retorna null con fecha inválida', () => {
    expect(calcularEdad('no-es-fecha')).toBeNull()
  })

  it('considera infantil solo a bandas con max ≤ EDAD_MAX_INFANTIL', () => {
    expect(EDAD_MAX_INFANTIL).toBe(13)
    const infantil = BANDAS_EDAD.filter((b) => esInfantil(b)).map((b) => b.id)
    expect(infantil).toEqual(['hasta_7', '8_9', '10_11', '12_13'])
  })
})