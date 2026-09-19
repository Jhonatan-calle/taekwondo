import { describe, expect, it } from 'vitest'

import { construirHistorial } from './historial'
import type { CategoriaVivo, EnfVivo, LlaveVivo, ModalidadLlave } from './tipos'

function enf(
  id: string,
  orden: number,
  a: string | null,
  b: string | null,
  estado: EnfVivo['estado'] = 'pendiente',
  ganadorId: string | null = null,
  modalidad: ModalidadLlave = 'combate',
): EnfVivo {
  return { id, orden, a, b, ganadorId, tipo: modalidad, estado, resultados: {} }
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

function porId(historial: ReturnType<typeof construirHistorial>, id: string) {
  const fila = historial.find((h) => h.inscripcion_id === id)
  expect(fila).toBeDefined()
  return fila!
}

describe('historial: torneo de 4 (podio completo)', () => {
  const categorias = cat([
    llave('combate', 0, [
      enf('sf-0', 0, 'p1', 'p2', 'finalizado', 'p1'),
      enf('sf-1', 1, 'p3', 'p4', 'finalizado', 'p3'),
    ]),
    llave('combate', 1, [enf('fin', 0, 'p1', 'p3', 'finalizado', 'p1')]),
  ])

  const historial = construirHistorial('tor-1', categorias)

  it('campeón 1º, finalista 2º y semifinalistas perdedores 3º (compartido)', () => {
    expect(historial).toHaveLength(4)
    expect(porId(historial, 'p1').posicion).toBe(1)
    expect(porId(historial, 'p3').posicion).toBe(2)
    expect(porId(historial, 'p2').posicion).toBe(3)
    expect(porId(historial, 'p4').posicion).toBe(3)
  })

  it('estadísticas: ganadas, perdidas y rondas alcanzadas', () => {
    const campeon = porId(historial, 'p1')
    expect(campeon.ganadas).toBe(2)
    expect(campeon.perdidas).toBe(0)
    expect(campeon.rondas_alcanzadas).toBe(2)

    const finalista = porId(historial, 'p3')
    expect(finalista.ganadas).toBe(1)
    expect(finalista.perdidas).toBe(1)
    expect(finalista.rondas_alcanzadas).toBe(2)

    const semis = porId(historial, 'p2')
    expect(semis.ganadas).toBe(0)
    expect(semis.perdidas).toBe(1)
    expect(semis.rondas_alcanzadas).toBe(1)
    expect(semis.detalle.enfrentamientos).toBe(1)
  })
})

describe('historial: torneo de 2 (solo 1º/2º)', () => {
  const categorias = cat([
    llave('combate', 0, [enf('fin', 0, 'p1', 'p2', 'finalizado', 'p1')]),
  ])
  const historial = construirHistorial('tor-1', categorias)

  it('sin 3er puesto', () => {
    expect(historial).toHaveLength(2)
    expect(porId(historial, 'p1').posicion).toBe(1)
    expect(porId(historial, 'p2').posicion).toBe(2)
    expect(historial.some((h) => h.posicion === 3)).toBe(false)
  })
})

describe('historial: torneo con bye (3 jugadores)', () => {
  const categorias = cat([
    llave('combate', 0, [
      enf('sf-0', 0, 'p1', 'p2', 'finalizado', 'p1'),
      enf('sf-1', 1, 'p3', null, 'finalizado', 'p3'),
    ]),
    llave('combate', 1, [enf('fin', 0, 'p1', 'p3', 'finalizado', 'p1')]),
  ])
  const historial = construirHistorial('tor-1', categorias)

  it('finalista viajero (bye) es 2º; el perdedor real de la semifinal es 3º', () => {
    expect(historial).toHaveLength(3)
    expect(porId(historial, 'p1').posicion).toBe(1)
    expect(porId(historial, 'p3').posicion).toBe(2)
    expect(porId(historial, 'p2').posicion).toBe(3)
    // El bye cuenta como victoria caminante y pierde la final.
    expect(porId(historial, 'p3').ganadas).toBe(1)
    expect(porId(historial, 'p3').perdidas).toBe(1)
    expect(porId(historial, 'p3').rondas_alcanzadas).toBe(2)
  })
})

describe('historial: torneo inconcluso', () => {
  it('todos los que pelearon tienen fila con posición null hasta resolver la final', () => {
    const categorias = cat([
      llave('combate', 0, [
        enf('sf-0', 0, 'p1', 'p2', 'finalizado', 'p1'),
        enf('sf-1', 1, 'p3', 'p4', 'finalizado', 'p3'),
      ]),
      llave('combate', 1, [enf('fin', 0, 'p1', 'p3')]),
    ])
    const historial = construirHistorial('tor-1', categorias)
    expect(historial).toHaveLength(4)
    expect(historial.every((h) => h.posicion === null)).toBe(true)
  })
})

describe('historial: modalidades separadas', () => {
  it('combate y formas generan filas con su propia modalidad', () => {
    const categorias = cat([
      llave('combate', 0, [enf('c-0', 0, 'p1', 'p2', 'finalizado', 'p1', 'combate')]),
      llave('tul', 0, [enf('t-0', 0, 'p1', 'p2', 'finalizado', 'p1', 'tul')]),
    ])
    const historial = construirHistorial('tor-1', categorias)
    expect(historial).toHaveLength(4)
    expect(historial.filter((h) => h.modalidad === 'combate')).toHaveLength(2)
    expect(historial.filter((h) => h.modalidad === 'tul')).toHaveLength(2)
    // Las filas de la misma persona/modalidad son únicas.
    const claves = historial.map((h) => `${h.inscripcion_id}|${h.modalidad}`)
    expect(new Set(claves).size).toBe(historial.length)
  })
})