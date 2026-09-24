import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { formatearMonto, formatearPeriodo, type LocacionDetalle, type PagoAlquiler } from '@/lib/perfil';

export default function LocacionDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { obtenerLocacionDetalle, eliminarLocacion, listarPagosAlquiler, obtenerUrlComprobante, eliminarPagoAlquiler } =
    useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [locacion, setLocacion] = useState<LocacionDetalle | null>(null);
  const [pagos, setPagos] = useState<PagoAlquiler[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const [resultadoLocacion, resultadoPagos] = await Promise.all([
      obtenerLocacionDetalle(id),
      listarPagosAlquiler(id),
    ]);
    if (resultadoLocacion.error != null || resultadoLocacion.data == null) {
      setError(true);
      if (resultadoLocacion.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocacion(resultadoLocacion.data);
      setPagos(resultadoPagos.data ?? []);
      setError(false);
    }
    setCargando(false);
  }, [id, obtenerLocacionDetalle, listarPagosAlquiler, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const verComprobante = async (pago: PagoAlquiler) => {
    if (pago.comprobante_url == null) return;
    const { data, error: err } = await obtenerUrlComprobante(pago.comprobante_url);
    if (err != null || data == null) {
      if (err === MENSAJE_ERROR_GENERICO) reportarError();
      Alert.alert('No pudimos abrir el comprobante', 'Intentá de nuevo en unos minutos.');
      return;
    }
    // Se abre con el visor nativo del dispositivo (imagen o PDF).
    try {
      await Linking.openURL(data);
    } catch {
      reportarError();
      Alert.alert('No pudimos abrir el comprobante', 'No hay una app disponible para ver este archivo.');
    }
  };

  const confirmarEliminarPago = (pago: PagoAlquiler) => {
    Alert.alert(
      'Eliminar pago',
      `¿Seguro que querés eliminar el pago del periodo ${formatearPeriodo(pago.periodo)}? También se borrará el comprobante adjunto.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void borrarPago(pago) },
      ],
    );
  };

  const borrarPago = async (pago: PagoAlquiler) => {
    const resultado = await eliminarPagoAlquiler(pago.id, pago.comprobante_url);
    if (resultado.error != null) {
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
      Alert.alert('No pudimos eliminar', 'Intentá de nuevo en unos minutos.');
      return;
    }
    setPagos((actual) => actual.filter((item) => item.id !== pago.id));
  };

  const confirmarEliminar = () => {
    if (locacion == null) return;
    if (locacion.grupos.length > 0) {
      Alert.alert(
        'No se puede eliminar',
        `Esta locación tiene ${locacion.grupos.length} grupo(s) asociado(s). Reasigná esos grupos a otra locación (o quitáles la locación) antes de eliminarla.`,
      );
      return;
    }
    Alert.alert('Eliminar locación', '¿Seguro que querés eliminar esta locación?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void eliminar() },
    ]);
  };

  const eliminar = async () => {
    if (eliminando || id == null) return;
    setEliminando(true);
    try {
      const resultado = await eliminarLocacion(id);
      if (resultado.error != null) {
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        Alert.alert('No pudimos eliminar', 'No pudimos eliminar la locación, intentá de nuevo en unos minutos.');
        return;
      }
      router.back();
    } catch {
      reportarError();
    } finally {
      setEliminando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando locación…</Text>
      </View>
    );
  }

  if (error || locacion == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la locación.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.nombre}>{locacion.nombre}</Text>
        <Text style={styles.direccion}>{locacion.direccion}</Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Valor de alquiler pactado</Text>
        <Text style={styles.tarjetaMonto}>{formatearMonto(locacion.valor_alquiler)}</Text>
        <Text style={styles.tarjetaNota}>
          Es el valor acordado del contrato. El monto efectivamente pagado se registra por periodo.
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <View style={styles.tarjetaCabecera}>
          <Text style={styles.tarjetaTitulo}>Pagos de alquiler</Text>
          <Pressable
            onPress={() =>
              router.push(
                `/instructor/locacion/${locacion.id}/pago?valor_alquiler=${locacion.valor_alquiler}`,
              )
            }
            style={styles.botonChico}
            accessibilityRole="button"
          >
            <Text style={styles.botonChicoTexto}>+ Registrar pago</Text>
          </Pressable>
        </View>
        {pagos.length === 0 ? (
          <Text style={styles.tarjetaContenido}>Todavía no registraste pagos para esta locación.</Text>
        ) : (
          pagos.map((pago) => (
            <View key={pago.id} style={styles.filaPago}>
              <View style={styles.pagoInfo}>
                <Text style={styles.pagoPeriodo}>{formatearPeriodo(pago.periodo)}</Text>
                <Text style={styles.pagoDatos}>
                  {formatearMonto(pago.monto)} · {pago.fecha_pago}
                </Text>
              </View>
              {pago.comprobante_url != null ? (
                <Pressable
                  onPress={() => void verComprobante(pago)}
                  style={styles.botonChicoSecundario}
                  accessibilityRole="button"
                >
                  <Text style={styles.botonChicoSecundarioTexto}>Comprobante</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => confirmarEliminarPago(pago)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar pago del periodo ${pago.periodo}`}
              >
                <Text style={styles.quitarPago}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Grupos asociados</Text>
        {locacion.grupos.length === 0 ? (
          <Text style={styles.tarjetaContenido}>Ningún grupo usa esta locación todavía.</Text>
        ) : (
          <>
            <Text style={styles.tarjetaNota}>
              Para eliminar la locación, primero reasigná o quitá la locación de estos grupos.
            </Text>
            {locacion.grupos.map((grupo) => (
              <Pressable
                key={grupo.id}
                onPress={() => router.push(`/instructor/grupo/${grupo.id}`)}
                style={styles.filaGrupo}
                accessibilityRole="button"
              >
                <Text style={styles.filaGrupoTexto}>{grupo.nombre}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>

      <View style={styles.acciones}>
        <Pressable
          onPress={() => router.push(`/instructor/registrar-locacion?locacion_id=${locacion.id}`)}
          style={styles.botonPrimario}
          accessibilityRole="button"
        >
          <Text style={styles.botonPrimarioTexto}>Editar locación</Text>
        </Pressable>
        <Pressable
          onPress={confirmarEliminar}
          disabled={eliminando}
          style={[
            styles.botonPeligro,
            eliminando || locacion.grupos.length > 0 ? styles.botonDeshabilitado : null,
          ]}
          accessibilityRole="button"
          accessibilityHint={
            locacion.grupos.length > 0
              ? 'La locación tiene grupos asociados; te explicamos cómo reasignarlos'
              : undefined
          }
        >
          <Text style={styles.botonPeligroTexto}>
            {eliminando ? 'Eliminando…' : 'Eliminar locación'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contenido: {
    padding: 24,
    paddingBottom: 48,
  },
  cabecera: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  direccion: {
    fontSize: 15,
    color: '#666',
    marginTop: 6,
  },
  tarjeta: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
  },
  tarjetaTitulo: {
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#888',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tarjetaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  botonChico: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#C62828',
    borderRadius: 6,
  },
  botonChicoTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  botonChicoSecundario: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
    marginRight: 10,
  },
  botonChicoSecundarioTexto: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
  },
  filaPago: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pagoInfo: {
    flex: 1,
  },
  pagoPeriodo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  pagoDatos: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  quitarPago: {
    fontSize: 15,
    color: '#C62828',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  tarjetaMonto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C62828',
  },
  tarjetaNota: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  tarjetaContenido: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  filaGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filaGrupoTexto: {
    fontSize: 15,
    color: '#222',
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    color: '#999',
    marginLeft: 8,
  },
  acciones: {
    marginTop: 8,
    gap: 12,
  },
  botonPrimario: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#C62828',
  },
  botonPrimarioTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  botonPeligro: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
  },
  botonPeligroTexto: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
  },
  botonDeshabilitado: {
    opacity: 0.6,
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
