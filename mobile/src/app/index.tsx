import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { SolicitudLinaje } from '@/lib/perfil';

export default function HomeScreen() {
  const {
    sesion,
    perfil,
    esMaestro,
    linajeEstablecido,
    listarSolicitudesPendientes,
    resolverSolicitudLinaje,
    cerrarSesion,
  } = useAuthGlobal();

  const email = sesion?.user?.email;
  const esInstructor = perfil?.es_profesor === true || perfil?.es_maestro === true;
  const sinConfirmar = !esMaestro && !linajeEstablecido;

  const [solicitudes, setSolicitudes] = useState<SolicitudLinaje[]>([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [errorSolicitudes, setErrorSolicitudes] = useState(false);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);

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

  useEffect(() => {
    if (esInstructor) void cargarSolicitudes();
  }, [esInstructor, cargarSolicitudes]);

  const resolver = async (solicitudId: string, resultado: 'aceptada' | 'rechazada') => {
    if (resolviendoId != null) return;
    setResolviendoId(solicitudId);
    const { error } = await resolverSolicitudLinaje(solicitudId, resultado);
    setResolviendoId(null);
    if (error != null) return;
    setSolicitudes((prev) => prev.filter((s) => s.id !== solicitudId));
  };

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Taekwondo ITF</Text>
      <Text style={styles.subtitulo}>Sesión iniciada como</Text>
      <Text style={styles.correo}>{email ?? 'usuario'}</Text>

      {sinConfirmar ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            Tu instructor todavía no confirmó tu registro. Una vez que lo haga, ya no aparecerá este aviso.
          </Text>
        </View>
      ) : null}

      {esInstructor ? (
        <View style={styles.bloqueInstructor}>
          <Text style={styles.tituloSeccion}>Solicitudes de alumnos</Text>
          <Text style={styles.subtituloSeccion}>
            Confirmá los alumnos que te eligieron como instructor.
          </Text>
          {cargandoSolicitudes ? (
            <ActivityIndicator style={styles.cargando} color="#C62828" />
          ) : errorSolicitudes ? (
            <View style={styles.errorContenedor}>
              <Text style={styles.errorTexto}>No pudimos cargar las solicitudes.</Text>
              <Pressable onPress={() => void cargarSolicitudes()} style={styles.reintentar} accessibilityRole="button">
                <Text style={styles.reintentarTexto}>Reintentar</Text>
              </Pressable>
            </View>
          ) : solicitudes.length === 0 ? (
            <Text style={styles.sinSolicitudes}>No tenés solicitudes pendientes.</Text>
          ) : (
            solicitudes.map((sol) => (
              <View key={sol.id} style={styles.solicitud}>
                <Text style={styles.solicitudNombre}>{sol.nombre_alumno}</Text>
                <View style={styles.filaAcciones}>
                  <Pressable
                    onPress={() => void resolver(sol.id, 'aceptada')}
                    disabled={resolviendoId != null}
                    style={[styles.botonAceptar, resolviendoId === sol.id && styles.botonDeshabilitado]}
                    accessibilityRole="button"
                  >
                    <Text style={styles.botonAceptarTexto}>
                      {resolviendoId === sol.id ? 'Aceptando…' : 'Aceptar'}
                    </Text>
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
              </View>
            ))
          )}
        </View>
      ) : null}

      <Pressable
        onPress={cerrarSesion}
        style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
        accessibilityRole="button"
      >
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
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
    padding: 24,
    paddingBottom: 48,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  correo: {
    fontSize: 16,
    marginTop: 2,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  avisoPendiente: {
    marginTop: 20,
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
  bloqueInstructor: {
    marginTop: 28,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  subtituloSeccion: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    marginBottom: 12,
  },
  cargando: {
    marginTop: 8,
  },
  errorContenedor: {
    marginTop: 4,
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
  boton: {
    marginTop: 32,
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonPresionado: {
    backgroundColor: '#a02020',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});