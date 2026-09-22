import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function MesaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listarMesasExamen, cambiarEstadoMesa, sesion } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [mesa, setMesa] = useState<MesaExamen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [cambiando, setCambiando] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const resultado = await listarMesasExamen();
    const encontrada = resultado.data?.find((item) => item.id === id) ?? null;
    if (resultado.error != null || encontrada == null) {
      setError(true);
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setMesa(encontrada);
      setError(false);
    }
    setCargando(false);
  }, [id, listarMesasExamen, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const esPropia = mesa != null && mesa.maestro_id === sesion?.user?.id;

  const confirmarCambioEstado = (estado: EstadoMesa) => {
    if (mesa == null) return;
    Alert.alert(
      estado === 'cerrada' ? 'Cerrar mesa' : 'Finalizar mesa',
      estado === 'cerrada'
        ? 'Al cerrarla, los profesores ya no podrán postular alumnos. ¿Continuar?'
        : 'La mesa quedará finalizada. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar', onPress: () => void cambiarEstado(estado) },
      ],
    );
  };

  const cambiarEstado = async (estado: EstadoMesa) => {
    if (cambiando || mesa == null) return;
    setCambiando(true);
    try {
      const resultado = await cambiarEstadoMesa(mesa.id, estado);
      if (resultado.error != null) {
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        Alert.alert('No pudimos actualizar', 'Intentá de nuevo en unos minutos.');
        return;
      }
      setMesa((actual) => (actual != null ? { ...actual, estado } : actual));
    } catch {
      reportarError();
    } finally {
      setCambiando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando mesa…</Text>
      </View>
    );
  }

  if (error || mesa == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la mesa.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.fecha}>{formatearFecha(mesa.fecha)}</Text>
        <View style={[styles.badge, badgeEstilo(mesa.estado)]}>
          <Text style={[styles.badgeTexto, badgeTextoEstilo(mesa.estado)]}>
            {ETIQUETA_ESTADO[mesa.estado]}
          </Text>
        </View>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Lugar</Text>
        <Text style={styles.tarjetaContenido}>{mesa.lugar ?? 'Sin lugar definido'}</Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Postulados</Text>
        <Text style={styles.tarjetaContenido}>
          {mesa.cantidad_postulados} alumno(s) postulado(s) hasta ahora.
        </Text>
        <Text style={styles.tarjetaNota}>
          La inscripción y postulación de alumnos se habilita en la próxima fase.
        </Text>
      </View>

      {esPropia ? (
        <View style={styles.acciones}>
          <Pressable
            onPress={() => router.push(`/maestro/mesas/nueva?mesa_id=${mesa.id}`)}
            style={styles.botonPrimario}
            accessibilityRole="button"
          >
            <Text style={styles.botonPrimarioTexto}>Editar mesa</Text>
          </Pressable>

          {mesa.estado === 'abierta' ? (
            <Pressable
              onPress={() => confirmarCambioEstado('cerrada')}
              disabled={cambiando}
              style={[styles.botonSecundario, cambiando ? styles.botonDeshabilitado : null]}
              accessibilityRole="button"
            >
              <Text style={styles.botonSecundarioTexto}>Cerrar mesa</Text>
            </Pressable>
          ) : null}

          {mesa.estado === 'cerrada' ? (
            <Pressable
              onPress={() => confirmarCambioEstado('finalizada')}
              disabled={cambiando}
              style={[styles.botonSecundario, cambiando ? styles.botonDeshabilitado : null]}
              accessibilityRole="button"
            >
              <Text style={styles.botonSecundarioTexto}>Finalizar mesa</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={styles.soloLectura}>
          Esta mesa pertenece a otro maestro: solo podés consultarla.
        </Text>
      )}
    </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fecha: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 12,
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
  tarjetaContenido: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  tarjetaNota: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    lineHeight: 16,
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
  botonSecundario: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
  },
  botonSecundarioTexto: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  soloLectura: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
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
