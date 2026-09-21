import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { MENSAJE_ERROR_GENERICO, esErrorDeRed, registrarError } from '@/lib/errores'
import { esRechazoEsperado, mensajeAmigableDeErrorAuth, MENSAJE_USUARIO_YA_EXISTE } from '@/lib/auth-mensajes'
import { ejecutarConsulta, type ResultadoConsulta } from '@/lib/consulta-supabase'
import {
  MENSAJE_DNI_DUPLICADO,
  esInstructor as esInstructorDePerfil,
  esProfesorActivo as esProfesorActivoDePerfil,
  perfilCompleto as esPerfilCompleto,
  type DatosPerfilACompletar,
  type InstructorLinaje,
  type PerfilOnboarding,
  type SolicitudLinaje,
  type AlumnoDirecto,
  type AlumnoDetalle,
  type DatosAltaAlumno,
  type Grupo,
  type DetalleGrupo,
  type DatosNuevoGrupo,
  type HorarioGrupo,
  type Locacion,
  type DatosNuevaLocacion,
  type FilaGrupoConRelaciones,
  type ClaseItem,
  type DatosNuevaClase,
  type AlumnoGrupo,
  type AsistenciaItem,
} from '@/lib/perfil'
import type { Grado } from '@/constants/grados'

export type ResultadoAuth = { error: string | null; pendienteConfirmacion?: boolean }

export type ResultadoCreacion = { error: string | null; nuevoId?: string }

type AuthGlobalValue = {
  sesion: Session | null
  cargando: boolean
  perfil: PerfilOnboarding | null
  perfilCompleto: boolean
  gradoActual: Grado | null
  esProfesor: boolean
  esProfesorBandera: boolean
  esMaestro: boolean
  esInstructor: boolean
  linajeEstablecido: boolean
  linajeEnCurso: boolean
  onboardingCompleto: boolean
  iniciarSesion(email: string, password: string): Promise<ResultadoAuth>
  registrarCuenta(email: string, password: string): Promise<ResultadoAuth>
  recuperarContrasena(email: string): Promise<ResultadoAuth>
  verificarDniDisponible(dni: string): Promise<boolean | null>
  completarPerfil(datos: DatosPerfilACompletar): Promise<{ error: string | null }>
  listarAlumnosDirectos(): Promise<ResultadoConsulta<AlumnoDirecto[] | null>>
  obtenerAlumnoDetalle(alumnoId: string): Promise<ResultadoConsulta<AlumnoDetalle | null>>
  altaAlumno(datos: DatosAltaAlumno): Promise<{ error: string | null }>
  listarInstructores(): Promise<ResultadoConsulta<InstructorLinaje[] | null>>
  solicitarLinaje(maestroId: string): Promise<{ error: string | null }>
  listarSolicitudesPendientes(): Promise<ResultadoConsulta<SolicitudLinaje[] | null>>
  resolverSolicitudLinaje(solicitudId: string, resultado: 'aceptada' | 'rechazada'): Promise<{ error: string | null }>
  listarGrupos(): Promise<ResultadoConsulta<Grupo[] | null>>
  crearGrupo(datos: DatosNuevoGrupo): Promise<ResultadoCreacion>
  obtenerGrupoDetalle(grupoId: string): Promise<ResultadoConsulta<DetalleGrupo | null>>
  editarMiembrosGrupo(grupoId: string, alumnoIds: string[]): Promise<{ error: string | null }>
  listarLocaciones(): Promise<ResultadoConsulta<Locacion[] | null>>
  crearLocacion(datos: DatosNuevaLocacion): Promise<ResultadoCreacion>
  listarClases(grupoId?: string): Promise<ResultadoConsulta<ClaseItem[] | null>>
  obtenerClaseDetalle(claseId: string): Promise<ResultadoConsulta<ClaseItem | null>>
  crearClase(datos: DatosNuevaClase): Promise<ResultadoCreacion>
  listarAlumnosDeGrupo(grupoId: string): Promise<ResultadoConsulta<AlumnoGrupo[] | null>>
  listarAsistenciaClase(claseId: string): Promise<ResultadoConsulta<AsistenciaItem[] | null>>
  guardarAsistenciaClase(claseId: string, registros: AsistenciaItem[]): Promise<{ error: string | null }>
  cerrarSesion(): Promise<void>
}

const CAMPOS_PERFIL_SELECT =
  'nombre_completo, dni, fecha_nacimiento, peso_kg, genero, altura_cm, telefono, contacto_emergencia, datos_salud, grado_actual, es_maestro, es_profesor, maestro_id'

const SELECT_GRUPO =
  'id, nombre, locacion_id, locaciones(nombre), miembros_grupo(alumno_id), grupos_horarios(dia_semana, hora_inicio, hora_fin)'

function mapearHorarios(fila: FilaGrupoConRelaciones['grupos_horarios']): HorarioGrupo[] {
  return (fila ?? []).map((h) => ({
    dia_semana: h.dia_semana as HorarioGrupo['dia_semana'],
    hora_inicio: h.hora_inicio,
    hora_fin: h.hora_fin,
  }))
}

function mapearGrupo(fila: FilaGrupoConRelaciones): Grupo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    horarios: mapearHorarios(fila.grupos_horarios),
    locacion_id: fila.locacion_id,
    nombre_locacion: fila.locaciones?.nombre ?? null,
    cantidad_miembros: fila.miembros_grupo?.length ?? 0,
    miembro_ids: fila.miembros_grupo?.map((miembro) => miembro.alumno_id) ?? [],
  }
}

const AuthContext = createContext<AuthGlobalValue | null>(null)

function normalizarErrorAuth(error: unknown, contexto: string): ResultadoAuth {
  if (esRechazoEsperado(error)) {
    return { error: mensajeAmigableDeErrorAuth(error) }
  }
  void registrarError({
    modulo: 'auth',
    contexto,
    error,
    severidad: esErrorDeRed(error) ? 'critical' : 'error',
  })
  return { error: MENSAJE_ERROR_GENERICO }
}

export function AuthGlobalProvider({ children }: PropsWithChildren) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<PerfilOnboarding | null>(null)
  const [linajeEnCurso, setLinajeEnCurso] = useState(false)
  const [cargando, setCargando] = useState(true)

  const refrescarLinajeEnCurso = useCallback(async (usuarioId: string): Promise<void> => {
    const { data, error } = await ejecutarConsulta<{ id: string } | null>(
      Promise.resolve(
        supabase
          .from('solicitudes_linaje')
          .select('id')
          .eq('alumno_id', usuarioId)
          .eq('estado', 'pendiente')
          .maybeSingle(),
      ),
      { modulo: 'perfil', contexto: 'refrescarLinajeEnCurso' },
    )
    if (error == null) setLinajeEnCurso(data != null)
  }, [])

  const refrescarPerfil = useCallback(async (usuarioId: string): Promise<void> => {
    const { data, error } = await ejecutarConsulta<PerfilOnboarding | null>(
      Promise.resolve(
        supabase
          .from('profiles')
          .select(CAMPOS_PERFIL_SELECT)
          .eq('id', usuarioId)
          .maybeSingle(),
      ),
      { modulo: 'perfil', contexto: 'cargarPerfil' },
    )
    if (error == null) setPerfil(data)
    await refrescarLinajeEnCurso(usuarioId)
  }, [refrescarLinajeEnCurso])

  useEffect(() => {
    let activo = true

    const restaurarSesion = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (!activo) return
        if (error) {
          void registrarError({ modulo: 'auth', contexto: 'restaurarSesion', error })
        } else {
          setSesion(data.session)
          if (data.session) await refrescarPerfil(data.session.user.id)
        }
      } catch (error) {
        if (activo) {
          void registrarError({ modulo: 'auth', contexto: 'restaurarSesion', error })
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    restaurarSesion()

    const { data } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion)
      if (evento === 'SIGNED_IN' && nuevaSesion?.user != null) {
        void refrescarPerfil(nuevaSesion.user.id)
      } else if (evento === 'SIGNED_OUT') {
        setPerfil(null)
        setLinajeEnCurso(false)
      }
    })

    return () => {
      activo = false
      data.subscription.unsubscribe()
    }
  }, [refrescarPerfil])

  const iniciarSesion = useCallback(
    async (email: string, password: string): Promise<ResultadoAuth> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return normalizarErrorAuth(error, 'iniciarSesion')
        if (data.session) setSesion(data.session)
        return { error: null }
      } catch (error) {
        return normalizarErrorAuth(error, 'iniciarSesion')
      }
    },
    [],
  )

  const registrarCuenta = useCallback(
    async (email: string, password: string): Promise<ResultadoAuth> => {
      try {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) return normalizarErrorAuth(error, 'registrarCuenta')
        if (data.session) {
          setSesion(data.session)
          return { error: null }
        }
        if (data.user != null && (data.user.identities?.length ?? 0) === 0) {
          return { error: MENSAJE_USUARIO_YA_EXISTE }
        }
        return { error: null, pendienteConfirmacion: data.user != null }
      } catch (error) {
        return normalizarErrorAuth(error, 'registrarCuenta')
      }
    },
    [],
  )

  const recuperarContrasena = useCallback(async (email: string): Promise<ResultadoAuth> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL('nueva-contrasena'),
      })
      if (error) return normalizarErrorAuth(error, 'recuperarContrasena')
      return { error: null }
    } catch (error) {
      return normalizarErrorAuth(error, 'recuperarContrasena')
    }
  }, [])

  const verificarDniDisponible = useCallback(async (dni: string): Promise<boolean | null> => {
    const { data, error } = await ejecutarConsulta<boolean | null>(
      Promise.resolve(supabase.rpc('verificar_dni_disponible', { p_dni: dni })),
      { modulo: 'perfil', contexto: 'verificarDniDisponible' },
    )
    if (error != null || data == null) return null
    return data
  }, [])

  const completarPerfil = useCallback(
    async (datos: DatosPerfilACompletar): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            nombre_completo: datos.nombre_completo,
            dni: datos.dni,
            fecha_nacimiento: datos.fecha_nacimiento,
            peso_kg: datos.peso_kg,
            genero: datos.genero,
            altura_cm: datos.altura_cm,
            telefono: datos.telefono,
            contacto_emergencia: datos.contacto_emergencia,
            datos_salud: datos.datos_salud,
          })
          .eq('id', usuarioId)
          .select(CAMPOS_PERFIL_SELECT)
          .single()
        if (error) {
          if (error.code === '23505') return { error: MENSAJE_DNI_DUPLICADO }
          void registrarError({ modulo: 'perfil', contexto: 'completarPerfil', error })
          return { error: MENSAJE_ERROR_GENERICO }
        }
        setPerfil(data)
        return { error: null }
      } catch (error) {
        void registrarError({
          modulo: 'perfil',
          contexto: 'completarPerfil',
          error,
          severidad: esErrorDeRed(error) ? 'critical' : 'error',
        })
        return { error: MENSAJE_ERROR_GENERICO }
      }
    },
    [sesion?.user?.id],
  )

  const listarAlumnosDirectos = useCallback(
    async (): Promise<ResultadoConsulta<AlumnoDirecto[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<AlumnoDirecto[] | null>(
        Promise.resolve(
          supabase
            .from('profiles')
            .select('id, nombre_completo, dni, fecha_nacimiento, genero, grado_actual, contacto_emergencia')
            .eq('maestro_id', usuarioId)
            .order('nombre_completo', { ascending: true }),
        ),
        { modulo: 'alumnos', contexto: 'listarAlumnosDirectos' },
      )
    },
    [sesion?.user?.id],
  )

  const obtenerAlumnoDetalle = useCallback(
    async (alumnoId: string): Promise<ResultadoConsulta<AlumnoDetalle | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<AlumnoDetalle | null>(
        Promise.resolve(
          supabase
            .from('profiles')
            .select(
              'id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, altura_cm, telefono, contacto_emergencia, datos_salud, grado_actual, creado_en',
            )
            .eq('id', alumnoId)
            .eq('maestro_id', usuarioId)
            .single(),
        ),
        { modulo: 'alumnos', contexto: 'obtenerAlumnoDetalle' },
      )
    },
    [sesion?.user?.id],
  )

  const altaAlumno = useCallback(
    async (datos: DatosAltaAlumno): Promise<{ error: string | null }> => {
      const { data, error } = await ejecutarConsulta<string | null>(
        Promise.resolve(
          supabase.rpc('alta_alumno', {
            p_nombre_completo: datos.nombre_completo,
            p_dni: datos.dni,
            p_fecha_nacimiento: datos.fecha_nacimiento,
            p_peso_kg: datos.peso_kg,
            p_genero: datos.genero,
            p_grado_actual: datos.grado_actual,
            p_altura_cm: datos.altura_cm ?? undefined,
            p_telefono: datos.telefono ?? undefined,
            p_contacto_emergencia: datos.contacto_emergencia ?? undefined,
            p_datos_salud: datos.datos_salud ?? undefined,
          }),
        ),
        { modulo: 'alumnos', contexto: 'altaAlumno' },
      )
      return error != null || data == null ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [],
  )

  const listarInstructores = useCallback(
    async (): Promise<ResultadoConsulta<InstructorLinaje[] | null>> => {
      return ejecutarConsulta<InstructorLinaje[] | null>(
        Promise.resolve(supabase.rpc('lista_instructores_linaje')),
        { modulo: 'perfil', contexto: 'listarInstructores' },
      )
    },
    [],
  )

  const solicitarLinaje = useCallback(
    async (maestroId: string): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(supabase.rpc('solicitar_linaje', { p_instructor: maestroId })),
        { modulo: 'perfil', contexto: 'solicitarLinaje' },
      )
      if (error != null || data !== true) return { error: MENSAJE_ERROR_GENERICO }
      await refrescarLinajeEnCurso(usuarioId)
      return { error: null }
    },
    [sesion?.user?.id, refrescarLinajeEnCurso],
  )

  const listarSolicitudesPendientes = useCallback(
    async (): Promise<ResultadoConsulta<SolicitudLinaje[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<SolicitudLinaje[] | null>(
        Promise.resolve(
          supabase
            .from('solicitudes_linaje')
            .select('id, nombre_alumno, estado, creado_en')
            .eq('instructor_id', usuarioId)
            .eq('estado', 'pendiente')
            .order('creado_en', { ascending: true }),
        ),
        { modulo: 'perfil', contexto: 'listarSolicitudesPendientes' },
      )
    },
    [sesion?.user?.id],
  )

  const resolverSolicitudLinaje = useCallback(
    async (solicitudId: string, resultado: 'aceptada' | 'rechazada'): Promise<{ error: string | null }> => {
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('resolver_solicitud_linaje', { p_solicitud: solicitudId, p_resultado: resultado }),
        ),
        { modulo: 'perfil', contexto: 'resolverSolicitudLinaje' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [],
  )

  const listarGrupos = useCallback(
    async (): Promise<ResultadoConsulta<Grupo[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      const promesa = supabase
        .from('grupos')
        .select(SELECT_GRUPO)
        .eq('profesor_id', usuarioId)
        .order('nombre', { ascending: true })
        .returns<FilaGrupoConRelaciones[]>()
      return ejecutarConsulta<Grupo[] | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => ({
            data: data?.map((fila) => mapearGrupo(fila)) ?? null,
            error,
          })),
        ),
        { modulo: 'grupos', contexto: 'listarGrupos' },
      )
    },
    [sesion?.user?.id],
  )

  const crearGrupo = useCallback(
    async (datos: DatosNuevoGrupo): Promise<ResultadoCreacion> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<string | null>(
        Promise.resolve(
          supabase.rpc('crear_grupo_con_horarios', {
            p_nombre: datos.nombre.trim(),
            p_locacion_id: datos.locacion_id ?? undefined,
            p_horarios: datos.horarios,
          }),
        ),
        { modulo: 'grupos', contexto: 'crearGrupo' },
      )
      return error != null || data == null
        ? { error: MENSAJE_ERROR_GENERICO }
        : { error: null, nuevoId: data }
    },
    [sesion?.user?.id],
  )

  const obtenerGrupoDetalle = useCallback(
    async (grupoId: string): Promise<ResultadoConsulta<DetalleGrupo | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      const promesa = supabase
        .from('grupos')
        .select(SELECT_GRUPO)
        .eq('id', grupoId)
        .eq('profesor_id', usuarioId)
        .maybeSingle()
        .returns<FilaGrupoConRelaciones | null>()
      return ejecutarConsulta<DetalleGrupo | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => {
            if (error != null || data == null) return { data: null, error }
            return {
              data: {
                id: data.id,
                nombre: data.nombre,
                horarios: mapearHorarios(data.grupos_horarios),
                locacion_id: data.locacion_id,
                nombre_locacion: data.locaciones?.nombre ?? null,
                miembro_ids: data.miembros_grupo?.map((miembro) => miembro.alumno_id) ?? [],
              },
              error: null,
            }
          }),
        ),
        { modulo: 'grupos', contexto: 'obtenerGrupoDetalle' },
      )
    },
    [sesion?.user?.id],
  )

  const editarMiembrosGrupo = useCallback(
    async (grupoId: string, alumnoIds: string[]): Promise<{ error: string | null }> => {
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('editar_miembros_grupo', { p_grupo_id: grupoId, p_alumno_ids: alumnoIds }),
        ),
        { modulo: 'grupos', contexto: 'editarMiembrosGrupo' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [],
  )

  const listarLocaciones = useCallback(
    async (): Promise<ResultadoConsulta<Locacion[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<Locacion[] | null>(
        Promise.resolve(
          supabase
            .from('locaciones')
            .select('id, nombre, direccion')
            .eq('creado_por', usuarioId)
            .order('nombre', { ascending: true }),
        ),
        { modulo: 'locaciones', contexto: 'listarLocaciones' },
      )
    },
    [sesion?.user?.id],
  )

  const crearLocacion = useCallback(
    async (datos: DatosNuevaLocacion): Promise<ResultadoCreacion> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('locaciones')
            .insert({
              nombre: datos.nombre.trim(),
              direccion: datos.direccion.trim(),
              creado_por: usuarioId,
            })
            .select('id')
            .single(),
        ),
        { modulo: 'locaciones', contexto: 'crearLocacion' },
      )
      return error != null || data == null
        ? { error: MENSAJE_ERROR_GENERICO }
        : { error: null, nuevoId: data.id }
    },
    [sesion?.user?.id],
  )

  const listarClases = useCallback(
    async (grupoId?: string): Promise<ResultadoConsulta<ClaseItem[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      let consulta = supabase
        .from('clases')
        .select('id, grupo_id, fecha, hora_inicio, hora_fin, objetivo, contenido_tuls, preparacion_fisica, grupos!inner(nombre, profesor_id)')
        .eq('grupos.profesor_id', usuarioId)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false })

      if (grupoId != null && grupoId !== '') {
        consulta = consulta.eq('grupo_id', grupoId)
      }

      type FilaClaseConGrupo = {
        id: string
        grupo_id: string
        fecha: string
        hora_inicio: string
        hora_fin: string
        objetivo: string | null
        contenido_tuls: string | null
        preparacion_fisica: string | null
        grupos: { nombre: string } | null
      }

      return ejecutarConsulta<ClaseItem[] | null>(
        Promise.resolve(
          consulta.returns<FilaClaseConGrupo[]>().then(({ data, error }) => ({
            data:
              data?.map((fila) => ({
                id: fila.id,
                grupo_id: fila.grupo_id,
                nombre_grupo: fila.grupos?.nombre ?? null,
                fecha: fila.fecha,
                hora_inicio: fila.hora_inicio,
                hora_fin: fila.hora_fin,
                objetivo: fila.objetivo,
                contenido_tuls: fila.contenido_tuls,
                preparacion_fisica: fila.preparacion_fisica,
              })) ?? null,
            error,
          })),
        ),
        { modulo: 'clases', contexto: 'listarClases' },
      )
    },
    [sesion?.user?.id],
  )

  const obtenerClaseDetalle = useCallback(
    async (claseId: string): Promise<ResultadoConsulta<ClaseItem | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaClaseDetalle = {
        id: string
        grupo_id: string
        fecha: string
        hora_inicio: string
        hora_fin: string
        objetivo: string | null
        contenido_tuls: string | null
        preparacion_fisica: string | null
        grupos: { nombre: string } | null
      }

      const promesa = supabase
        .from('clases')
        .select('id, grupo_id, fecha, hora_inicio, hora_fin, objetivo, contenido_tuls, preparacion_fisica, grupos!inner(nombre, profesor_id)')
        .eq('id', claseId)
        .eq('grupos.profesor_id', usuarioId)
        .maybeSingle()
        .returns<FilaClaseDetalle | null>()

      return ejecutarConsulta<ClaseItem | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => {
            if (error != null || data == null) return { data: null, error }
            return {
              data: {
                id: data.id,
                grupo_id: data.grupo_id,
                nombre_grupo: data.grupos?.nombre ?? null,
                fecha: data.fecha,
                hora_inicio: data.hora_inicio,
                hora_fin: data.hora_fin,
                objetivo: data.objetivo,
                contenido_tuls: data.contenido_tuls,
                preparacion_fisica: data.preparacion_fisica,
              },
              error: null,
            }
          }),
        ),
        { modulo: 'clases', contexto: 'obtenerClaseDetalle' },
      )
    },
    [sesion?.user?.id],
  )

  const crearClase = useCallback(
    async (datos: DatosNuevaClase): Promise<ResultadoCreacion> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }

      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('clases')
            .insert({
              grupo_id: datos.grupo_id,
              fecha: datos.fecha,
              hora_inicio: datos.hora_inicio.trim(),
              hora_fin: datos.hora_fin.trim(),
              objetivo: datos.objetivo.trim(),
              contenido_tuls: datos.contenido_tuls.trim(),
              preparacion_fisica: datos.preparacion_fisica.trim(),
            })
            .select('id')
            .single(),
        ),
        { modulo: 'clases', contexto: 'crearClase' },
      )

      return error != null || data == null
        ? { error: MENSAJE_ERROR_GENERICO }
        : { error: null, nuevoId: data.id }
    },
    [sesion?.user?.id],
  )

  const listarAlumnosDeGrupo = useCallback(
    async (grupoId: string): Promise<ResultadoConsulta<AlumnoGrupo[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaMiembroConPerfil = {
        alumno_id: string
        profiles: {
          id: string
          nombre_completo: string
          dni: string | null
          grado_actual: AlumnoGrupo['grado_actual']
        } | null
      }

      const promesa = supabase
        .from('miembros_grupo')
        .select(
          'alumno_id, profiles!miembros_grupo_alumno_id_fkey(id, nombre_completo, dni, grado_actual)',
        )
        .eq('grupo_id', grupoId)
        .eq('estado', 'activo')
        .returns<FilaMiembroConPerfil[]>()

      return ejecutarConsulta<AlumnoGrupo[] | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => ({
            data:
              data
                ?.filter((fila) => fila.profiles != null)
                .map((fila) => ({
                  id: fila.profiles!.id,
                  nombre_completo: fila.profiles!.nombre_completo,
                  dni: fila.profiles!.dni,
                  grado_actual: fila.profiles!.grado_actual,
                }))
                .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)) ?? null,
            error,
          })),
        ),
        { modulo: 'asistencia', contexto: 'listarAlumnosDeGrupo' },
      )
    },
    [sesion?.user?.id],
  )

  const listarAsistenciaClase = useCallback(
    async (claseId: string): Promise<ResultadoConsulta<AsistenciaItem[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<AsistenciaItem[] | null>(
        Promise.resolve(
          supabase.from('asistencia').select('alumno_id, presente').eq('clase_id', claseId),
        ),
        { modulo: 'asistencia', contexto: 'listarAsistenciaClase' },
      )
    },
    [sesion?.user?.id],
  )

  const guardarAsistenciaClase = useCallback(
    async (claseId: string, registros: AsistenciaItem[]): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('guardar_asistencia_clase', {
            p_clase_id: claseId,
            p_registros: registros,
          }),
        ),
        { modulo: 'asistencia', contexto: 'guardarAsistenciaClase' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const cerrarSesion = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      void registrarError({ modulo: 'auth', contexto: 'cerrarSesion', error })
    }
    setSesion(null)
    setPerfil(null)
    setLinajeEnCurso(false)
  }, [])

  const perfilCompleto = useMemo(() => esPerfilCompleto(perfil), [perfil])
  const gradoActual = useMemo(() => perfil?.grado_actual ?? null, [perfil])
  const esProfesor = useMemo(() => esProfesorActivoDePerfil(perfil), [perfil])
  const esProfesorBandera = perfil?.es_profesor === true
  const esMaestro = perfil?.es_maestro === true
  const esInstructor = useMemo(() => esInstructorDePerfil(perfil), [perfil])
  const linajeEstablecido = perfil?.maestro_id != null
  const onboardingCompleto = perfilCompleto && (esMaestro || linajeEstablecido || linajeEnCurso)

  const valor = useMemo<AuthGlobalValue>(
    () => ({
      sesion,
      cargando,
      perfil,
      perfilCompleto,
      gradoActual,
      esProfesor,
      esProfesorBandera,
      esMaestro,
      esInstructor,
      linajeEstablecido,
      linajeEnCurso,
      onboardingCompleto,
      iniciarSesion,
      registrarCuenta,
      recuperarContrasena,
      verificarDniDisponible,
      completarPerfil,
      listarAlumnosDirectos,
      obtenerAlumnoDetalle,
      altaAlumno,
      listarInstructores,
      solicitarLinaje,
      listarSolicitudesPendientes,
      resolverSolicitudLinaje,
      listarGrupos,
      crearGrupo,
      obtenerGrupoDetalle,
      editarMiembrosGrupo,
      listarLocaciones,
      crearLocacion,
      listarClases,
      obtenerClaseDetalle,
      crearClase,
      listarAlumnosDeGrupo,
      listarAsistenciaClase,
      guardarAsistenciaClase,
      cerrarSesion,
    }),
    [
      sesion,
      cargando,
      perfil,
      perfilCompleto,
      gradoActual,
      esProfesor,
      esProfesorBandera,
      esMaestro,
      esInstructor,
      linajeEstablecido,
      linajeEnCurso,
      onboardingCompleto,
      iniciarSesion,
      registrarCuenta,
      recuperarContrasena,
      verificarDniDisponible,
      completarPerfil,
      listarAlumnosDirectos,
      obtenerAlumnoDetalle,
      altaAlumno,
      listarInstructores,
      solicitarLinaje,
      listarSolicitudesPendientes,
      resolverSolicitudLinaje,
      listarGrupos,
      crearGrupo,
      obtenerGrupoDetalle,
      editarMiembrosGrupo,
      listarLocaciones,
      crearLocacion,
      listarClases,
      obtenerClaseDetalle,
      crearClase,
      listarAlumnosDeGrupo,
      listarAsistenciaClase,
      guardarAsistenciaClase,
      cerrarSesion,
    ],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuthGlobal(): AuthGlobalValue {
  const contexto = useContext(AuthContext)
  if (!contexto) {
    throw new Error('useAuthGlobal debe usarse dentro de <AuthGlobalProvider>')
  }
  return contexto
}