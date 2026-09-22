import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { formatearMonto, type MesaExamen, type PostulacionExamen } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

const ETIQUETA_ESTADO: Record<PostulacionExamen['estado'], string> = {
  postulado: 'Postulado',
  aprobado: 'Aprobado',
  desaprobado: 'Desaprobado',
  ausente: 'Ausente',
};

export default function MesaInstructorDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { listarMesasExamen, listarPostulacionesMesa, quitarPostulacion } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [mesa, setMesa] = useState<MesaExamen | null>(null);
  const [postulaciones, setPostulaciones] = useState<PostulacionExamen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const [resultadoMesas, resultadoPostulaciones] = await Promise.all([
      listarMesasExamen(),
      listarPostulacionesMesa(id),
    ]);
    const encontrada = resultadoMesas.data?.find((item) => item.id === id) ?? null;
    if (resultadoMesas.error != null || encontrada == null) {
      setError(true);
      if (resultadoMesas.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setMesa(encontrada);
      setPostulaciones(resultadoPostulaciones.data ?? []);
      setError(false);
    }
    setCargando(false);
  }, [id, listarMesasExamen, listarPostulacionesMesa, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const confirmarQuitar = (postulacion: PostulacionExamen) => {
    Alert.alert(
      'Quitar postulación',
      `¿Querés quitar a ${postulacion.nombre_alumno} de esta mesa?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Quitar', style: 'destructive', onPress: () => void quitar(postulacion) },
      ],
    );
  };

  const quitar = async (postulacion: PostulacionExamen) => {
    const resultado = await quitarPostulacion(postulacion.id);
    if (resultado.error != null) {
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
      Alert.alert('No pudimos quitar', 'Intentá de nuevo en unos minutos.');
      return;
    }
    setPostulaciones((actual) => actual.filter((item) => item.id !== postulacion.id));
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

  const mesaAbierta = mesa.estado === 'abierta';

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.fecha}>{formatearFecha(mesa.fecha)}</Text>
        <Text style={styles.lugar}>{mesa.lugar ?? 'Sin lugar definido'}</Text>
      </View>

      {mesaAbierta ? (
        <Pressable
          onPress={() => router.push(`/instructor/mesas/${mesa.id}/postular`)}
          style={styles.botonPrimario}
          accessibilityRole="button"
        >
          <Text style={styles.botonPrimarioTexto}>Postular alumnos</Text>
        </Pressable>
      ) : (
        <Text style={styles.avisoCerrada}>
          Esta mesa está {mesa.estado}: ya no se pueden hacer postulaciones.
        </Text>
      )}

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Tus postulaciones</Text>
        {postulaciones.length === 0 ? (
          <Text style={styles.tarjetaContenido}>Todavía no postulaste alumnos a esta mesa.</Text>
        ) : (
          postulaciones.map((postulacion) => (
            <View key={postulacion.id} style={styles.filaPostulacion}>
              <View style={styles.postulacionInfo}>
                <Text style={styles.nombre}>{postulacion.nombre_alumno}</Text>
                <Text style={styles.datos}>
                  Aspira a {etiquetaGrado(postulacion.grado_aspirado)} ·{' '}
                  {postulacion.derecho_examen != null
                    ? formatearMonto(postulacion.derecho_examen)
                    : 'Derecho sin cobrar'}
                </Text>
                <Text style={styles.estado}>{ETIQUETA_ESTADO[postulacion.estado]}</Text>
              </View>
              {mesaAbierta && postulacion.estado === 'postulado' ? (
                <View style={styles.accionesFila}>
                  <Pressable
                    onPress={() =>
                      router.push(`/instructor/mesas/${mesa.id}/postular?postulacion_id=${postulacion.id}`)
                    }
                    style={styles.botonEditarCobro}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar el cobro del derecho de examen de ${postulacion.nombre_alumno}`}
                  >
                    <Text style={styles.botonEditarCobroTexto}>Editar cobro</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmarQuitar(postulacion)}
                    style={styles.botonQuitar}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar la postulación de ${postulacion.nombre_alumno}`}
                  >
                    <Text style={styles.botonQuitarTexto}>Quitar</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))
        )}
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
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  fecha: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  lugar: {
    fontSize: 15,
    color: '#666',
    marginTop: 6,
  },
  botonPrimario: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#C62828',
    marginBottom: 20,
  },
  botonPrimarioTexto: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  avisoCerrada: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  tarjeta: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
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
  },
  filaPostulacion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  postulacionInfo: {
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
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 2,
  },
  accionesFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonEditarCobro: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 6,
  },
  botonEditarCobroTexto: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  botonQuitar: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 6,
  },
  botonQuitarTexto: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
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
