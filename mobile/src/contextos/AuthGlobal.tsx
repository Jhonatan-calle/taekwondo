import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'
import { File } from 'expo-file-system'
import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'
import { MENSAJE_ERROR_GENERICO, esErrorDeRed, registrarError } from '@/lib/errores'
import { esRechazoEsperado, mensajeAmigableDeErrorAuth, MENSAJE_USUARIO_YA_EXISTE } from '@/lib/auth-mensajes'
import { ejecutarConsulta, type ResultadoConsulta } from '@/lib/consulta-supabase'
import {
  MENSAJE_DNI_DUPLICADO,
  MENSAJE_CUOTA_DUPLICADA,
  MENSAJE_POSTULACION_DUPLICADA,
  normalizarMetricas,
  esInstructor as esInstructorDePerfil,
  esProfesorActivo as esProfesorActivoDePerfil,
  perfilCompleto as esPerfilCompleto,
  estadoPagoAlquiler,
  mesActual,
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
  type LocacionDetalle,
  type PagoAlquiler,
  type DatosPagoAlquiler,
  type LocacionAuditada,
  type PagoCuota,
  type DatosPagoCuota,
  type CuotaAlumno,
  type MesaExamen,
  type DatosNuevaMesa,
  type EstadoMesa,
  type PostulacionExamen,
  type CandidatoPostulacion,
  type EstadoPostulacion,
  type FilaPlanillaExamen,
  type ResultadoExamen,
  type FilaGrupoConRelaciones,
  type ClaseItem,
  type DatosNuevaClase,
  type AlumnoGrupo,
  type AsistenciaItem,
  type VistaMetricas,
  type MetricasDashboard,
} from '@/lib/perfil'
import type { Grado } from '@/constants/grados'
import { gradoSiguiente } from '@/constants/grados'

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
  solicitarLinaje(maestroId: string, grado: Grado): Promise<{ error: string | null }>
  listarSolicitudesPendientes(): Promise<ResultadoConsulta<SolicitudLinaje[] | null>>
  resolverSolicitudLinaje(
    solicitudId: string,
    resultado: 'aceptada' | 'rechazada',
    grado?: Grado,
  ): Promise<{ error: string | null }>
  listarGrupos(): Promise<ResultadoConsulta<Grupo[] | null>>
  crearGrupo(datos: DatosNuevoGrupo): Promise<ResultadoCreacion>
  obtenerGrupoDetalle(grupoId: string): Promise<ResultadoConsulta<DetalleGrupo | null>>
  editarGrupo(grupoId: string, datos: DatosNuevoGrupo): Promise<{ error: string | null }>
  editarMiembrosGrupo(grupoId: string, alumnoIds: string[]): Promise<{ error: string | null }>
  listarLocaciones(): Promise<ResultadoConsulta<Locacion[] | null>>
  obtenerLocacionDetalle(locacionId: string): Promise<ResultadoConsulta<LocacionDetalle | null>>
  crearLocacion(datos: DatosNuevaLocacion): Promise<ResultadoCreacion>
  editarLocacion(locacionId: string, datos: DatosNuevaLocacion): Promise<{ error: string | null }>
  eliminarLocacion(locacionId: string): Promise<{ error: string | null }>
  listarPagosAlquiler(locacionId: string): Promise<ResultadoConsulta<PagoAlquiler[] | null>>
  registrarPagoAlquiler(datos: DatosPagoAlquiler): Promise<{ error: string | null }>
  obtenerUrlComprobante(path: string): Promise<ResultadoConsulta<string | null>>
  eliminarPagoAlquiler(pagoId: string, comprobantePath: string | null): Promise<{ error: string | null }>
  listarInstructoresSubordinados(): Promise<ResultadoConsulta<InstructorLinaje[] | null>>
  listarLocacionesAuditadas(instructorId?: string): Promise<ResultadoConsulta<LocacionAuditada[] | null>>
  obtenerMetricasDashboard(
    vista: VistaMetricas,
    instructorId?: string,
  ): Promise<ResultadoConsulta<MetricasDashboard | null>>
  listarCuotasAlumno(alumnoId: string): Promise<ResultadoConsulta<PagoCuota[] | null>>
  listarCuotasPorPeriodo(periodo: string): Promise<ResultadoConsulta<CuotaAlumno[] | null>>
  registrarCuota(datos: DatosPagoCuota): Promise<{ error: string | null }>
  eliminarCuota(cuotaId: string): Promise<{ error: string | null }>
  listarMesasExamen(): Promise<ResultadoConsulta<MesaExamen[] | null>>
  crearMesaExamen(datos: DatosNuevaMesa): Promise<ResultadoCreacion>
  editarMesaExamen(mesaId: string, datos: DatosNuevaMesa): Promise<{ error: string | null }>
  cambiarEstadoMesa(mesaId: string, estado: EstadoMesa): Promise<{ error: string | null }>
  listarPostulacionesMesa(mesaId: string): Promise<ResultadoConsulta<PostulacionExamen[] | null>>
  listarCandidatosPostulacion(mesaId: string): Promise<ResultadoConsulta<CandidatoPostulacion[] | null>>
  postularAlumno(mesaId: string, alumnoId: string, derechoExamen: number | null): Promise<{ error: string | null }>
  editarDerechoExamen(postulacionId: string, monto: number): Promise<{ error: string | null }>
  quitarPostulacion(postulacionId: string): Promise<{ error: string | null }>
  obtenerPlanillaMesa(mesaId: string): Promise<ResultadoConsulta<FilaPlanillaExamen[] | null>>
  registrarResultadoExamen(
    postulacionId: string,
    resultado: ResultadoExamen,
    mencionEspecial?: boolean,
    promocionDoble?: boolean,
  ): Promise<{ error: string | null }>
  listarClases(grupoId?: string): Promise<ResultadoConsulta<ClaseItem[] | null>>
  obtenerClaseDetalle(claseId: string): Promise<ResultadoConsulta<ClaseItem | null>>
  crearClase(datos: DatosNuevaClase): Promise<ResultadoCreacion>
  listarAlumnosDeGrupo(grupoId: string): Promise<ResultadoConsulta<AlumnoGrupo[] | null>>
  listarAsistenciaClase(claseId: string): Promise<ResultadoConsulta<AsistenciaItem[] | null>>
  guardarAsistenciaClase(claseId: string, registros: AsistenciaItem[]): Promise<{ error: string | null }>
  refrescarMiPerfil(): Promise<void>
  cerrarSesion(): Promise<void>
}

const CAMPOS_PERFIL_SELECT =
  'nombre_completo, dni, fecha_nacimiento, peso_kg, genero, altura_cm, telefono, contacto_emergencia_nombre, contacto_emergencia_telefono, datos_salud, grado_actual, es_maestro, es_profesor, maestro_id'

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

  // Refresco manual del propio perfil (fallback del Realtime, al recuperar foco).
  const refrescarMiPerfil = useCallback(async (): Promise<void> => {
    const usuarioId = sesion?.user?.id
    if (usuarioId == null) return
    await refrescarPerfil(usuarioId)
  }, [sesion?.user?.id, refrescarPerfil])

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

  // Realtime del linaje: el solicitante reacciona en vivo cuando el superior
  // confirma/rechaza (update de su perfil y de su solicitud).
  useEffect(() => {
    const usuarioId = sesion?.user?.id
    if (usuarioId == null) return

    const canal = supabase
      .channel(`linaje:${usuarioId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${usuarioId}` },
        () => {
          void refrescarPerfil(usuarioId)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes_linaje', filter: `alumno_id=eq.${usuarioId}` },
        () => {
          void refrescarLinajeEnCurso(usuarioId)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [sesion?.user?.id, refrescarPerfil, refrescarLinajeEnCurso])

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
            contacto_emergencia_nombre: datos.contacto_emergencia_nombre,
            contacto_emergencia_telefono: datos.contacto_emergencia_telefono,
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
            .select('id, nombre_completo, dni, fecha_nacimiento, genero, grado_actual, contacto_emergencia_nombre, contacto_emergencia_telefono')
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
              'id, nombre_completo, dni, fecha_nacimiento, peso_kg, genero, altura_cm, telefono, contacto_emergencia_nombre, contacto_emergencia_telefono, datos_salud, grado_actual, creado_en',
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
            p_contacto_emergencia_nombre: datos.contacto_emergencia_nombre,
            p_contacto_emergencia_telefono: datos.contacto_emergencia_telefono,
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
    async (maestroId: string, grado: Grado): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('solicitar_linaje', { p_instructor: maestroId, p_grado: grado }),
        ),
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
            .select('id, nombre_alumno, grado_solicitado, estado, creado_en')
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
    async (
      solicitudId: string,
      resultado: 'aceptada' | 'rechazada',
      grado?: Grado,
    ): Promise<{ error: string | null }> => {
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('resolver_solicitud_linaje', {
            p_solicitud: solicitudId,
            p_resultado: resultado,
            p_grado: grado,
          }),
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
      // El alta exige locación (el RPC la recibe como NOT NULL).
      if (datos.locacion_id == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<string | null>(
        Promise.resolve(
          supabase.rpc('crear_grupo_con_horarios', {
            p_nombre: datos.nombre.trim(),
            p_locacion_id: datos.locacion_id,
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

  const listarInstructoresSubordinados = useCallback(
    async (): Promise<ResultadoConsulta<InstructorLinaje[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<InstructorLinaje[] | null>(
        Promise.resolve(
          supabase.rpc('descendientes', { p_ancestro: usuarioId }).then(async ({ data, error }) => {
            if (error != null || data == null) return { data: null, error }
            if (data.length === 0) return { data: [], error: null }
            const resultado = await supabase
              .from('profiles')
              .select('id, nombre_completo, grado_actual, es_profesor, es_maestro')
              .in('id', data)
              .order('nombre_completo', { ascending: true })
            return {
              data: (resultado.data ?? []).map((fila) => ({
                id: fila.id,
                nombre_completo: fila.nombre_completo,
                grado_actual: fila.grado_actual,
                es_profesor: fila.es_profesor === true,
                es_maestro: fila.es_maestro === true,
              })),
              error: resultado.error,
            }
          }),
        ),
        { modulo: 'auditoria', contexto: 'listarInstructoresSubordinados' },
      )
    },
    [sesion?.user?.id],
  )

  // Auditoría en cascada (SRS §2): la RLS `*_select_superior` ya limita a la
  // rama descendente del usuario; aquí solo se arma el resumen para la UI.
  const listarLocacionesAuditadas = useCallback(
    async (instructorId?: string): Promise<ResultadoConsulta<LocacionAuditada[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaLocacionAuditada = {
        id: string
        nombre: string
        direccion: string
        valor_alquiler: number
        creado_por: string
        profiles: { id: string; nombre_completo: string } | null
        pagos_alquiler: { periodo: string; monto: number }[]
      }

      let consulta = supabase
        .from('locaciones')
        .select(
          'id, nombre, direccion, valor_alquiler, creado_por, profiles!locaciones_creado_por_fkey(id, nombre_completo), pagos_alquiler(periodo, monto)',
        )
        .order('nombre', { ascending: true })

      if (instructorId != null && instructorId !== '') {
        consulta = consulta.eq('creado_por', instructorId)
      }

      const periodoActual = mesActual()

      return ejecutarConsulta<LocacionAuditada[] | null>(
        Promise.resolve(
          consulta.returns<FilaLocacionAuditada[]>().then(({ data, error }) => ({
            data: data?.map((fila) => {
              const pagos = [...(fila.pagos_alquiler ?? [])].sort((a, b) =>
                b.periodo.localeCompare(a.periodo),
              )
              const ultimo = pagos[0] ?? null
              const { estado, meses_adeudados } = estadoPagoAlquiler(ultimo?.periodo ?? null, periodoActual)
              return {
                id: fila.id,
                nombre: fila.nombre,
                direccion: fila.direccion,
                valor_alquiler: fila.valor_alquiler,
                dueno_id: fila.creado_por,
                dueno_nombre: fila.profiles?.nombre_completo ?? 'Instructor',
                ultimo_periodo_pagado: ultimo?.periodo ?? null,
                ultimo_monto: ultimo?.monto ?? null,
                estado_pago: estado,
                meses_adeudados,
              } satisfies LocacionAuditada
            }) ?? null,
            error,
          })),
        ),
        { modulo: 'auditoria', contexto: 'listarLocacionesAuditadas' },
      )
    },
    [sesion?.user?.id],
  )

  // Dashboard anonimizado (SRS §3.6): el RPC devuelve SOLO conteos de la rama
  // (consolidada = descendientes del usuario; específica = de un subordinado).
  const obtenerMetricasDashboard = useCallback(
    async (
      vista: VistaMetricas,
      instructorId?: string,
    ): Promise<ResultadoConsulta<MetricasDashboard | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<MetricasDashboard | null>(
        Promise.resolve(
          supabase
            .rpc('metricas_dashboard', {
              p_vista: vista,
              p_instructor: vista === 'especifica' ? instructorId : undefined,
            })
            .then(({ data, error }) => ({
              data: error == null && data != null ? normalizarMetricas(data) : null,
              error,
            })),
        ),
        { modulo: 'estadisticas', contexto: 'obtenerMetricasDashboard' },
      )
    },
    [sesion?.user?.id],
  )

  const listarCuotasAlumno = useCallback(
    async (alumnoId: string): Promise<ResultadoConsulta<PagoCuota[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<PagoCuota[] | null>(
        Promise.resolve(
          supabase
            .from('pagos_cuota')
            .select('id, alumno_id, fecha, monto, periodo')
            .eq('alumno_id', alumnoId)
            .order('periodo', { ascending: false }),
        ),
        { modulo: 'cuotas', contexto: 'listarCuotasAlumno' },
      )
    },
    [sesion?.user?.id],
  )

  // Vista de cobranzas: todos los alumnos directos con el estado del periodo.
  const listarCuotasPorPeriodo = useCallback(
    async (periodo: string): Promise<ResultadoConsulta<CuotaAlumno[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      const [resultadoAlumnos, resultadoPagos] = await Promise.all([
        ejecutarConsulta<AlumnoDirecto[] | null>(
          Promise.resolve(
            supabase
              .from('profiles')
              .select('id, nombre_completo, dni, fecha_nacimiento, genero, grado_actual, contacto_emergencia_nombre, contacto_emergencia_telefono')
              .eq('maestro_id', usuarioId)
              .order('nombre_completo', { ascending: true }),
          ),
          { modulo: 'cuotas', contexto: 'listarCuotasPorPeriodoAlumnos' },
        ),
        ejecutarConsulta<{ id: string; alumno_id: string; monto: number }[] | null>(
          Promise.resolve(
            supabase.from('pagos_cuota').select('id, alumno_id, monto').eq('periodo', periodo),
          ),
          { modulo: 'cuotas', contexto: 'listarCuotasPorPeriodoPagos' },
        ),
      ])

      if (resultadoAlumnos.error != null || resultadoAlumnos.data == null) {
        return { data: null, error: MENSAJE_ERROR_GENERICO }
      }

      const pagosPorAlumno = new Map(
        (resultadoPagos.data ?? []).map((pago) => [pago.alumno_id, pago]),
      )

      return {
        data: resultadoAlumnos.data.map((alumno) => {
          const pago = pagosPorAlumno.get(alumno.id)
          return {
            alumno_id: alumno.id,
            nombre_completo: alumno.nombre_completo,
            grado_actual: alumno.grado_actual,
            periodo,
            estado: pago != null ? 'pagado' : 'pendiente',
            pago_id: pago?.id ?? null,
            monto: pago?.monto ?? null,
          } satisfies CuotaAlumno
        }),
        error: null,
      }
    },
    [sesion?.user?.id],
  )

  const registrarCuota = useCallback(
    async (datos: DatosPagoCuota): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }

      // Pre-chequeo amable: un alumno no puede tener dos pagos del mismo periodo.
      const { data: existente, error: errorConsulta } = await ejecutarConsulta<
        { id: string } | null
      >(
        Promise.resolve(
          supabase
            .from('pagos_cuota')
            .select('id')
            .eq('alumno_id', datos.alumno_id)
            .eq('periodo', datos.periodo.trim())
            .maybeSingle(),
        ),
        { modulo: 'cuotas', contexto: 'verificarCuotaDuplicada' },
      )

      if (errorConsulta != null) return { error: MENSAJE_ERROR_GENERICO }
      if (existente != null) return { error: MENSAJE_CUOTA_DUPLICADA }

      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('pagos_cuota')
            .insert({
              alumno_id: datos.alumno_id,
              periodo: datos.periodo.trim(),
              monto: datos.monto,
              fecha: datos.fecha,
              // Columna real que identifica al profesor que registra.
              creado_por: usuarioId,
            })
            .select('id')
            .single(),
        ),
        { modulo: 'cuotas', contexto: 'registrarCuota' },
      )

      if (error != null || data == null) {
        // Red de seguridad: si dos dispositivos compiten, la unicidad de la BD
        // protege y aquí se traduce a un mensaje amable.
        const { data: confirmacion } = await supabase
          .from('pagos_cuota')
          .select('id')
          .eq('alumno_id', datos.alumno_id)
          .eq('periodo', datos.periodo.trim())
          .maybeSingle()
        if (confirmacion != null) return { error: MENSAJE_CUOTA_DUPLICADA }
        return { error: MENSAJE_ERROR_GENERICO }
      }

      return { error: null }
    },
    [sesion?.user?.id],
  )

  const eliminarCuota = useCallback(
    async (cuotaId: string): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { error } = await ejecutarConsulta<null>(
        Promise.resolve(supabase.from('pagos_cuota').delete().eq('id', cuotaId)),
        { modulo: 'cuotas', contexto: 'eliminarCuota' },
      )
      return error != null ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const listarMesasExamen = useCallback(
    async (): Promise<ResultadoConsulta<MesaExamen[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaMesa = {
        id: string
        maestro_id: string
        fecha: string
        lugar: string | null
        estado: string
        postulaciones_examen: { id: string }[]
      }

      const promesa = supabase
        .from('mesas_examen')
        .select('id, maestro_id, fecha, lugar, estado, postulaciones_examen(id)')
        .order('fecha', { ascending: false })
        .returns<FilaMesa[]>()

      return ejecutarConsulta<MesaExamen[] | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => ({
            data:
              data?.map((fila) => ({
                id: fila.id,
                maestro_id: fila.maestro_id,
                fecha: fila.fecha,
                lugar: fila.lugar,
                estado: fila.estado as EstadoMesa,
                cantidad_postulados: fila.postulaciones_examen?.length ?? 0,
              })) ?? null,
            error,
          })),
        ),
        { modulo: 'mesas_examen', contexto: 'listarMesasExamen' },
      )
    },
    [sesion?.user?.id],
  )

  const crearMesaExamen = useCallback(
    async (datos: DatosNuevaMesa): Promise<ResultadoCreacion> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('mesas_examen')
            .insert({
              maestro_id: usuarioId,
              fecha: datos.fecha,
              lugar: datos.lugar.trim(),
              estado: 'abierta',
            })
            .select('id')
            .single(),
        ),
        { modulo: 'mesas_examen', contexto: 'crearMesaExamen' },
      )
      return error != null || data == null
        ? { error: MENSAJE_ERROR_GENERICO }
        : { error: null, nuevoId: data.id }
    },
    [sesion?.user?.id],
  )

  const editarMesaExamen = useCallback(
    async (mesaId: string, datos: DatosNuevaMesa): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('mesas_examen')
            .update({ fecha: datos.fecha, lugar: datos.lugar.trim() })
            .eq('id', mesaId)
            .eq('maestro_id', usuarioId)
            .select('id')
            .maybeSingle(),
        ),
        { modulo: 'mesas_examen', contexto: 'editarMesaExamen' },
      )
      return error != null || data == null ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const cambiarEstadoMesa = useCallback(
    async (mesaId: string, estado: EstadoMesa): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('mesas_examen')
            .update({ estado })
            .eq('id', mesaId)
            .eq('maestro_id', usuarioId)
            .select('id')
            .maybeSingle(),
        ),
        { modulo: 'mesas_examen', contexto: 'cambiarEstadoMesa' },
      )
      return error != null || data == null ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const listarPostulacionesMesa = useCallback(
    async (mesaId: string): Promise<ResultadoConsulta<PostulacionExamen[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaPostulacion = {
        id: string
        mesa_id: string
        alumno_id: string
        grado_aspirado: Grado
        derecho_examen: number | null
        estado: string
        mencion_especial: boolean
        promocion_doble: boolean
        profiles: { nombre_completo: string } | null
      }

      const promesa = supabase
        .from('postulaciones_examen')
        .select(
          'id, mesa_id, alumno_id, grado_aspirado, derecho_examen, estado, mencion_especial, promocion_doble, profiles!postulaciones_examen_alumno_id_fkey(nombre_completo)',
        )
        .eq('mesa_id', mesaId)
        .order('creado_en', { ascending: true })
        .returns<FilaPostulacion[]>()

      return ejecutarConsulta<PostulacionExamen[] | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => ({
            data:
              data?.map((fila) => ({
                id: fila.id,
                mesa_id: fila.mesa_id,
                alumno_id: fila.alumno_id,
                grado_aspirado: fila.grado_aspirado,
                derecho_examen: fila.derecho_examen,
                estado: fila.estado as EstadoPostulacion,
                nombre_alumno: fila.profiles?.nombre_completo ?? 'Alumno',
                mencion_especial: fila.mencion_especial === true,
                promocion_doble: fila.promocion_doble === true,
              })) ?? null,
            error,
          })),
        ),
        { modulo: 'postulaciones', contexto: 'listarPostulacionesMesa' },
      )
    },
    [sesion?.user?.id],
  )

  const listarCandidatosPostulacion = useCallback(
    async (mesaId: string): Promise<ResultadoConsulta<CandidatoPostulacion[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      const [resultadoAlumnos, resultadoPostulaciones] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nombre_completo, grado_actual')
          .eq('maestro_id', usuarioId)
          .order('nombre_completo', { ascending: true }),
        supabase.from('postulaciones_examen').select('alumno_id').eq('mesa_id', mesaId),
      ])

      if (resultadoAlumnos.error != null || resultadoAlumnos.data == null) {
        return { data: null, error: MENSAJE_ERROR_GENERICO }
      }

      const yaPostulados = new Set((resultadoPostulaciones.data ?? []).map((p) => p.alumno_id))

      return {
        data: resultadoAlumnos.data.map((alumno) => {
          const gradoActual = (alumno.grado_actual as Grado | null) ?? null
          return {
            alumno_id: alumno.id,
            nombre_completo: alumno.nombre_completo,
            grado_actual: gradoActual,
            // Vista previa: el servidor recalcula y persiste el valor final.
            grado_aspirado: gradoActual != null ? gradoSiguiente(gradoActual) : null,
            ya_postulado: yaPostulados.has(alumno.id),
          } satisfies CandidatoPostulacion
        }),
        error: null,
      }
    },
    [sesion?.user?.id],
  )

  const postularAlumno = useCallback(
    async (
      mesaId: string,
      alumnoId: string,
      derechoExamen: number | null,
    ): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }

      const { data, error } = await ejecutarConsulta<string | null>(
        Promise.resolve(
          supabase.rpc('postular_alumno', {
            p_mesa_id: mesaId,
            p_alumno_id: alumnoId,
            p_derecho_examen: derechoExamen ?? undefined,
          }),
        ),
        { modulo: 'postulaciones', contexto: 'postularAlumno' },
      )

      if (error != null || data == null) {
        // El mensaje específico del RPC (duplicado, mesa cerrada, etc.) no llega
        // por `ejecutarConsulta`; se distingue el duplicado con una consulta.
        const { data: existente } = await supabase
          .from('postulaciones_examen')
          .select('id')
          .eq('mesa_id', mesaId)
          .eq('alumno_id', alumnoId)
          .maybeSingle()
        if (existente != null) return { error: MENSAJE_POSTULACION_DUPLICADA }
        return { error: MENSAJE_ERROR_GENERICO }
      }
      return { error: null }
    },
    [sesion?.user?.id],
  )

  const editarDerechoExamen = useCallback(
    async (postulacionId: string, monto: number): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('actualizar_derecho_examen', {
            p_postulacion_id: postulacionId,
            p_derecho_examen: monto,
          }),
        ),
        { modulo: 'postulaciones', contexto: 'editarDerechoExamen' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const quitarPostulacion = useCallback(
    async (postulacionId: string): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(supabase.rpc('quitar_postulacion', { p_postulacion_id: postulacionId })),
        { modulo: 'postulaciones', contexto: 'quitarPostulacion' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  // Planilla técnica (SRS §2, excepción de mesa de examen): el RPC expone los
  // datos técnicos solo al maestro examinador; el estado de cada postulación se
  // fusiona desde la consulta de postulaciones para no duplicar la RLS.
  const obtenerPlanillaMesa = useCallback(
    async (mesaId: string): Promise<ResultadoConsulta<FilaPlanillaExamen[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaPlanilla = {
        postulacion_id: string
        alumno_id: string
        nombre_completo: string
        edad: number | null
        peso: number | null
        grado_actual: Grado | null
        grado_aspirado: Grado
      }

      const [resultadoPlanilla, resultadoPostulaciones] = await Promise.all([
        ejecutarConsulta<FilaPlanilla[] | null>(
          Promise.resolve(supabase.rpc('planilla_mesa_examen', { p_mesa: mesaId })),
          { modulo: 'planilla_examen', contexto: 'obtenerPlanillaMesa' },
        ),
        listarPostulacionesMesa(mesaId),
      ])

      if (resultadoPlanilla.error != null || resultadoPlanilla.data == null) {
        return { data: null, error: resultadoPlanilla.error ?? MENSAJE_ERROR_GENERICO }
      }
      if (resultadoPostulaciones.error != null || resultadoPostulaciones.data == null) {
        return { data: null, error: resultadoPostulaciones.error ?? MENSAJE_ERROR_GENERICO }
      }

      const postulacionPorId = new Map(
        resultadoPostulaciones.data.map((postulacion) => [postulacion.id, postulacion]),
      )

      return {
        data: resultadoPlanilla.data.map((fila) => {
          const postulacion = postulacionPorId.get(fila.postulacion_id)
          return {
            postulacion_id: fila.postulacion_id,
            alumno_id: fila.alumno_id,
            nombre_completo: fila.nombre_completo,
            edad: fila.edad,
            peso: fila.peso,
            grado_actual: fila.grado_actual,
            grado_aspirado: fila.grado_aspirado,
            estado: postulacion?.estado ?? 'postulado',
            mencion_especial: postulacion?.mencion_especial ?? false,
            promocion_doble: postulacion?.promocion_doble ?? false,
          }
        }),
        error: null,
      }
    },
    [sesion?.user?.id, listarPostulacionesMesa],
  )

  const registrarResultadoExamen = useCallback(
    async (
      postulacionId: string,
      resultado: ResultadoExamen,
      mencionEspecial = false,
      promocionDoble = false,
    ): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('registrar_resultado_examen', {
            p_postulacion: postulacionId,
            p_resultado: resultado,
            p_mencion_especial: mencionEspecial,
            p_promocion_doble: promocionDoble,
          }),
        ),
        { modulo: 'planilla_examen', contexto: 'registrarResultadoExamen' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const editarGrupo = useCallback(
    async (grupoId: string, datos: DatosNuevoGrupo): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(
          supabase.rpc('editar_grupo', {
            p_grupo_id: grupoId,
            p_nombre: datos.nombre.trim(),
            p_locacion_id: datos.locacion_id ?? undefined,
            p_horarios: datos.horarios,
          }),
        ),
        { modulo: 'grupos', contexto: 'editarGrupo' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const obtenerUrlComprobante = useCallback(
    async (path: string): Promise<ResultadoConsulta<string | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      // El bucket es privado: se genera un enlace temporal (1 hora).
      // El RLS de storage decide si el usuario puede firmarlo.
      try {
        const { data, error } = await supabase.storage
          .from('comprobantes')
          .createSignedUrl(path, 3600)
        if (error != null || data == null) {
          void registrarError({
            modulo: 'pagos_alquiler',
            contexto: 'obtenerUrlComprobante',
            error,
          })
          return { data: null, error: MENSAJE_ERROR_GENERICO }
        }
        return { data: data.signedUrl, error: null }
      } catch (error) {
        void registrarError({
          modulo: 'pagos_alquiler',
          contexto: 'obtenerUrlComprobante',
          error,
        })
        return { data: null, error: MENSAJE_ERROR_GENERICO }
      }
    },
    [sesion?.user?.id],
  )

  const listarPagosAlquiler = useCallback(
    async (locacionId: string): Promise<ResultadoConsulta<PagoAlquiler[] | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }
      return ejecutarConsulta<PagoAlquiler[] | null>(
        Promise.resolve(
          supabase
            .from('pagos_alquiler')
            .select('id, locacion_id, monto, periodo, fecha_pago, comprobante_url')
            .eq('locacion_id', locacionId)
            .order('periodo', { ascending: false }),
        ),
        { modulo: 'pagos_alquiler', contexto: 'listarPagosAlquiler' },
      )
    },
    [sesion?.user?.id],
  )

  const registrarPagoAlquiler = useCallback(
    async (datos: DatosPagoAlquiler): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }

      let pathSubido: string | null = null
      try {
        // 1. Subir el comprobante al bucket privado (si se adjuntó).
        if (datos.archivo != null) {
          const { uri, nombre, mimeType } = datos.archivo
          const extension = nombre.includes('.') ? nombre.split('.').pop() : 'bin'
          const path = `${usuarioId}/${Date.now()}-${datos.periodo}.${extension}`

          const archivo = new File(uri)
          const { error: errorSubida } = await supabase.storage
            .from('comprobantes')
            .upload(path, archivo, { contentType: mimeType, upsert: false })
          if (errorSubida != null) {
            void registrarError({
              modulo: 'pagos_alquiler',
              contexto: 'subirComprobante',
              error: errorSubida,
            })
            return { error: MENSAJE_ERROR_GENERICO }
          }
          pathSubido = path
        }

        // 2. Registrar el pago referenciando el path (no una URL pública).
        const { error } = await ejecutarConsulta<{ id: string } | null>(
          Promise.resolve(
            supabase
              .from('pagos_alquiler')
              .insert({
                locacion_id: datos.locacion_id,
                monto: datos.monto,
                periodo: datos.periodo.trim(),
                fecha_pago: datos.fecha_pago,
                comprobante_url: pathSubido,
                creado_por: usuarioId,
              })
              .select('id')
              .single(),
          ),
          { modulo: 'pagos_alquiler', contexto: 'registrarPagoAlquiler' },
        )

        if (error != null) {
          // 3. Sin fila no debe quedar archivo huérfano en el bucket.
          if (pathSubido != null) {
            await supabase.storage.from('comprobantes').remove([pathSubido])
          }
          return { error: MENSAJE_ERROR_GENERICO }
        }
        return { error: null }
      } catch (error) {
        if (pathSubido != null) {
          try {
            await supabase.storage.from('comprobantes').remove([pathSubido])
          } catch {
            // Limpieza best-effort.
          }
        }
        void registrarError({
          modulo: 'pagos_alquiler',
          contexto: 'registrarPagoAlquiler',
          error,
        })
        return { error: MENSAJE_ERROR_GENERICO }
      }
    },
    [sesion?.user?.id],
  )

  const eliminarPagoAlquiler = useCallback(
    async (pagoId: string, comprobantePath: string | null): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }

      const { error } = await ejecutarConsulta<null>(
        Promise.resolve(supabase.from('pagos_alquiler').delete().eq('id', pagoId)),
        { modulo: 'pagos_alquiler', contexto: 'eliminarPagoAlquiler' },
      )
      if (error != null) return { error: MENSAJE_ERROR_GENERICO }

      if (comprobantePath != null) {
        try {
          await supabase.storage.from('comprobantes').remove([comprobantePath])
        } catch (errorLimpieza) {
          void registrarError({
            modulo: 'pagos_alquiler',
            contexto: 'eliminarPagoAlquilerArchivo',
            error: errorLimpieza,
          })
        }
      }
      return { error: null }
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
            .select('id, nombre, direccion, valor_alquiler')
            .eq('creado_por', usuarioId)
            .order('nombre', { ascending: true }),
        ),
        { modulo: 'locaciones', contexto: 'listarLocaciones' },
      )
    },
    [sesion?.user?.id],
  )

  const obtenerLocacionDetalle = useCallback(
    async (locacionId: string): Promise<ResultadoConsulta<LocacionDetalle | null>> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { data: null, error: MENSAJE_ERROR_GENERICO }

      type FilaLocacionConGrupos = {
        id: string
        nombre: string
        direccion: string
        valor_alquiler: number
        grupos: { id: string; nombre: string }[]
      }

      const promesa = supabase
        .from('locaciones')
        .select('id, nombre, direccion, valor_alquiler, grupos(id, nombre)')
        .eq('id', locacionId)
        .eq('creado_por', usuarioId)
        .maybeSingle()
        .returns<FilaLocacionConGrupos | null>()

      return ejecutarConsulta<LocacionDetalle | null>(
        Promise.resolve(
          promesa.then(({ data, error }) => {
            if (error != null || data == null) return { data: null, error }
            return {
              data: {
                id: data.id,
                nombre: data.nombre,
                direccion: data.direccion,
                valor_alquiler: data.valor_alquiler,
                grupos: (data.grupos ?? []).sort((a, b) => a.nombre.localeCompare(b.nombre)),
              },
              error: null,
            }
          }),
        ),
        { modulo: 'locaciones', contexto: 'obtenerLocacionDetalle' },
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
              valor_alquiler: datos.valor_alquiler,
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

  const editarLocacion = useCallback(
    async (locacionId: string, datos: DatosNuevaLocacion): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<{ id: string } | null>(
        Promise.resolve(
          supabase
            .from('locaciones')
            .update({
              nombre: datos.nombre.trim(),
              direccion: datos.direccion.trim(),
              valor_alquiler: datos.valor_alquiler,
            })
            .eq('id', locacionId)
            .eq('creado_por', usuarioId)
            .select('id')
            .maybeSingle(),
        ),
        { modulo: 'locaciones', contexto: 'editarLocacion' },
      )
      return error != null || data == null ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
    },
    [sesion?.user?.id],
  )

  const eliminarLocacion = useCallback(
    async (locacionId: string): Promise<{ error: string | null }> => {
      const usuarioId = sesion?.user?.id
      if (usuarioId == null) return { error: MENSAJE_ERROR_GENERICO }
      const { data, error } = await ejecutarConsulta<boolean | null>(
        Promise.resolve(supabase.rpc('eliminar_locacion_segura', { p_locacion_id: locacionId })),
        { modulo: 'locaciones', contexto: 'eliminarLocacion' },
      )
      return error != null || data !== true ? { error: MENSAJE_ERROR_GENERICO } : { error: null }
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
      editarGrupo,
      editarMiembrosGrupo,
      listarLocaciones,
      obtenerLocacionDetalle,
      crearLocacion,
      editarLocacion,
      eliminarLocacion,
      listarPagosAlquiler,
      registrarPagoAlquiler,
      obtenerUrlComprobante,
      eliminarPagoAlquiler,
      listarInstructoresSubordinados,
      listarLocacionesAuditadas,
      obtenerMetricasDashboard,
      listarCuotasAlumno,
      listarCuotasPorPeriodo,
      registrarCuota,
      eliminarCuota,
      listarMesasExamen,
      crearMesaExamen,
      editarMesaExamen,
      cambiarEstadoMesa,
      listarPostulacionesMesa,
      listarCandidatosPostulacion,
      postularAlumno,
      editarDerechoExamen,
      quitarPostulacion,
      obtenerPlanillaMesa,
      registrarResultadoExamen,
      listarClases,
      obtenerClaseDetalle,
      crearClase,
      listarAlumnosDeGrupo,
      listarAsistenciaClase,
      guardarAsistenciaClase,
      refrescarMiPerfil,
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
      editarGrupo,
      editarMiembrosGrupo,
      listarLocaciones,
      obtenerLocacionDetalle,
      crearLocacion,
      editarLocacion,
      eliminarLocacion,
      listarPagosAlquiler,
      registrarPagoAlquiler,
      obtenerUrlComprobante,
      eliminarPagoAlquiler,
      listarInstructoresSubordinados,
      listarLocacionesAuditadas,
      obtenerMetricasDashboard,
      listarCuotasAlumno,
      listarCuotasPorPeriodo,
      registrarCuota,
      eliminarCuota,
      listarMesasExamen,
      crearMesaExamen,
      editarMesaExamen,
      cambiarEstadoMesa,
      listarPostulacionesMesa,
      listarCandidatosPostulacion,
      postularAlumno,
      editarDerechoExamen,
      quitarPostulacion,
      obtenerPlanillaMesa,
      registrarResultadoExamen,
      listarClases,
      obtenerClaseDetalle,
      crearClase,
      listarAlumnosDeGrupo,
      listarAsistenciaClase,
      guardarAsistenciaClase,
      refrescarMiPerfil,
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