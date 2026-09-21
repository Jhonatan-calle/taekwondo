import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { formatearHorarios, type AlumnoDirecto, type DetalleGrupo, type Grupo } from '@/lib/perfil';

function alternar<T>(lista: T[], elemento: T): T[] {
  return lista.includes(elemento) ? lista.filter((item) => item !== elemento) : [...lista, elemento];
}

// Alumnos activos en OTRO grupo: no se ofrecen para asignar (un alumno = un grupo).
function armarSetOcupadosEnOtroGrupo(grupos: Grupo[], grupoActualId: string): Set<string> {
  const ocupados = new Set<string>();
  for (const g of grupos) {
    if (g.id === grupoActualId) continue;
    for (const alumnoId of g.miembro_ids) ocupados.add(alumnoId);
  }
  return ocupados;
}

export default function GrupoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { obtenerGrupoDetalle, listarAlumnosDirectos, listarGrupos, editarMiembrosGrupo } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [grupo, setGrupo] = useState<DetalleGrupo | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoDirecto[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [ocupadosEnOtroGrupo, setOcupadosEnOtroGrupo] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const [resultadoGrupo, resultadoAlumnos, resultadoGrupos] = await Promise.all([
      obtenerGrupoDetalle(id),
      listarAlumnosDirectos(),
      listarGrupos(),
    ]);
    if (
      resultadoGrupo.error != null ||
      resultadoGrupo.data == null ||
      resultadoAlumnos.error != null ||
      resultadoAlumnos.data == null ||
      resultadoGrupos.error != null ||
      resultadoGrupos.data == null
    ) {
      setError(true);
      if (
        resultadoGrupo.error === MENSAJE_ERROR_GENERICO ||
        resultadoAlumnos.error === MENSAJE_ERROR_GENERICO ||
        resultadoGrupos.error === MENSAJE_ERROR_GENERICO
      ) {
        reportarError();
      }
    } else {
      setGrupo(resultadoGrupo.data);
      setAlumnos(resultadoAlumnos.data);
      setSeleccionados(resultadoGrupo.data.miembro_ids);
      setOcupadosEnOtroGrupo(armarSetOcupadosEnOtroGrupo(resultadoGrupos.data, resultadoGrupo.data.id));
      setError(false);
    }
    setCargando(false);
  }, [id, obtenerGrupoDetalle, listarAlumnosDirectos, listarGrupos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const guardarMiembros = async () => {
    if (enviando || id == null) return;
    setEnviando(true);
    try {
      const resultado = await editarMiembrosGrupo(id, seleccionados);
      if (resultado.error) {
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        else Alert.alert('No pudimos guardar', resultado.error);
        return;
      }
      setGrupo((actual) => (actual != null ? { ...actual, miembro_ids: seleccionados } : actual));
      Alert.alert('Miembros actualizados', 'El grupo quedó actualizado.');
    } catch {
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  // Solo se ofrecen los alumnos sin grupo asignado; los del propio grupo
  // siguen listados para poder darlos de baja (desmarcar) o mantenerlos.
  const alumnosAsignables = alumnos.filter((item) => !ocupadosEnOtroGrupo.has(item.id));

  const renderItem: ListRenderItem<AlumnoDirecto> = ({ item }) => {
    const seleccionado = seleccionados.includes(item.id);
    return (
      <Pressable
        onPress={() => setSeleccionados((actual) => alternar(actual, item.id))}
        style={[styles.fila, seleccionado ? styles.filaSeleccionada : null]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: seleccionado }}
      >
        <Text style={styles.check}>{seleccionado ? '☑' : '☐'}</Text>
        <View style={styles.filaContenido}>
          <Text style={styles.nombre}>{item.nombre_completo}</Text>
          <Text style={styles.datos}>
            {item.dni ?? 'Sin DNI'} · {etiquetaGrado(item.grado_actual)}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando grupo…</Text>
      </View>
    );
  }

  if (error || grupo == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar el grupo.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (alumnos.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>
          {grupo.nombre} no tiene alumnos que asignar. Primero das de alta a tus alumnos directos.
        </Text>
      </View>
    );
  }

  if (alumnosAsignables.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>
          No hay alumnos libres para asignar a {grupo.nombre}. Todos tus alumnos ya pertenecen a otro grupo;
          para mover a uno, primero quitalo de su grupo actual.
        </Text>
        <Pressable
          onPress={() => router.push('/instructor/grupos')}
          style={styles.reintentar}
          accessibilityRole="button"
        >
          <Text style={styles.reintentarTexto}>Ver mis grupos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <View style={styles.cabeceraFila}>
          <View style={styles.cabeceraInfo}>
            <Text style={styles.nombreGrupo}>{grupo.nombre}</Text>
            <Text style={styles.datosGrupo}>
              {grupo.nombre_locacion ?? 'Sin locación'}
              {formatearHorarios(grupo.horarios) ? ` · ${formatearHorarios(grupo.horarios)}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/instructor/grupo/${grupo.id}/editar`)}
            style={styles.botonEditarGrupo}
            accessibilityRole="button"
          >
            <Text style={styles.botonEditarGrupoTexto}>Editar</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/instructor/nueva-clase?grupo_id=${grupo.id}`)}
            style={styles.botonPlanificarClase}
            accessibilityRole="button"
          >
            <Text style={styles.botonPlanificarClaseTexto}>+ Clase</Text>
          </Pressable>
        </View>
        <Text style={styles.sugerencia}>
          Solo se listan los alumnos sin grupo asignado. Un alumno pertenece a un único grupo: para moverlo,
          primero quitalo de su grupo actual.
        </Text>
      </View>

      <FlatList
        data={alumnosAsignables}
        keyExtractor={(alumno) => alumno.id}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
      />

      <View style={styles.pie}>
        <Pressable
          onPress={() => void guardarMiembros()}
          disabled={enviando}
          style={[styles.boton, enviando ? styles.botonDeshabilitado : null]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Guardar miembros'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centro: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cabecera: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cabeceraFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cabeceraInfo: {
    flex: 1,
    marginRight: 12,
  },
  botonEditarGrupo: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
  },
  botonEditarGrupoTexto: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '600',
  },
  botonPlanificarClase: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#C62828',
    borderRadius: 6,
    marginLeft: 8,
  },
  botonPlanificarClaseTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  nombreGrupo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  datosGrupo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sugerencia: {
    fontSize: 13,
    color: '#999',
    marginTop: 10,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  lista: {
    padding: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  filaSeleccionada: {
    borderColor: '#C62828',
    backgroundColor: '#fdf0f0',
  },
  check: {
    fontSize: 20,
    color: '#C62828',
    marginRight: 12,
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
  reintentar: {
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
});