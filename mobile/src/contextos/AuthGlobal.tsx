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
  type Locacion,
  type DatosNuevaLocacion,
  type FilaGrupoConRelaciones,
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
  cerrarSesion(): Promise<void>
}

const CAMPOS_PERFIL_SELECT =
  'nombre_completo, dni, fecha_nacimiento, peso_kg, genero, altura_cm, telefono, contacto_emergencia, datos_salud, grado_actual, es_maestro, es_profesor, maestro_id'

const SELECT_GRUPO =
  'id, nombre, horarios, locacion_id, locaciones(nombre), miembros_grupo(alumno_id)'

function mapearGrupo(fila: FilaGrupoConRelaciones): Grupo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    horarios: fila.horarios,
    locacion_id: fila.locacion_id,
    nombre_locacion: fila.locaciones?.nombre ?? null,
    cantidad_miembros: fila.miembros_grupo?.length ?? 0,
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
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('grupos')
            .insert({
              nombre: datos.nombre.trim(),
              horarios: datos.horarios.trim(),
              locacion_id: datos.locacion_id,
              profesor_id: usuarioId,
            })
            .select('id')
            .single(),
        ),
        { modulo: 'grupos', contexto: 'crearGrupo' },
      )
      return error != null || data == null
        ? { error: MENSAJE_ERROR_GENERICO }
        : { error: null, nuevoId: data.id }
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
                horarios: data.horarios,
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
      const direccion = datos.direccion?.trim() ?? ''
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('locaciones')
            .insert({
              nombre: datos.nombre.trim(),
              direccion: direccion === '' ? null : direccion,
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