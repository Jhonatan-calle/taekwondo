import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  formatearMonto,
  formatearPeriodo,
  type LocacionAuditada,
  type PagoAlquiler,
} from '@/lib/perfil';

export default function AuditoriaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listarLocacionesAuditadas, listarPagosAlquiler, obtenerUrlComprobante } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [locacion, setLocacion] = useState<LocacionAuditada | null>(null);
  const [pagos, setPagos] = useState<PagoAlquiler[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    // La RLS `*_select_superior` ya limita la lectura a la rama descendente.
    const [resultadoLocaciones, resultadoPagos] = await Promise.all([
      listarLocacionesAuditadas(),
      listarPagosAlquiler(id),
    ]);

    const encontrada = resultadoLocaciones.data?.find((item) => item.id === id) ?? null;

    if (resultadoLocaciones.error != null || encontrada == null) {
      setError(true);
      if (resultadoLocaciones.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocacion(encontrada);
      setPagos(resultadoPagos.data ?? []);
      setError(false);
    }
    setCargando(false);
  }, [id, listarLocacionesAuditadas, listarPagosAlquiler, reportarError]);

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
    try {
      await Linking.openURL(data);
    } catch {
      reportarError();
      Alert.alert('No pudimos abrir el comprobante', 'No hay una app disponible para ver este archivo.');
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
        <Text style={styles.aviso}>No pudimos cargar la locación auditada.</Text>
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
        <Text style={styles.dueno}>{locacion.dueno_nombre ?? 'De su rama'}</Text>
        <Text style={styles.direccion}>{locacion.direccion}</Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Valor de alquiler pactado</Text>
        <Text style={styles.tarjetaMonto}>{formatearMonto(locacion.valor_alquiler)}</Text>
        <Text style={styles.tarjetaNota}>
          Valor acordado del contrato del instructor. Es solo lectura.
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Estado de pago</Text>
        <Text style={styles.estado}>
          {locacion.estado_pago === 'al_dia'
            ? 'Al día'
            : locacion.estado_pago === 'vencida'
              ? `Vencida · ${locacion.meses_adeudados} mes(es) adeudado(s)`
              : 'Sin pagos registrados'}
        </Text>
        <Text style={styles.tarjetaNota}>
          Se deduce del último periodo pagado (el sistema no almacena fecha de vencimiento).
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Historial de pagos</Text>
        {pagos.length === 0 ? (
          <Text style={styles.tarjetaContenido}>Sin pagos registrados.</Text>
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
                  style={styles.botonChico}
                  accessibilityRole="button"
                >
                  <Text style={styles.botonChicoTexto}>Comprobante</Text>
                </Pressable>
              ) : (
                <Text style={styles.sinComprobante}>Sin adjunto</Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// Carga al enfocar (mismo patrón que el resto de las pantallas de detalle).
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
  dueno: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 4,
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
  tarjetaMonto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C62828',
  },
  tarjetaNota: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    lineHeight: 16,
  },
  tarjetaContenido: {
    fontSize: 15,
    color: '#222',
  },
  estado: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
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
  botonChico: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
  },
  botonChicoTexto: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
  },
  sinComprobante: {
    fontSize: 12,
    color: '#999',
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
