import type { Database } from '@/lib/database.types'
import { GRADOS, esGradoDan, etiquetaGrado, type Grado } from '@/constants/grados'

type PerfilRow = Database['public']['Tables']['profiles']['Row']
export type Genero = Database['public']['Enums']['genero']

export type PerfilOnboarding = Pick<
  PerfilRow,
  | 'nombre_completo'
  | 'dni'
  | 'fecha_nacimiento'
  | 'peso_kg'
  | 'genero'
  | 'altura_cm'
  | 'telefono'
  | 'contacto_emergencia_nombre'
  | 'contacto_emergencia_telefono'
  | 'datos_salud'
  | 'grado_actual'
  | 'es_maestro'
  | 'es_profesor'
  | 'maestro_id'
>

export type DatosPerfilACompletar = {
  nombre_completo: string
  dni: string
  fecha_nacimiento: string
  peso_kg: number
  genero: Genero
  altura_cm: number | null
  telefono: string | null
  contacto_emergencia_nombre: string
  contacto_emergencia_telefono: string
  datos_salud: string | null
}

export type AlumnoDirecto = Pick<
  PerfilRow,
  'id' | 'nombre_completo' | 'dni' | 'fecha_nacimiento' | 'genero' | 'grado_actual' | 'contacto_emergencia_nombre' | 'contacto_emergencia_telefono'
>

export type DatosAltaAlumno = {
  nombre_completo: string
  dni: string
  fecha_nacimiento: string
  peso_kg: number
  genero: Genero
  grado_actual: Grado
  altura_cm: number | null
  telefono: string | null
  contacto_emergencia_nombre: string
  contacto_emergencia_telefono: string
  datos_salud: string | null
}

export type AlumnoDetalle = Pick<
  PerfilRow,
  | 'id'
  | 'nombre_completo'
  | 'dni'
  | 'fecha_nacimiento'
  | 'peso_kg'
  | 'genero'
  | 'altura_cm'
  | 'telefono'
  | 'contacto_emergencia_nombre'
  | 'contacto_emergencia_telefono'
  | 'datos_salud'
  | 'grado_actual'
  | 'creado_en'
>

export type InstructorLinaje = {
  id: string
  nombre_completo: string
  grado_actual: Database['public']['Enums']['grado'] | null
  es_profesor: boolean
  es_maestro: boolean
}

export type SolicitudLinaje = Pick<
  Database['public']['Tables']['solicitudes_linaje']['Row'],
  'id' | 'nombre_alumno' | 'grado_solicitado' | 'estado' | 'creado_en'
>

export type Locacion = Pick<
  Database['public']['Tables']['locaciones']['Row'],
  'id' | 'nombre' | 'direccion' | 'valor_alquiler'
>

export type DatosNuevaLocacion = {
  nombre: string
  direccion: string
  valor_alquiler: number
}

export type LocacionDetalle = Locacion & {
  grupos: { id: string; nombre: string }[]
}

export type PagoAlquiler = Pick<
  Database['public']['Tables']['pagos_alquiler']['Row'],
  'id' | 'locacion_id' | 'monto' | 'periodo' | 'fecha_pago' | 'comprobante_url'
>

export type ArchivoAdjunto = {
  uri: string
  nombre: string
  mimeType: string
}

export type DatosPagoAlquiler = {
  locacion_id: string
  monto: number
  periodo: string
  fecha_pago: string
  archivo: ArchivoAdjunto | null
}

export const MENSAJE_CUOTA_DUPLICADA = 'Ya registraste un pago para ese periodo.'

export type EstadoPagoAlquiler = 'al_dia' | 'vencida' | 'sin_pagos'// Locación vista por un superior en la auditoría en cascada (SRS §2).
export type LocacionAuditada = {
  id: string
  nombre: string
  direccion: string
  valor_alquiler: number
  dueno_id: string
  dueno_nombre: string
  ultimo_periodo_pagado: string | null
  ultimo_monto: number | null
  estado_pago: EstadoPagoAlquiler
  meses_adeudados: number
}

export type PagoCuota = Pick<
  Database['public']['Tables']['pagos_cuota']['Row'],
  'id' | 'alumno_id' | 'fecha' | 'monto' | 'periodo'
>

export type DatosPagoCuota = {
  alumno_id: string
  periodo: string
  monto: number
  fecha: string
}

// Estado de la cuota de un alumno para un periodo dado.
export type CuotaAlumno = {
  alumno_id: string
  nombre_completo: string
  grado_actual: Grado | null
  periodo: string
  estado: 'pagado' | 'pendiente'
  pago_id: string | null
  monto: number | null
}

export type EstadoMesa = 'abierta' | 'cerrada' | 'finalizada'

export type MesaExamen = Pick<
  Database['public']['Tables']['mesas_examen']['Row'],
  'id' | 'maestro_id' | 'fecha' | 'lugar'
> & {
  estado: EstadoMesa
  cantidad_postulados: number
}

export type DatosNuevaMesa = {
  fecha: string
  lugar: string
}

export type EstadoPostulacion = 'postulado' | 'aprobado' | 'desaprobado' | 'ausente'

// Resultados que el maestro examinador puede cargar (el estado previo es 'postulado').
export type ResultadoExamen = Exclude<EstadoPostulacion, 'postulado'>

export const MENSAJE_POSTULACION_DUPLICADA = 'El alumno ya está postulado en esta mesa.'
export const MENSAJE_SIN_GRADO_SUPERIOR =
  'El alumno ya alcanzó el grado máximo y no puede aspirar a uno superior.'
export const MENSAJE_YA_EVALUADA = 'Esta postulación ya fue evaluada.'

// La doble graduación (salto de un cinturón) solo aplica desde blanco hasta
// azul punta roja; el grado resultante es +2 (tope rojo punta negra).
export const GRADO_TOPE_DOBLE_GRADUACION: Grado = 'azul_punta_roja'

export function esElegibleDobleGraduacion(grado: Grado | null): boolean {
  if (grado == null) return false
  const indice = GRADOS.indexOf(grado)
  return indice >= 0 && indice <= GRADOS.indexOf(GRADO_TOPE_DOBLE_GRADUACION)
}

export type PostulacionExamen = Pick<
  Database['public']['Tables']['postulaciones_examen']['Row'],
  'id' | 'mesa_id' | 'alumno_id' | 'grado_aspirado' | 'derecho_examen'
> & {
  estado: EstadoPostulacion
  nombre_alumno: string
  mencion_especial: boolean
  promocion_doble: boolean
}

// Etiqueta del desenlace de una postulación evaluada (incluye mención y doble).
export function etiquetaResultadoExamen(resultado: {
  estado: EstadoPostulacion
  mencion_especial: boolean
  promocion_doble: boolean
}): string {
  if (resultado.estado === 'postulado') return 'Pendiente'
  if (resultado.estado === 'desaprobado') return 'Desaprobado'
  if (resultado.estado === 'ausente') return 'Ausente'
  const base = resultado.promocion_doble ? 'Doble graduación' : 'Aprobado'
  return resultado.mencion_especial ? `${base} · Mención especial` : base
}

export type CandidatoPostulacion = {
  alumno_id: string
  nombre_completo: string
  grado_actual: Grado | null
  grado_aspirado: Grado | null
  ya_postulado: boolean
}

export type ResumenRecaudacion = {
  total: number
  conCobro: number
  sinCobro: number
  postulados: number
}

// Suma el derecho de examen de todas las postulaciones de la mesa (SRS §3.7).
export function resumirRecaudacion(postulaciones: PostulacionExamen[]): ResumenRecaudacion {
  let total = 0
  let conCobro = 0
  for (const postulacion of postulaciones) {
    if (postulacion.derecho_examen != null) {
      total += Number(postulacion.derecho_examen)
      conCobro += 1
    }
  }
  return {
    total,
    conCobro,
    sinCobro: postulaciones.length - conCobro,
    postulados: postulaciones.length,
  }
}

// Fila de la planilla técnica (SRS §2, excepción de mesa de examen):
// datos técnicos del RPC `planilla_mesa_examen` + estado de la postulación.
export type FilaPlanillaExamen = {
  postulacion_id: string
  alumno_id: string
  nombre_completo: string
  edad: number | null
  peso: number | null
  grado_actual: Grado | null
  grado_aspirado: Grado
  estado: EstadoPostulacion
  mencion_especial: boolean
  promocion_doble: boolean
}

export type ResumenEvaluacion = {
  total: number
  evaluados: number
  pendientes: number
}

export function resumirEvaluacion(filas: FilaPlanillaExamen[]): ResumenEvaluacion {
  const evaluados = filas.filter((fila) => fila.estado !== 'postulado').length
  return {
    total: filas.length,
    evaluados,
    pendientes: filas.length - evaluados,
  }
}

export const ETIQUETAS_DIAS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export type HorarioGrupo = {
  dia_semana: 1 | 2 | 3 | 4 | 5 | 6 | 7
  hora_inicio: string
  hora_fin: string
}

export type Grupo = {
  id: string
  nombre: string
  horarios: HorarioGrupo[]
  locacion_id: string | null
  nombre_locacion: string | null
  cantidad_miembros: number
  miembro_ids: string[]
}

export type DetalleGrupo = {
  id: string
  nombre: string
  horarios: HorarioGrupo[]
  locacion_id: string | null
  nombre_locacion: string | null
  miembro_ids: string[]
}

export type DatosNuevoGrupo = {
  nombre: string
  horarios: HorarioGrupo[]
  locacion_id: string | null
}

export type FilaGrupoConRelaciones = {
  id: string
  nombre: string
  locacion_id: string | null
  locaciones: { nombre: string } | null
  miembros_grupo: { alumno_id: string }[]
  grupos_horarios: { dia_semana: number; hora_inicio: string; hora_fin: string }[]
}

export const MENSAJE_DNI_DUPLICADO = 'El DNI ya está registrado.'
export const MENSAJE_CONTACTO_NOMBRE_REQUERIDO = 'Ingresá el nombre del contacto de emergencia.'
export const MENSAJE_CONTACTO_NOMBRE_INVALIDO =
  'El nombre del contacto solo puede tener letras, espacios, puntos y guiones.'
export const EDAD_MINIMA_ANIOS = 4

export function perfilCompleto(perfil: PerfilOnboarding | null): boolean {
  if (perfil == null) return false
  return (
    perfil.nombre_completo.trim() !== '' &&
    perfil.dni != null &&
    perfil.fecha_nacimiento != null &&
    perfil.peso_kg != null &&
    perfil.genero != null &&
    esNombreContactoValido(perfil.contacto_emergencia_nombre) &&
    esTelefonoContactoValido(perfil.contacto_emergencia_telefono)
  )
}

export function esProfesorActivo(perfil: PerfilOnboarding | null): boolean {
  return perfil?.es_profesor === true && esGradoDan(perfil.grado_actual)
}

export function esInstructor(perfil: PerfilOnboarding | null): boolean {
  return esProfesorActivo(perfil) || perfil?.es_maestro === true
}

export function aIsoLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function calcularEdad(fechaISO: string | null): number | null {
  if (fechaISO == null) return null
  const partes = fechaISO.split('-').map((parte) => Number(parte))
  if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) return null
  const [anio, mes, dia] = partes
  const hoy = new Date()
  const cumpleaniosDeEsteAnio = new Date(hoy.getFullYear(), mes - 1, dia)
  let edad = hoy.getFullYear() - anio
  if (hoy < cumpleaniosDeEsteAnio) edad -= 1
  return edad
}

export function esDniValido(dni: string): boolean {
  return /^\d{7,8}$/.test(dni.trim())
}

export function parsearNumero(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.')
  if (normalizado === '') return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : null
}

export function esPesoValido(peso: string): boolean {
  const numero = parsearNumero(peso)
  return numero != null && numero > 0 && numero <= 300
}

export function esAlturaValida(altura: string): boolean {
  if (altura.trim() === '') return true
  const numero = parsearNumero(altura)
  return numero != null && numero >= 50 && numero <= 230
}

export function esTelefonoValido(telefono: string): boolean {
  if (telefono.trim() === '') return true
  return /^[+0-9 ()-]{6,20}$/.test(telefono.trim())
}

// Contacto de emergencia: obligatorio (nombre + teléfono con formato).
export function esNombreContactoValido(nombre: string): boolean {
  return /^[A-Za-zÀ-ÿ' .-]{2,60}$/.test(nombre.trim())
}

export function esTelefonoContactoValido(telefono: string): boolean {
  return /^[+0-9 ()-]{6,20}$/.test(telefono.trim())
}

export function fechaValidaNacimiento(fechaISO: string | null): boolean {
  if (fechaISO == null) return false
  const partes = fechaISO.split('-').map((parte) => Number(parte))
  if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) return false
  const [anio, mes, dia] = partes
  const fecha = new Date(anio, mes - 1, dia)
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return false
  if (fecha > new Date()) return false
  const edad = calcularEdad(fechaISO)
  return edad != null && edad >= EDAD_MINIMA_ANIOS
}

export function esNombreValido(nombre: string): boolean {
  return nombre.trim().length >= 2
}

export function esDireccionValida(direccion: string): boolean {
  return direccion.trim().length >= 2
}

export function esMontoValido(monto: string): boolean {
  const numero = parsearNumero(monto)
  return numero != null && numero > 0 && numero <= 99999999
}

export function formatearMonto(monto: number | null | undefined): string {
  if (monto == null || !Number.isFinite(monto)) return 'Sin definir'
  return `$ ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Periodo mensual en formato 'AAAA-MM' (ej. '2026-09').
export function esPeriodoValido(periodo: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo.trim())
}

export function mesActual(): string {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export function formatearPeriodo(periodo: string): string {
  if (!esPeriodoValido(periodo)) return periodo
  const [anio, mes] = periodo.split('-')
  return `${mes}/${anio}`
}

export function esFechaValida(fechaISO: string): boolean {
  if (fechaISO == null || fechaISO.trim() === '') return false
  const partes = fechaISO.split('-').map((parte) => Number(parte))
  if (partes.length !== 3 || partes.some((parte) => !Number.isInteger(parte))) return false
  const [anio, mes, dia] = partes
  const fecha = new Date(anio, mes - 1, dia)
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return false
  return fecha <= new Date()
}

// Diferencia en meses entre dos periodos 'AAAA-MM' (b - a).
function mesesEntre(desde: string, hasta: string): number {
  const [anioA, mesA] = desde.split('-').map(Number)
  const [anioB, mesB] = hasta.split('-').map(Number)
  return (anioB - anioA) * 12 + (mesB - mesA)
}

// El modelo no almacena vencimientos: el estado se DERIVA del último pago.
//   - al_dia:   tiene pago del mes actual o posterior.
//   - vencida:  el último periodo pagado es anterior (meses_adeudados > 0).
//   - sin_pagos: nunca se registró un pago.
export function estadoPagoAlquiler(
  ultimoPeriodo: string | null,
  periodoActual: string = mesActual(),
): { estado: EstadoPagoAlquiler; meses_adeudados: number } {
  if (ultimoPeriodo == null || !esPeriodoValido(ultimoPeriodo)) {
    return { estado: 'sin_pagos', meses_adeudados: 0 }
  }
  const diferencia = mesesEntre(ultimoPeriodo, periodoActual)
  if (diferencia <= 0) return { estado: 'al_dia', meses_adeudados: 0 }
  return { estado: 'vencida', meses_adeudados: diferencia }
}

export function esHorarioGrupoValido(horario: HorarioGrupo): boolean {
  if (horario.dia_semana < 1 || horario.dia_semana > 7) return false
  return esHoraValida(horario.hora_inicio) && esHoraValida(horario.hora_fin) && horaFinPosterior(horario.hora_inicio, horario.hora_fin)
}

export function formatearHorarios(horarios: HorarioGrupo[] | null | undefined): string {
  if (horarios == null || horarios.length === 0) return ''
  return horarios
    .map((h) => `${ETIQUETAS_DIAS[h.dia_semana]} ${h.hora_inicio}–${h.hora_fin}`)
    .join(' · ')
}

export type ClaseItem = {
  id: string
  grupo_id: string
  nombre_grupo?: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string
  objetivo: string | null
  contenido_tuls: string | null
  preparacion_fisica: string | null
}

export type DatosNuevaClase = {
  grupo_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  objetivo: string
  contenido_tuls: string
  preparacion_fisica: string
}

export type AlumnoGrupo = Pick<AlumnoDirecto, 'id' | 'nombre_completo' | 'grado_actual' | 'dni'>

export type AsistenciaItem = {
  alumno_id: string
  presente: boolean
}

export function esHoraValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/.test(hora.trim())
}

export function horaFinPosterior(inicio: string, fin: string): boolean {
  if (!esHoraValida(inicio) || !esHoraValida(fin)) return false
  const [hI, mI] = inicio.split(':').map(Number)
  const [hF, mF] = fin.split(':').map(Number)
  const minI = hI * 60 + mI
  const minF = hF * 60 + mF
  return minF > minI
}

export function esTextoRequerido(texto: string, min = 2): boolean {
  return texto.trim().length >= min
}

// ============================================================
// Dashboard de métricas anonimizadas (SRS §3.6)
// ============================================================

export type VistaMetricas = 'consolidada' | 'especifica'

// Conteo de una categoría listo para graficar.
export type ItemDistribucion = {
  clave: string
  etiqueta: string
  total: number
}

export type MetricasDashboard = {
  total: number
  por_genero: ItemDistribucion[]
  por_rango_edad: ItemDistribucion[]
  por_grado: ItemDistribucion[]
}

const GENEROS_METRICA: { clave: Genero; etiqueta: string }[] = [
  { clave: 'masculino', etiqueta: 'Masculino' },
  { clave: 'femenino', etiqueta: 'Femenino' },
  { clave: 'otro', etiqueta: 'Otro' },
]

// El RPC agrupa los 18-30 y todo lo superior como '30+' (31+ en la práctica):
// se muestra una etiqueta no ambigua, sin tocar la BD.
const RANGOS_EDAD_METRICA: { clave: string; etiqueta: string }[] = [
  { clave: '0-7', etiqueta: '0 a 7' },
  { clave: '8-11', etiqueta: '8 a 11' },
  { clave: '12-14', etiqueta: '12 a 14' },
  { clave: '15-17', etiqueta: '15 a 17' },
  { clave: '18-30', etiqueta: '18 a 30' },
  { clave: '30+', etiqueta: 'Mayores de 30' },
]

function aConteo(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0
}

function leerBloque(bloque: unknown): Record<string, unknown> {
  return bloque != null && typeof bloque === 'object' ? (bloque as Record<string, unknown>) : {}
}

// Normaliza el jsonb del RPC: orden fijo de categorías, 0 para claves ausentes
// y descarte de claves desconocidas. Los grados sin integrantes no se grafican.
export function normalizarMetricas(json: unknown): MetricasDashboard {
  const raiz = leerBloque(json)
  const porGenero = leerBloque(raiz.por_genero)
  const porRango = leerBloque(raiz.por_rango_edad)
  const porGrado = leerBloque(raiz.por_grado)

  return {
    total: aConteo(raiz.total),
    por_genero: GENEROS_METRICA.map(({ clave, etiqueta }) => ({
      clave,
      etiqueta,
      total: aConteo(porGenero[clave]),
    })),
    por_rango_edad: RANGOS_EDAD_METRICA.map(({ clave, etiqueta }) => ({
      clave,
      etiqueta,
      total: aConteo(porRango[clave]),
    })),
    por_grado: GRADOS.map((grado) => ({
      clave: grado,
      etiqueta: etiquetaGrado(grado),
      total: aConteo(porGrado[grado]),
    })).filter((item) => item.total > 0),
  }
}