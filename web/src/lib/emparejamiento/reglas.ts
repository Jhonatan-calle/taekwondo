// Reglas del Motor de Emparejamiento (SRS §B.2): rangos de cinturón, bandas de edad
// y umbral infantil para la regla bloqueante de peso.

export type RangoCinturon = {
  id: string
  grados: readonly string[]
  etiqueta: string
  rangoMin: string | null
  rangoMaxEspecial: string | null
}

// Rangos de cinturón (filtro primario 1). rangoMaxEspecial cubre el caso "dan"
// porque rango_max (grado_gup) no puede representar grados Dan.
export const RANGOS_CINTURON: readonly RangoCinturon[] = [
  {
    id: 'blanco_a_punta_amarilla',
    grados: ['blanco', 'blanco_punta_amarilla'],
    etiqueta: 'Blanco a punta amarilla',
    rangoMin: 'blanco',
    rangoMaxEspecial: null,
  },
  {
    id: 'amarillo_a_punta_azul',
    grados: ['amarillo', 'amarillo_punta_verde', 'verde', 'verde_punta_azul'],
    etiqueta: 'Amarillo a punta azul',
    rangoMin: 'amarillo',
    rangoMaxEspecial: null,
  },
  {
    id: 'azul_a_punta_negra',
    grados: ['azul', 'azul_punta_roja', 'rojo', 'rojo_punta_negra'],
    etiqueta: 'Azul a punta negra',
    rangoMin: 'azul',
    rangoMaxEspecial: null,
  },
  {
    id: 'dan_1_a_3',
    grados: ['dan_1', 'dan_2', 'dan_3'],
    etiqueta: '1er Dan a 3er Dan',
    rangoMin: null,
    rangoMaxEspecial: 'dan_3',
  },
  {
    id: 'dan_4_en_adelante',
    grados: ['dan_4', 'dan_5', 'dan_6'],
    etiqueta: '4to Dan en adelante',
    rangoMin: null,
    rangoMaxEspecial: 'dan_6',
  },
]

export type BandaEdad = {
  id: string
  min: number
  max: number
  etiqueta: string
}

// Bandas de edad (filtro primario 2). "50+" se modela como 51+ porque 35-50 cubre hasta 50.
export const BANDAS_EDAD: readonly BandaEdad[] = [
  { id: 'hasta_7', min: 0, max: 7, etiqueta: 'Hasta 7 años' },
  { id: '8_9', min: 8, max: 9, etiqueta: '8-9 años' },
  { id: '10_11', min: 10, max: 11, etiqueta: '10-11 años' },
  { id: '12_13', min: 12, max: 13, etiqueta: '12-13 años' },
  { id: '14_16', min: 14, max: 16, etiqueta: '14-16 años' },
  { id: '17_20', min: 17, max: 20, etiqueta: '17-20 años' },
  { id: '21_34', min: 21, max: 34, etiqueta: '21-34 años' },
  { id: '35_50', min: 35, max: 50, etiqueta: '35-50 años' },
  { id: '50_plus', min: 51, max: 9999, etiqueta: '50+ años' },
]

// Edad máxima inclusive que define la categoría infantil (regla de seguridad de ≤ 5 kg).
export const EDAD_MAX_INFANTIL = 13

// Tope de diferencia de peso (kg) aplicable en categorías infantiles (regla bloqueante).
export const LIMITE_PESO_INFANTIL_KG = 5

export function esInfantil(banda: BandaEdad | null): boolean {
  return banda !== null && banda.max <= EDAD_MAX_INFANTIL
}

export function determinarRango(grado: string | null | undefined): RangoCinturon | null {
  if (!grado) return null
  return RANGOS_CINTURON.find((r) => r.grados.includes(grado)) ?? null
}

export function determinarBanda(edad: number): BandaEdad | null {
  return BANDAS_EDAD.find((b) => edad >= b.min && edad <= b.max) ?? null
}

// Edad exacta al día de hoy (aniversario cumplido), igual criterio que la UI.
export function calcularEdad(fechaNacimiento: string): number | null {
  const nac = new Date(`${fechaNacimiento}T00:00:00Z`)
  if (Number.isNaN(nac.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getUTCFullYear() - nac.getUTCFullYear()
  const mes = hoy.getUTCMonth() - nac.getUTCMonth()
  if (mes < 0 || (mes === 0 && hoy.getUTCDate() < nac.getUTCDate())) edad--
  return edad
}