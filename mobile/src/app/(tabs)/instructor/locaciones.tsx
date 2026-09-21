import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { formatearMonto, type Locacion } from '@/lib/perfil';

function FilaLocacion({ locacion, onPresionar }: { locacion: Locacion; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{locacion.nombre}</Text>
        <Text style={styles.direccion} numberOfLines={1}>
          {locacion.direccion}
        </Text>
        <Text style={styles.monto}>Alquiler pactado: {formatearMonto(locacion.valor_alquiler)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function LocacionesScreen() {
  const { listarLocaciones } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const resultado = await listarLocaciones();
    if (resultado.error != null || resultado.data == null) {
      setError(true);
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocaciones(resultado.data);
      setError(false);
    }
    setCargando(false);
  }, [listarLocaciones, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const renderItem: ListRenderItem<Locacion> = ({ item }) => (
    <FilaLocacion
      locacion={item}
      onPresionar={() => router.push(`/instructor/locacion/${item.id}`)}
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.barraAcciones}>
        <Text style={styles.subtitulo}>
          Centros de entrenamiento donde dictás clases. El monto de cada pago se registra al asentar el periodo.
        </Text>
        <Pressable
          onPress={() => router.push('/instructor/registrar-locacion')}
          style={styles.botonNuevo}
          accessibilityRole="button"
        >
          <Text style={styles.botonNuevoTexto}>+ Nueva locación</Text>
        </Pressable>
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Cargando locaciones…</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar las locaciones.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : locaciones.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Todavía no registraste ninguna locación.</Text>
          <Pressable
            onPress={() => router.push('/instructor/registrar-locacion')}
            style={styles.reintentar}
            accessibilityRole="button"
          >
            <Text style={styles.reintentarTexto}>Registrar la primera</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={locaciones}
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
  barraAcciones: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  botonNuevo: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botonNuevoTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  nombre: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111',
  },
  direccion: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  monto: {
    fontSize: 13,
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
