// Construcción del historial competitivo de un torneo (filas de
// `resultados_torneo`). Puro y determinista: se calcula desde el bracket leído
// de la BD y lo persiste el RPC `finalizar_torneo`.
//
// Podio por (categoría, modalidad):
//   - 1º  campeón de la final (única ronda con 1 enfrentamiento aritmético).
//   - 2º  finalista perdedor.
//   - 3º  compartido: perdedores de la ronda de 2 enfrentamientos que alimenta
//        a la final (semifinal). Si el bracket arrancó directo en final (n0=1)
//        no hay 3er puesto (categorías de 2 solo 1º/2º).
// Todo participante que apareció en al menos una casilla tiene su fila, con
// posición null si no llegó al podio.

import type { CategoriaVivo, LlaveVivo, ModalidadLlave, RestoTorneo } from './tipos'
import { longitudRonda } from './avance'

type FilaEstadisticas = {
  rondas: Set<number>
  ganadas: number
  perdidas: number
  enfrentamientos: number
  posicion: number | null
}

// Recolecta las estadísticas por participante dentro de una cadena (modalidad).
function estadisticasDe(cadena: LlaveVivo[]): Map<string, FilaEstadisticas> {
  const filas = new Map<string, FilaEstadisticas>()

  const tocar = (inscripcionId: string): FilaEstadisticas => {
    let fila = filas.get(inscripcionId)
    if (!fila) {
      fila = { rondas: new Set(), ganadas: 0, perdidas: 0, enfrentamientos: 0, posicion: null }
      filas.set(inscripcionId, fila)
    }
    return fila
  }

  for (const llave of cadena) {
    for (const enf of llave.enfrentamientos) {
      const a = enf.a
      const b = enf.b

      if (a) tocar(a)
      if (b) tocar(b)

      const disputado = enf.estado === 'finalizado' && enf.ganadorId

      for (const lado of [a, b]) {
        if (!lado) continue
        const fila = tocar(lado)
        fila.rondas.add(llave.orden)
        fila.enfrentamientos++
        if (disputado && enf.ganadorId === lado) fila.ganadas++
        if (disputado && enf.ganadorId !== lado) fila.perdidas++
      }
    }
  }

  return filas
}

// Asigna el podio (1º, 2º, 3º) sobre las filas de una cadena.
function asignarPodio(cadena: LlaveVivo[], filas: Map<string, FilaEstadisticas>, n0: number): void {
  const finales = cadena.filter((l) => longitudRonda(n0, l.orden) === 1)
  const final = finales[0]
  const enfFinal = final?.enfrentamientos.find((e) => e.estado === 'finalizado' && e.ganadorId)

  if (!final || !enfFinal?.ganadorId) return // torneo aún no resuelto: no hay podio

  const campeon = enfFinal.ganadorId
  const subcampeon = enfFinal.a === campeon ? enfFinal.b : enfFinal.a

  filas.get(campeon)!.posicion = 1
  if (subcampeon) filas.get(subcampeon)!.posicion = 2

  // 3º compartido: perdedores de la ronda de 2 enfrentamientos que alimenta a la
  // final (semifinal). Categorías de 2 (n0 = 1) no tienen 3er puesto.
  const semifinal = cadena.find((l) => longitudRonda(n0, l.orden) === 2)
  if (!semifinal || n0 <= 1) return

  for (const enf of semifinal.enfrentamientos) {
    if (enf.estado !== 'finalizado' || !enf.ganadorId) continue
    const perdedor = enf.a === enf.ganadorId ? enf.b : enf.a
    if (perdedor) filas.get(perdedor)!.posicion = 3
  }
}

function filasAResultados(
  categoriaId: string,
  modalidad: ModalidadLlave,
  filas: Map<string, FilaEstadisticas>,
): RestoTorneo[] {
  const resultados: RestoTorneo[] = []
  for (const [inscripcionId, fila] of filas) {
    resultados.push({
      categoria_id: categoriaId,
      inscripcion_id: inscripcionId,
      modalidad,
      posicion: fila.posicion,
      rondas_alcanzadas: fila.rondas.size,
      ganadas: fila.ganadas,
      perdidas: fila.perdidas,
      detalle: { enfrentamientos: fila.enfrentamientos },
    })
  }
  return resultados
}

// Historial completo del torneo: una fila por (participante, categoría, modalidad).
// `_torneoId` se recibe por contrato con el Server Action, pero no se persiste en la
// fila: el RPC `finalizar_torneo` completa el `torneo_id`.
export function construirHistorial(_torneoId: string, categorias: CategoriaVivo[]): RestoTorneo[] {
  const historial: RestoTorneo[] = []

  for (const cat of categorias) {
    const cadenas = new Map<ModalidadLlave, LlaveVivo[]>()
    for (const llave of cat.llaves) {
      const arr = cadenas.get(llave.modalidad) ?? []
      arr.push(llave)
      cadenas.set(llave.modalidad, arr)
    }

    for (const [modalidad, llaves] of cadenas) {
      llaves.sort((x, y) => x.orden - y.orden)
      if (llaves.length === 0) continue
      const n0 = llaves[0].enfrentamientos.length
      if (n0 < 1) continue

      const filas = estadisticasDe(llaves)
      asignarPodio(llaves, filas, n0)
      historial.push(...filasAResultados(cat.id, modalidad, filas))
    }
  }

  return historial
}