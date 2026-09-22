import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { EstadoMesa, MesaExamen } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

const ETIQUETA_ESTADO: Record<EstadoMesa, string> = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  finalizada: 'Finalizada',
};

function FilaMesa({
  mesa,
  esPropia,
  onPresionar,
}: {
  mesa: MesaExamen;
  esPropia: boolean;
  onPresionar: () => void;
}) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <View style={styles.filaHeader}>
          <Text style={styles.fecha}>{formatearFecha(mesa.fecha)}</Text>
          <View style={[styles.badge, badgeEstilo(mesa.estado)]}>
            <Text style={[styles.badgeTexto, badgeTextoEstilo(mesa.estado)]}>
              {ETIQUETA_ESTADO[mesa.estado]}
            </Text>
          </View>
        </View>
        <Text style={styles.lugar}>{mesa.lugar ?? 'Sin lugar definido'}</Text>
        <Text style={styles.postulados}>
          {esPropia ? 'Tu mesa · ' : ''}
          {mesa.cantidad_postulados} postulado(s)
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function badgeEstilo(estado: EstadoMesa) {
  if (estado === 'abierta') return styles.badgeAbierta;
  if (estado === 'cerrada') return styles.badgeCerrada;
  return styles.badgeFinalizada;
}

function badgeTextoEstilo(estado: EstadoMesa) {
  if (estado === 'abierta') return styles.badgeTextoAbierta;
  if (estado === 'cerrada') return styles.badgeTextoCerrada;
  return styles.badgeTextoFinalizada;
}

export default function MesasScreen() {
  const { listarMesasExamen, esMaestro, sesion } = useAuthGlobal();
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

  const usuarioId = sesion?.user?.id;
  const misMesas = mesas.filter((mesa) => mesa.maestro_id === usuarioId);
  const otrasMesas = mesas.filter((mesa) => mesa.maestro_id !== usuarioId);

  const renderItem: ListRenderItem<MesaExamen> = ({ item }) => (
    <FilaMesa
      mesa={item}
      esPropia={item.maestro_id === usuarioId}
      onPresionar={() => router.push(`/maestro/mesas/${item.id}`)}
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.barraAcciones}>
        <Text style={styles.subtitulo}>
          Mesas de examen de graduación. Podés abrir una mesa con fecha y lugar.
        </Text>
        {esMaestro ? (
          <Pressable
            onPress={() => router.push('/maestro/mesas/nueva')}
            style={styles.botonNuevo}
            accessibilityRole="button"
          >
            <Text style={styles.botonNuevoTexto}>+ Nueva mesa</Text>
          </Pressable>
        ) : null}
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
      ) : mesas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Todavía no hay mesas de examen abiertas.</Text>
          {esMaestro ? (
            <Pressable
              onPress={() => router.push('/maestro/mesas/nueva')}
              style={styles.reintentar}
              accessibilityRole="button"
            >
              <Text style={styles.reintentarTexto}>Crear la primera</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={misMesas.length > 0 ? [...misMesas, ...otrasMesas] : otrasMesas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            misMesas.length > 0 && otrasMesas.length > 0 ? (
              <Text style={styles.seccion}>Tus mesas primero</Text>
            ) : null
          }
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
  seccion: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#888',
    marginBottom: 10,
    letterSpacing: 0.5,
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
  filaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fecha: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111',
  },
  lugar: {
    fontSize: 14,
    color: '#333',
  },
  postulados: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeAbierta: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2E7D32',
  },
  badgeCerrada: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  badgeFinalizada: {
    backgroundColor: '#f5f5f5',
    borderColor: '#bbb',
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextoAbierta: {
    color: '#2E7D32',
  },
  badgeTextoCerrada: {
    color: '#C62828',
  },
  badgeTextoFinalizada: {
    color: '#777',
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
