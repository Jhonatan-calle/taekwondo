// Serialización/validación del payload de llaves (mismo contrato jsonb que
// `generar_llaves`). Funciones puras, pensadas para el Server Action y sus tests.
import type { CategoriaEditor, PayloadGuardarLlaves } from './tipos'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Convierte el estado del editor al payload que consume el RPC guardar_llaves_manuales.
// Descarta enfrentamientos vacíos (defensa ante estados incosistentes).
export function serializarPayload(categorias: CategoriaEditor[]): PayloadGuardarLlaves {
  return {
    categorias: categorias.map((cat) => ({
      nombre: cat.nombre,
      rango_min: cat.rangoMin,
      rango_max_especial: cat.rangoMaxEspecial,
      edad_min: cat.edadMin,
      edad_max: cat.edadMax,
      enfrentamientos: cat.enfrentamientos
        .filter((enf) => enf.a !== null || enf.b !== null)
        .map((enf) => ({ a: enf.a, b: enf.b })),
    })),
  }
}

function esIdValido(valor: unknown): valor is string | null {
  if (valor === null) return true
  if (typeof valor !== 'string') return false
  return valor === '' || UUID_REGEX.test(valor)
}

// Parsea y valida la forma de un payload. Devuelve null ante JSON inválido,
// campos faltantes o ids malformados (defensa de capa Server Action).
export function parsePayload(jason: string): PayloadGuardarLlaves | null {
  try {
    const crudo: unknown = JSON.parse(jason)
    if (typeof crudo !== 'object' || crudo === null) return null
    const categorias = (crudo as { categorias?: unknown }).categorias
    if (!Array.isArray(categorias)) return null

    const resultado: PayloadGuardarLlaves['categorias'] = []
    for (const c of categorias) {
      if (typeof c !== 'object' || c === null) return null
      const cat = c as Record<string, unknown>
      if (typeof cat.nombre !== 'string' || !Array.isArray(cat.enfrentamientos)) return null

      const enfrentamientos: { a: string | null; b: string | null }[] = []
      for (const e of cat.enfrentamientos) {
        if (typeof e !== 'object' || e === null) return null
        const ef = e as Record<string, unknown>
        if (!esIdValido(ef.a) || !esIdValido(ef.b)) return null
        enfrentamientos.push({
          a: typeof ef.a === 'string' && ef.a !== '' ? ef.a : null,
          b: typeof ef.b === 'string' && ef.b !== '' ? ef.b : null,
        })
      }

      resultado.push({
        nombre: cat.nombre,
        rango_min: typeof cat.rango_min === 'string' ? cat.rango_min : null,
        rango_max_especial: typeof cat.rango_max_especial === 'string' ? cat.rango_max_especial : null,
        edad_min: typeof cat.edad_min === 'number' ? cat.edad_min : null,
        edad_max: typeof cat.edad_max === 'number' ? cat.edad_max : null,
        enfrentamientos,
      })
    }

    return { categorias: resultado }
  } catch {
    return null
  }
}

// Valida las reglas de negocio invariantes de las llaves (las mismas que la RPC
// guardar_llaves_manuales aplica como defensa en profundidad). Devuelve mensajes
// amigables y específicos para que el usuario sepa qué corregir.
export function validarReglasLlaves(payload: PayloadGuardarLlaves): string[] {
  const advertencias: string[] = []

  for (const cat of payload.categorias) {
    const presentes: Set<string | null> = new Set()

    for (const ef of cat.enfrentamientos) {
      if (ef.a === ef.b && ef.a !== null) {
        advertencias.push(`En la categoría «${cat.nombre}» hay un enfrentamiento de un participante contra sí mismo.`)
        break
      }

      for (const id of [ef.a, ef.b]) {
        if (id === null) continue
        if (presentes.has(id)) {
          advertencias.push(`En la categoría «${cat.nombre}» un participante está repetido. Quitá la aparición duplicada antes de guardar.`)
          break
        }
        presentes.add(id)
      }
    }
  }

  return advertencias
}