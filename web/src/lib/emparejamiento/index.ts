// Orquestación del motor: agrupa en categorías estrictas y empareja por reglas,
// devolviendo el payload jsonb para el RPC generar_llaves y el resumen para la UI.
import { agruparPorCategoria } from './agrupador'
import { emparejar } from './emparejador'
import { LIMITE_PESO_INFANTIL_KG } from './reglas'
import type { CategoriaArmada } from './tipos'
import type {
  Participante,
  PayloadCategoria,
  ResultadoArmado,
  ResumenCategoria,
  ResumenEmparejamiento,
} from './tipos'

export type {
  CategoriaArmada,
  Par,
  Participante,
  PayloadCategoria,
  ResultadoArmado,
  ResumenCategoria,
  ResumenEmparejamiento,
} from './tipos'

export function armarLlaves(participantes: Participante[]): ResultadoArmado {
  const { grupos, sinCategoria } = agruparPorCategoria(participantes)

  const categorias: CategoriaArmada[] = []
  const resumenCategorias: ResumenCategoria[] = []

  for (const grupo of grupos) {
    const limitPeso = grupo.esInfantil ? LIMITE_PESO_INFANTIL_KG : null
    const pares = emparejar(grupo.participantes, limitPeso)

    // Byes incluidos en `pares` (participanteB = null): no emparejado, libre en la llave.
    const libres = pares.filter((par) => par.participanteB === null).length
    const enfrentamientos = pares.length - libres

    categorias.push({
      nombre: `${grupo.rango.etiqueta} · ${grupo.banda.etiqueta}`,
      rangoMin: grupo.rango.rangoMin,
      rangoMaxEspecial: grupo.rango.rangoMaxEspecial,
      edadMin: grupo.banda.min,
      edadMax: grupo.banda.max,
      esInfantil: grupo.esInfantil,
      inscripcionIds: grupo.participantes.map((p) => p.inscripcionId),
      pares,
    })

    resumenCategorias.push({
      nombre: `${grupo.rango.etiqueta} · ${grupo.banda.etiqueta}`,
      esInfantil: grupo.esInfantil,
      participantes: grupo.participantes.length,
      enfrentamientos,
      libres,
    })
  }

  const payload: PayloadCategoria[] = categorias.map((c) => ({
    nombre: c.nombre,
    rango_min: c.rangoMin,
    rango_max_especial: c.rangoMaxEspecial,
    edad_min: c.edadMin,
    edad_max: c.edadMax,
    enfrentamientos: c.pares.map((par) => ({
      a: par.participanteA.inscripcionId,
      b: par.participanteB?.inscripcionId ?? null,
    })),
  }))

  const resumen: ResumenEmparejamiento = {
    totalConfirmados: participantes.length,
    sinDatos: 0,
    sinCategoria: sinCategoria.length,
    categorias: resumenCategorias,
  }

  return { categorias, payload: { categorias: payload }, resumen }
}