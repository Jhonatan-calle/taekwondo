// Validación de resultados ITF (combate y formas) + cálculos de totales para
// el autocalculado de la UI. El ganador es SIEMPRE un campo explícito que el
// humano puede sobrescribir: un empate numérico jamás bloquea la llave (la
// competencia lo resuelve por fallo de jueces / superioridad / punto de oro).

import type {
  ResultadoCombate,
  ResultadoEnfrentamiento,
  ResultadoTul,
  ResolucionCombate,
} from './tipos'

const RESOLUCIONES: ResolucionCombate[] = ['puntos', 'descalificacion', 'retiro', 'walkover']

export function esResultadoCombate(r: unknown): r is ResultadoCombate {
  if (typeof r !== 'object' || r === null) return false
  const x = r as Record<string, unknown>
  return x.modalidad === 'combate' && Array.isArray(x.asaltos)
}

export function esResultadoTul(r: unknown): r is ResultadoTul {
  if (typeof r !== 'object' || r === null) return false
  const x = r as Record<string, unknown>
  return x.modalidad === 'tul' && Array.isArray(x.puntajes)
}

// Valida la estructura del resultado cargado. Devuelve la lista de errores.
// La coherencia del ganador vs. los totales NO es bloqueante: solo se sugiere.
export function validarResultado(modalidad: string, resultado: unknown): string[] {
  const errores: string[] = []

  if (modalidad === 'combate') {
    if (!esResultadoCombate(resultado)) return ['El resultado del combate no es válido.']

    const asaltos = resultado.asaltos
    if (asaltos.length < 1 || asaltos.length > 3) {
      errores.push('El combate debe tener entre 1 y 3 asaltos.')
    }
    const invalido = asaltos.find(
      (a) =>
        !Number.isFinite(a.numero) ||
        a.numero < 1 ||
        !Number.isFinite(a.puntos_a) ||
        a.puntos_a < 0 ||
        !Number.isFinite(a.puntos_b) ||
        a.puntos_b < 0 ||
        !Number.isFinite(a.penalidades_a) ||
        a.penalidades_a < 0 ||
        !Number.isFinite(a.penalidades_b) ||
        a.penalidades_b < 0,
    )
    if (invalido) errores.push('Los asaltos deben tener puntos y penalidades con valores válidos.')

    if (!RESOLUCIONES.includes(resultado.resolucion)) {
      errores.push('La resolución del combate no es válida.')
    }
  } else if (modalidad === 'tul') {
    if (!esResultadoTul(resultado)) return ['El resultado de la forma no es válido.']

    if (resultado.puntajes.length < 1) {
      errores.push('Debe cargarse al menos un puntaje de jurado.')
    }
    const invalido = resultado.puntajes.find(
      (p) =>
        !Number.isFinite(p.contenido_tecnico_a) ||
        p.contenido_tecnico_a < 0 ||
        !Number.isFinite(p.presentacion_a) ||
        p.presentacion_a < 0 ||
        !Number.isFinite(p.contenido_tecnico_b) ||
        p.contenido_tecnico_b < 0 ||
        !Number.isFinite(p.presentacion_b) ||
        p.presentacion_b < 0,
    )
    if (invalido) errores.push('Los puntajes deben ser valores válidos no negativos.')
  } else {
    errores.push('La modalidad del resultado no es válida.')
  }

  return errores
}

// Total de puntos por competidor en un combate (suma de puntos; las penalidades
// se registran como dato, no se descuentan automáticamente).
export function totalesCombate(resultado: ResultadoCombate): { a: number; b: number } {
  return resultado.asaltos.reduce(
    (acc, s) => ({ a: acc.a + s.puntos_a, b: acc.b + s.puntos_b }),
    { a: 0, b: 0 },
  )
}

// Total por competidor en formas (contenido técnico + presentación de todos los jurados).
export function totalesTul(resultado: ResultadoTul): { a: number; b: number } {
  return resultado.puntajes.reduce(
    (acc, p) => ({
      a: acc.a + p.contenido_tecnico_a + p.presentacion_a,
      b: acc.b + p.contenido_tecnico_b + p.presentacion_b,
    }),
    { a: 0, b: 0 },
  )
}

// Sugerencia de ganador por totales (null ante empate: decide el jurado/árbitro).
export function sugerirGanador(
  modalidad: string,
  resultado: ResultadoEnfrentamiento,
): 'a' | 'b' | null {
  const totales =
    modalidad === 'combate' && esResultadoCombate(resultado)
      ? totalesCombate(resultado)
      : modalidad === 'tul' && esResultadoTul(resultado)
        ? totalesTul(resultado)
        : null
  if (!totales) return null
  if (totales.a > totales.b) return 'a'
  if (totales.b > totales.a) return 'b'
  return null
}