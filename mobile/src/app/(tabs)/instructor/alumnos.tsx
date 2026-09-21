import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { AlumnoDirecto } from '@/lib/perfil';

function FilaAlumno({ alumno, onPresionar }: { alumno: AlumnoDirecto; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{alumno.nombre_completo}</Text>
        <Text style={styles.datos}>
          {alumno.dni ?? 'Sin DNI'} · {etiquetaGrado(alumno.grado_actual)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function AlumnosScreen() {
  const { listarAlumnosDirectos } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [alumnos, setAlumnos] = useState<AlumnoDirecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error: errorConsulta } = await listarAlumnosDirectos();
    if (errorConsulta != null || data == null) {
      setError(true);
      if (errorConsulta === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setAlumnos(data);
      setError(false);
    }
    setCargando(false);
  }, [listarAlumnosDirectos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const irAAlta = () => router.push('/instructor/alta-alumno');

  const renderItem: ListRenderItem<AlumnoDirecto> = ({ item }) => (
    <FilaAlumno
      alumno={item}
      onPresionar={() => router.push({ pathname: '/instructor/alumno/[id]', params: { id: item.id } })}
    />
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando alumnos…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar tus alumnos.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (alumnos.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Todavía no tenés alumnos registrados.</Text>
        <Pressable onPress={irAAlta} style={styles.boton} accessibilityRole="button">
          <Text style={styles.botonTexto}>Dar de alta un alumno</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FlatList
        data={alumnos}
        keyExtractor={(alumno) => alumno.id}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
      />
      <View style={styles.pie}>
        <Pressable onPress={irAAlta} style={styles.boton} accessibilityRole="button">
          <Text style={styles.botonTexto}>Nuevo alumno</Text>
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
    paddingVertical: 14,
    marginBottom: 10,
  },
  filaPresionada: {
    backgroundColor: '#f7e9e9',
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
  chevron: {
    fontSize: 24,
    fontWeight: '600',
    color: '#C62828',
    marginLeft: 8,
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
    paddingHorizontal: 24,
    alignItems: 'center',
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