import type { Database } from '@/lib/database.types'
import { esGradoDan, type Grado } from '@/constants/grados'

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
  | 'contacto_emergencia'
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
  contacto_emergencia: string | null
  datos_salud: string | null
}

export type AlumnoDirecto = Pick<
  PerfilRow,
  'id' | 'nombre_completo' | 'dni' | 'fecha_nacimiento' | 'genero' | 'grado_actual' | 'contacto_emergencia'
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
  contacto_emergencia: string | null
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
  | 'contacto_emergencia'
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
  'id' | 'nombre_alumno' | 'estado' | 'creado_en'
>

export type Locacion = Pick<
  Database['public']['Tables']['locaciones']['Row'],
  'id' | 'nombre' | 'direccion'
>

export type DatosNuevaLocacion = {
  nombre: string
  direccion: string
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
export const EDAD_MINIMA_ANIOS = 4

export function perfilCompleto(perfil: PerfilOnboarding | null): boolean {
  if (perfil == null) return false
  return (
    perfil.nombre_completo.trim() !== '' &&
    perfil.dni != null &&
    perfil.fecha_nacimiento != null &&
    perfil.peso_kg != null &&
    perfil.genero != null
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