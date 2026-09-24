import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { MesaExamen } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function FilaMesaAbierta({ mesa, onPresionar }: { mesa: MesaExamen; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.fecha}>{formatearFecha(mesa.fecha)}</Text>
        <Text style={styles.lugar}>{mesa.lugar ?? 'Sin lugar definido'}</Text>
        <Text style={styles.dueno}>Mesa de {mesa.maestro_nombre ?? 'otro maestro'}</Text>
        <Text style={styles.postulados}>{mesa.cantidad_postulados} postulado(s)</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function MesasInstructorScreen() {
  const { listarMesasExamen } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [mesas, setMesas] = useState<MesaExamen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const resultado = await listarMesasExamen();
    if (resultado.error != null || resultado.data == null) {
      setError(true);
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setMesas(resultado.data);
      setError(false);
    }
    setCargando(false);
  }, [listarMesasExamen, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const abiertas = mesas.filter((mesa) => mesa.estado === 'abierta');

  const renderItem: ListRenderItem<MesaExamen> = ({ item }) => (
    <FilaMesaAbierta mesa={item} onPresionar={() => router.push(`/instructor/mesas/${item.id}`)} />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>
          Postulá a tus alumnos directos a las mesas abiertas. El sistema calcula el grado inmediato superior.
        </Text>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Cargando mesas…</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar las mesas.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : abiertas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No hay mesas de examen abiertas por ahora.</Text>
        </View>
      ) : (
        <FlatList
          data={abiertas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cabecera: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
  },
  lista: {
    padding: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  filaPresionada: {
    backgroundColor: '#f2f2f2',
  },
  filaContenido: {
    flex: 1,
  },
  fecha: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111',
  },
  lugar: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  dueno: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  postulados: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 4,
  },
  chevron: {
    fontSize: 22,
    color: '#999',
    marginLeft: 8,
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
});
