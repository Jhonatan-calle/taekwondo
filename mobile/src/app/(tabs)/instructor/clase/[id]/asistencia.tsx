import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { AlumnoGrupo, AsistenciaItem, ClaseItem } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function limpiarHora(hora: string): string {
  return hora.slice(0, 5);
}

function FilaAlumno({
  alumno,
  presente,
  onAlternar,
}: {
  alumno: AlumnoGrupo;
  presente: boolean;
  onAlternar: () => void;
}) {
  return (
    <Pressable
      onPress={onAlternar}
      style={[styles.fila, presente ? styles.filaPresente : styles.filaAusente]}
      accessibilityRole="button"
      accessibilityState={{ selected: presente }}
      accessibilityLabel={`${alumno.nombre_completo}: ${presente ? 'Presente' : 'Ausente'}`}
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{alumno.nombre_completo}</Text>
        <Text style={styles.datos}>
          {alumno.dni ?? 'Sin DNI'} · {etiquetaGrado(alumno.grado_actual)}
        </Text>
      </View>
      <View style={[styles.estado, presente ? styles.estadoPresente : styles.estadoAusente]}>
        <Text style={[styles.estadoTexto, presente ? styles.estadoTextoPresente : styles.estadoTextoAusente]}>
          {presente ? 'Presente' : 'Ausente'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function AsistenciaClaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { obtenerClaseDetalle, listarAlumnosDeGrupo, listarAsistenciaClase, guardarAsistenciaClase } =
    useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [clase, setClase] = useState<ClaseItem | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoGrupo[]>([]);
  // Mapa de estados locales (true = Presente). Por defecto todos Presente.
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const resultadoClase = await obtenerClaseDetalle(id);
    if (resultadoClase.error != null || resultadoClase.data == null) {
      setError(true);
      if (resultadoClase.error === MENSAJE_ERROR_GENERICO) reportarError();
      setCargando(false);
      return;
    }

    const [resultadoAlumnos, resultadoAsistencia] = await Promise.all([
      listarAlumnosDeGrupo(resultadoClase.data.grupo_id),
      listarAsistenciaClase(id),
    ]);

    if (resultadoAlumnos.error != null || resultadoAlumnos.data == null) {
      setError(true);
      if (resultadoAlumnos.error === MENSAJE_ERROR_GENERICO) reportarError();
      setCargando(false);
      return;
    }

    // Sin registros previos: presentes guardados o Presente por defecto.
    const estados: Record<string, boolean> = {};
    for (const alumno of resultadoAlumnos.data) estados[alumno.id] = true;
    const guardados = resultadoAsistencia.data ?? [];
    for (const registro of guardados) {
      if (registro.alumno_id in estados) estados[registro.alumno_id] = registro.presente;
    }

    setClase(resultadoClase.data);
    setAlumnos(resultadoAlumnos.data);
    setMarcados(estados);
    setError(false);
    setCargando(false);
  }, [
    id,
    obtenerClaseDetalle,
    listarAlumnosDeGrupo,
    listarAsistenciaClase,
    reportarError,
  ]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const alternar = (alumnoId: string) => {
    setMarcados((actual) => ({ ...actual, [alumnoId]: !actual[alumnoId] }));
  };

  const marcarTodos = (presente: boolean) => {
    const estados: Record<string, boolean> = {};
    for (const alumno of alumnos) estados[alumno.id] = presente;
    setMarcados(estados);
  };

  const { presentes, ausentes } = useMemo(() => {
    let p = 0;
    let a = 0;
    for (const alumno of alumnos) {
      if (marcados[alumno.id]) p += 1;
      else a += 1;
    }
    return { presentes: p, ausentes: a };
  }, [alumnos, marcados]);

  const guardar = async () => {
    if (guardando || id == null) return;
    const registros: AsistenciaItem[] = alumnos.map((alumno) => ({
      alumno_id: alumno.id,
      presente: marcados[alumno.id] ?? true,
    }));
    setGuardando(true);
    try {
      const resultado = await guardarAsistenciaClase(id, registros);
      if (resultado.error != null) {
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        Alert.alert('No pudimos guardar', 'No pudimos guardar la asistencia, intentá de nuevo en unos minutos.');
        return;
      }
      Alert.alert('Asistencia guardada', `Presentes: ${presentes} · Ausentes: ${ausentes}`);
    } catch {
      reportarError();
    } finally {
      setGuardando(false);
    }
  };

  const renderItem: ListRenderItem<AlumnoGrupo> = ({ item }) => (
    <FilaAlumno
      alumno={item}
      presente={marcados[item.id] ?? true}
      onAlternar={() => alternar(item.id)}
    />
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando asistencia…</Text>
      </View>
    );
  }

  if (error || clase == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la asistencia de esta clase.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <Text style={styles.nombreGrupo}>{clase.nombre_grupo ?? 'Grupo'}</Text>
        <Text style={styles.datosClase}>
          {formatearFecha(clase.fecha)} · {limpiarHora(clase.hora_inicio)} a {limpiarHora(clase.hora_fin)} hs
        </Text>
        <View style={styles.contadores}>
          <Text style={styles.contadorPresente}>Presentes: {presentes}</Text>
          <Text style={styles.contadorAusente}>Ausentes: {ausentes}</Text>
        </View>
        <View style={styles.accionesRapidas}>
          <Pressable onPress={() => marcarTodos(true)} style={styles.chipAccion} accessibilityRole="button">
            <Text style={styles.chipAccionTexto}>Todos presentes</Text>
          </Pressable>
          <Pressable onPress={() => marcarTodos(false)} style={styles.chipAccion} accessibilityRole="button">
            <Text style={styles.chipAccionTexto}>Todos ausentes</Text>
          </Pressable>
        </View>
      </View>

      {alumnos.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Este grupo no tiene alumnos asignados.</Text>
          <Pressable
            onPress={() => router.push(`/instructor/grupo/${clase.grupo_id}`)}
            style={styles.reintentar}
            accessibilityRole="button"
          >
            <Text style={styles.reintentarTexto}>Asignar alumnos</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={alumnos}
          keyExtractor={(alumno) => alumno.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
        />
      )}

      {alumnos.length > 0 ? (
        <View style={styles.pie}>
          <Pressable
            onPress={() => void guardar()}
            disabled={guardando}
            style={[styles.boton, guardando ? styles.botonDeshabilitado : null]}
            accessibilityRole="button"
          >
            <Text style={styles.botonTexto}>{guardando ? 'Guardando…' : 'Guardar asistencia'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cabecera: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nombreGrupo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  datosClase: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 4,
  },
  contadores: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  contadorPresente: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  contadorAusente: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  accionesRapidas: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chipAccion: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipAccionTexto: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  lista: {
    padding: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  filaPresente: {
    borderColor: '#A5D6A7',
    backgroundColor: '#f1f8f2',
  },
  filaAusente: {
    borderColor: '#f5c6cb',
    backgroundColor: '#fdf0f0',
  },
  filaContenido: {
    flex: 1,
  },
  nombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  datos: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  estado: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  estadoPresente: {
    borderColor: '#2E7D32',
    backgroundColor: '#e8f5e9',
  },
  estadoAusente: {
    borderColor: '#C62828',
    backgroundColor: '#fff',
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  estadoTextoPresente: {
    color: '#2E7D32',
  },
  estadoTextoAusente: {
    color: '#C62828',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  reintentar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 8,
  },
  reintentarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  pie: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  boton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
