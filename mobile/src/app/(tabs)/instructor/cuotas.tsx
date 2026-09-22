import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { formatearMonto, formatearPeriodo, mesActual, type CuotaAlumno } from '@/lib/perfil';

function mesesCercanos(cantidad: number): string[] {
  const hoy = new Date();
  const lista: string[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    lista.push(`${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`);
  }
  return lista;
}

function FilaAlumno({ cuota, onPresionar }: { cuota: CuotaAlumno; onPresionar: () => void }) {
  const pagado = cuota.estado === 'pagado';
  return (
    <Pressable
      onPress={onPresionar}
      style={[styles.fila, pagado ? styles.filaPagado : styles.filaPendiente]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{cuota.nombre_completo}</Text>
        <Text style={styles.datos}>{etiquetaGrado(cuota.grado_actual)}</Text>
        {pagado ? (
          <Text style={styles.montoPagado}>{formatearMonto(cuota.monto)}</Text>
        ) : (
          <Text style={styles.sinPago}>Sin registrar</Text>
        )}
      </View>
      <View style={[styles.estado, pagado ? styles.badgePagado : styles.badgePendiente]}>
        <Text style={[styles.estadoTexto, pagado ? styles.textoPagado : styles.textoPendiente]}>
          {pagado ? 'Pagado' : 'Pendiente'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function CuotasScreen() {
  const { listarCuotasPorPeriodo } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [periodo, setPeriodo] = useState(mesActual());
  const [cuotas, setCuotas] = useState<CuotaAlumno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const periodos = mesesCercanos(6);

  const cargar = useCallback(async () => {
    setCargando(true);
    const resultado = await listarCuotasPorPeriodo(periodo);
    if (resultado.error != null || resultado.data == null) {
      setError(true);
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setCuotas(resultado.data);
      setError(false);
    }
    setCargando(false);
  }, [periodo, listarCuotasPorPeriodo, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const pagados = cuotas.filter((cuota) => cuota.estado === 'pagado').length;

  const renderItem: ListRenderItem<CuotaAlumno> = ({ item }) => (
    <FilaAlumno
      cuota={item}
      onPresionar={() =>
        item.estado === 'pagado'
          ? router.push(`/instructor/alumno/${item.alumno_id}`)
          : router.push(`/instructor/alumno/${item.alumno_id}/cuota`)
      }
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>
          Estado de cobranzas del periodo entre tus alumnos directos.
        </Text>
        <View style={styles.filtros}>
          {periodos.map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriodo(p)}
              style={[styles.chipFiltro, periodo === p ? styles.chipFiltroActivo : null]}
            >
              <Text style={[styles.chipTexto, periodo === p ? styles.chipTextoActivo : null]}>
                {formatearPeriodo(p)}
              </Text>
            </Pressable>
          ))}
        </View>
        {!cargando && !error && cuotas.length > 0 ? (
          <Text style={styles.resumen}>
            {pagados} de {cuotas.length} alumnos pagaron {formatearPeriodo(periodo)}
          </Text>
        ) : null}
      </View>

      {cargando ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Cargando cuotas…</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar las cuotas.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : cuotas.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No tenés alumnos directos para cobrar.</Text>
        </View>
      ) : (
        <FlatList
          data={cuotas}
          keyExtractor={(item) => item.alumno_id}
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
    marginBottom: 12,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipFiltro: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipFiltroActivo: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  chipTexto: {
    fontSize: 13,
    color: '#555',
  },
  chipTextoActivo: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  resumen: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 12,
  },
  lista: {
    padding: 20,
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
  filaPagado: {
    borderColor: '#A5D6A7',
    backgroundColor: '#f1f8f2',
  },
  filaPendiente: {
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
  montoPagado: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  sinPago: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  estado: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgePagado: {
    borderColor: '#2E7D32',
    backgroundColor: '#e8f5e9',
  },
  badgePendiente: {
    borderColor: '#C62828',
    backgroundColor: '#fff',
  },
  estadoTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  textoPagado: {
    color: '#2E7D32',
  },
  textoPendiente: {
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
});
