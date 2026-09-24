import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { aIsoLocal, formatearMonto, formatearPeriodo, mesActual, type SolicitudLinaje } from '@/lib/perfil';
import { GRADOS_DAN, etiquetaGrado, type Grado } from '@/constants/grados';
import { supabase } from '@/lib/supabase';
import { BotonAccion } from '@/components/BotonAccion';
import { TarjetaMetrica } from '@/components/TarjetaMetrica';

// Días hacia atrás que se consideran para "clases sin asistencia tomada".
const DIAS_ASISTENCIA = 7;

type Resumen = {
  // Instructor
  alumnos: number | null;
  cuotasPendientes: number | null;
  cuotasTotal: number | null;
  clasesSinAsistencia: number | null;
  grupos: number | null;
  // Maestro
  locacionesVencidas: number | null;
  mesasAbiertas: number | null;
  recaudacionAbiertas: number | null;
};

const RESUMEN_VACIO: Resumen = {
  alumnos: null,
  cuotasPendientes: null,
  cuotasTotal: null,
  clasesSinAsistencia: null,
  grupos: null,
  locacionesVencidas: null,
  mesasAbiertas: null,
  recaudacionAbiertas: null,
};

// Clases de los últimos N días (el filtro se hace en el cliente porque
// `listarClases()` no filtra por fecha).
function filtrarUltimosDias(fechas: string[], dias: number): string[] {
  const hoy = new Date();
  const desde = aIsoLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias));
  return fechas.filter((fecha) => fecha >= desde);
}

export default function HomeScreen() {
  const {
    sesion,
    perfil,
    esMaestro,
    esProfesor,
    esInstructor,
    linajeEstablecido,
    listarSolicitudesPendientes,
    resolverSolicitudLinaje,
    listarAlumnosDirectos,
    listarGrupos,
    listarClases,
    listarAsistenciaClase,
    listarCuotasPorPeriodo,
    listarLocacionesAuditadas,
    listarMesasExamen,
    listarPostulacionesMesa,
    refrescarMiPerfil,
    cerrarSesion,
  } = useAuthGlobal();
  const router = useRouter();

  const sinConfirmar = !esMaestro && !linajeEstablecido;
  const sinFacetasGestion = !esProfesor && !esMaestro;

  const [resumen, setResumen] = useState<Resumen>(RESUMEN_VACIO);
  const [cargando, setCargando] = useState(true);

  const [solicitudes, setSolicitudes] = useState<SolicitudLinaje[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [errorSolicitudes, setErrorSolicitudes] = useState(false);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [solicitudEnConfirmacion, setSolicitudEnConfirmacion] = useState<string | null>(null);
  const [gradoConfirmado, setGradoConfirmado] = useState<Grado | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    setCargandoSolicitudes(true);
    setErrorSolicitudes(false);
    const { data, error } = await listarSolicitudesPendientes();
    if (error != null || data == null) {
      setErrorSolicitudes(true);
    } else {
      setSolicitudes(data);
    }
    setCargandoSolicitudes(false);
  }, [listarSolicitudesPendientes]);

  // Cada bloque carga de forma independiente: si una métrica falla, el resto
  // del panel sigue siendo util (fail gracefully por bloque).
  const cargarResumen = useCallback(async () => {
    setCargando(true);

    const tareas: Promise<void>[] = [];

    if (esProfesor) {
      tareas.push(
        (async () => {
          const [alumnos, grupos, cuotas] = await Promise.all([
            listarAlumnosDirectos(),
            listarGrupos(),
            listarCuotasPorPeriodo(mesActual()),
          ]);
          setResumen((actual) => ({
            ...actual,
            alumnos: alumnos.data?.length ?? null,
            grupos: grupos.data?.length ?? null,
            cuotasTotal: cuotas.data?.length ?? null,
            cuotasPendientes:
              cuotas.data != null ? cuotas.data.filter((c) => c.estado === 'pendiente').length : null,
          }));
        })(),
      );

      tareas.push(
        (async () => {
          const clases = await listarClases();
          if (clases.data == null) return;
          const recientes = clases.data.filter((clase) =>
            filtrarUltimosDias([clase.fecha], DIAS_ASISTENCIA).length > 0,
          );
          if (recientes.length === 0) {
            setResumen((actual) => ({ ...actual, clasesSinAsistencia: 0 }));
            return;
          }
          // Lecturas de asistencia EN PARALELO (sin consultas anidadas).
          const asistencias = await Promise.all(
            recientes.map((clase) => listarAsistenciaClase(clase.id)),
          );
          const sinAsistencia = asistencias.filter(
            (resultado) => resultado.data == null || resultado.data.length === 0,
          ).length;
          setResumen((actual) => ({ ...actual, clasesSinAsistencia: sinAsistencia }));
        })(),
      );
    }

    if (esMaestro) {
      tareas.push(
        (async () => {
          const locaciones = await listarLocacionesAuditadas();
          setResumen((actual) => ({
            ...actual,
            locacionesVencidas:
              locaciones.data != null
                ? locaciones.data.filter((l) => l.estado_pago === 'vencida').length
                : null,
          }));
        })(),
      );

      tareas.push(
        (async () => {
          const mesas = await listarMesasExamen();
          if (mesas.data == null) return;
          const abiertas = mesas.data.filter((mesa) => mesa.estado === 'abierta');
          let total = 0;
          // Una consulta por mesa abierta. Deuda técnica: si crecen las mesas
          // simultáneas, migrar a un RPC agregado (ver plan del rediseño).
          const postulaciones = await Promise.all(
            abiertas.map((mesa) => listarPostulacionesMesa(mesa.id)),
          );
          for (const resultado of postulaciones) {
            for (const postulacion of resultado.data ?? []) {
              if (postulacion.derecho_examen != null) total += Number(postulacion.derecho_examen);
            }
          }
          setResumen((actual) => ({
            ...actual,
            mesasAbiertas: abiertas.length,
            recaudacionAbiertas: total,
          }));
        })(),
      );
    }

    await Promise.all(tareas);
    setCargando(false);
  }, [
    esProfesor,
    esMaestro,
    listarAlumnosDirectos,
    listarGrupos,
    listarClases,
    listarAsistenciaClase,
    listarCuotasPorPeriodo,
    listarLocacionesAuditadas,
    listarMesasExamen,
    listarPostulacionesMesa,
  ]);

  useFocusEffect(
    useCallback(() => {
      void cargarResumen();
      void refrescarMiPerfil();
      if (esInstructor) void cargarSolicitudes();
    }, [cargarResumen, cargarSolicitudes, esInstructor, refrescarMiPerfil]),
  );

  // Realtime: el superior ve las solicitudes nuevas/resueltas en vivo.
  const usuarioId = sesion?.user?.id;
  useEffect(() => {
    if (usuarioId == null || !esInstructor) return;
    const canal = supabase
      .channel(`solicitudes:${usuarioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solicitudes_linaje',
          filter: `instructor_id=eq.${usuarioId}`,
        },
        () => {
          void cargarSolicitudes();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [usuarioId, esInstructor, cargarSolicitudes]);

  const resolver = async (
    solicitudId: string,
    resultado: 'aceptada' | 'rechazada',
    grado?: Grado,
  ) => {
    if (resolviendoId != null) return;
    setResolviendoId(solicitudId);
    const { error } = await resolverSolicitudLinaje(solicitudId, resultado, grado);
    setResolviendoId(null);
    if (error != null) return;
    setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId));
    void cargarResumen();
  };

  const abrirConfirmacion = (sol: SolicitudLinaje) => {
    setSolicitudEnConfirmacion(sol.id);
    setGradoConfirmado(sol.grado_solicitado ?? null);
  };

  const confirmarAceptacion = async (sol: SolicitudLinaje) => {
    if (gradoConfirmado == null) return;
    setSolicitudEnConfirmacion(null);
    await resolver(sol.id, 'aceptada', gradoConfirmado);
  };

  const nombre = perfil?.nombre_completo ?? sesion?.user?.email ?? 'usuario';
  const mostrarPerfilAlerta = resumen.cuotasPendientes != null && resumen.cuotasPendientes > 0;

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.saludo}>Hola, {nombre}</Text>
      <Text style={styles.subtitulo}>Panel de gestión</Text>

      {sinConfirmar ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            Tu instructor todavía no confirmó tu registro. Una vez que lo haga, ya no aparecerá este aviso.
          </Text>
        </View>
      ) : null}

      {sinFacetasGestion ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            Tu cuenta todavía no tiene habilitadas las pestañas de gestión. Un superior o la administración debe
            otorgarte las facetas.
          </Text>
        </View>
      ) : null}

      {esProfesor ? (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Tu actividad</Text>
          {cargando ? (
            <ActivityIndicator style={styles.cargando} color="#C62828" />
          ) : (
            <View style={styles.grilla}>
              <TarjetaMetrica
                valor={resumen.alumnos != null ? String(resumen.alumnos) : '—'}
                etiqueta="Alumnos directos"
                onPresionar={() => router.push('/instructor/alumnos')}
              />
              <TarjetaMetrica
                valor={resumen.grupos != null ? String(resumen.grupos) : '—'}
                etiqueta="Grupos activos"
                onPresionar={() => router.push('/instructor/grupos')}
              />
              <TarjetaMetrica
                valor={
                  resumen.cuotasPendientes != null && resumen.cuotasTotal != null
                    ? `${resumen.cuotasPendientes}/${resumen.cuotasTotal}`
                    : '—'
                }
                etiqueta="Cuotas pendientes"
                detalle={formatearPeriodo(mesActual())}
                tono={mostrarPerfilAlerta ? 'alerta' : 'neutro'}
                onPresionar={() => router.push('/instructor/cuotas')}
              />
              <TarjetaMetrica
                valor={resumen.clasesSinAsistencia != null ? String(resumen.clasesSinAsistencia) : '—'}
                etiqueta="Clases sin asistencia"
                detalle={`Últimos ${DIAS_ASISTENCIA} días`}
                tono={resumen.clasesSinAsistencia != null && resumen.clasesSinAsistencia > 0 ? 'alerta' : 'neutro'}
                onPresionar={() => router.push('/instructor/clases')}
              />
            </View>
          )}
        </View>
      ) : null}

      {esMaestro ? (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Tu rama</Text>
          {cargando ? (
            <ActivityIndicator style={styles.cargando} color="#C62828" />
          ) : (
            <View style={styles.grilla}>
              <TarjetaMetrica
                valor={resumen.locacionesVencidas != null ? String(resumen.locacionesVencidas) : '—'}
                etiqueta="Alquileres vencidos"
                tono={resumen.locacionesVencidas != null && resumen.locacionesVencidas > 0 ? 'alerta' : 'neutro'}
                onPresionar={() => router.push('/maestro/auditoria')}
              />
              <TarjetaMetrica
                valor={resumen.mesasAbiertas != null ? String(resumen.mesasAbiertas) : '—'}
                etiqueta="Mesas abiertas"
                onPresionar={() => router.push('/maestro/mesas')}
              />
              <TarjetaMetrica
                valor={
                  resumen.recaudacionAbiertas != null ? formatearMonto(resumen.recaudacionAbiertas) : '—'
                }
                etiqueta="Recaudación de mesas"
                detalle="Solo mesas abiertas"
                onPresionar={() => router.push('/maestro/mesas')}
              />
            </View>
          )}
        </View>
      ) : null}

      {esProfesor ? (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Acciones rápidas</Text>
          <BotonAccion titulo="Tomar asistencia" onPresionar={() => router.push('/instructor/clases')} />
          <BotonAccion titulo="Registrar cuota" onPresionar={() => router.push('/instructor/cuotas')} />
          <BotonAccion titulo="Alta de alumno" onPresionar={() => router.push('/instructor/alta-alumno')} />
        </View>
      ) : null}

      {esInstructor ? (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Solicitudes de alumnos</Text>
          <Text style={styles.subtituloSeccion}>
            Confirmá los alumnos que te eligieron como instructor.
          </Text>
          {cargandoSolicitudes ? (
            <ActivityIndicator style={styles.cargando} color="#C62828" />
          ) : errorSolicitudes ? (
            <View>
              <Text style={styles.errorTexto}>No pudimos cargar las solicitudes.</Text>
              <Pressable onPress={() => void cargarSolicitudes()} style={styles.reintentar} accessibilityRole="button">
                <Text style={styles.reintentarTexto}>Reintentar</Text>
              </Pressable>
            </View>
          ) : solicitudes.length === 0 ? (
            <Text style={styles.sinSolicitudes}>No tenés solicitudes pendientes.</Text>
          ) : (
            solicitudes.map((sol) => {
              const enConfirmacion = solicitudEnConfirmacion === sol.id;
              return (
                <View key={sol.id} style={styles.solicitud}>
                  <Text style={styles.solicitudNombre}>{sol.nombre_alumno}</Text>
                  <Text style={styles.solicitudGrado}>
                    Cinturón declarado: {etiquetaGrado(sol.grado_solicitado)}
                  </Text>

                  {enConfirmacion ? (
                    <View>
                      <Text style={styles.confirmarAyuda}>
                        Confirmá el cinturón o ajústalo (primer Dan o superior):
                      </Text>
                      <View style={styles.filaGrado}>
                        {GRADOS_DAN.map((opcion) => {
                          const seleccionado = gradoConfirmado === opcion;
                          return (
                            <Pressable
                              key={opcion}
                              onPress={() => setGradoConfirmado(opcion)}
                              style={[styles.chipGrado, seleccionado ? styles.chipGradoSeleccionado : null]}
                              accessibilityRole="button"
                              accessibilityState={{ selected: seleccionado }}
                            >
                              <Text
                                style={[
                                  styles.chipGradoTexto,
                                  seleccionado ? styles.chipGradoTextoSeleccionado : null,
                                ]}
                              >
                                {etiquetaGrado(opcion)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={styles.filaAcciones}>
                        <Pressable
                          onPress={() => void confirmarAceptacion(sol)}
                          disabled={resolviendoId != null || gradoConfirmado == null}
                          style={[
                            styles.botonAceptar,
                            (resolviendoId != null || gradoConfirmado == null) && styles.botonDeshabilitado,
                          ]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.botonAceptarTexto}>
                            {resolviendoId === sol.id ? 'Confirmando…' : 'Confirmar y aceptar'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setSolicitudEnConfirmacion(null)}
                          disabled={resolviendoId != null}
                          style={[styles.botonRechazar, resolviendoId === sol.id && styles.botonDeshabilitado]}
                          accessibilityRole="button"
                        >
                          <Text style={styles.botonRechazarTexto}>Cancelar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.filaAcciones}>
                      <Pressable
                        onPress={() => abrirConfirmacion(sol)}
                        disabled={resolviendoId != null}
                        style={[styles.botonAceptar, resolviendoId === sol.id && styles.botonDeshabilitado]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.botonAceptarTexto}>Aceptar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void resolver(sol.id, 'rechazada')}
                        disabled={resolviendoId != null}
                        style={[styles.botonRechazar, resolviendoId === sol.id && styles.botonDeshabilitado]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.botonRechazarTexto}>Rechazar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ) : null}

      {esMaestro ? (
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Acciones rápidas</Text>
          <BotonAccion titulo="Nueva mesa de examen" onPresionar={() => router.push('/maestro/mesas/nueva')} />
          <BotonAccion titulo="Auditoría de locaciones" onPresionar={() => router.push('/maestro/auditoria')} />
        </View>
      ) : null}

      <Pressable onPress={cerrarSesion} style={styles.cerrarSesion} accessibilityRole="button">
        <Text style={styles.cerrarSesionTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contenido: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 48,
  },
  saludo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  avisoPendiente: {
    marginTop: 16,
    backgroundColor: '#FFF3E0',
    borderColor: '#E65100',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  avisoPendienteTexto: {
    color: '#7A3A00',
    fontSize: 14,
  },
  seccion: {
    marginTop: 24,
  },
  tituloSeccion: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 10,
  },
  subtituloSeccion: {
    fontSize: 13,
    color: '#666',
    marginTop: -6,
    marginBottom: 12,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cargando: {
    marginTop: 8,
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 14,
  },
  reintentar: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
  },
  reintentarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  sinSolicitudes: {
    color: '#666',
    fontSize: 14,
  },
  solicitud: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  solicitudNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  solicitudGrado: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  confirmarAyuda: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
  },
  filaGrado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipGrado: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipGradoSeleccionado: {
    backgroundColor: '#C62828',
    borderColor: '#C62828',
  },
  chipGradoTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chipGradoTextoSeleccionado: {
    color: '#fff',
  },
  filaAcciones: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  botonAceptar: {
    flex: 1,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonAceptarTexto: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  botonRechazar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonRechazarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  cerrarSesion: {
    marginTop: 36,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cerrarSesionTexto: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
});
