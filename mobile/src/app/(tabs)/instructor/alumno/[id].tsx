import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  calcularEdad,
  formatearMonto,
  formatearPeriodo,
  mesActual,
  type AlumnoDetalle,
  type Genero,
  type PagoCuota,
} from '@/lib/perfil';

const ETIQUETA_GENERO: Record<Genero, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
};

function formatearFecha(fechaISO: string | null): string {
  if (fechaISO == null) return 'Sin datos';
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? 'Sin datos' : fecha.toLocaleDateString('es-AR');
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

export default function AlumnoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { obtenerAlumnoDetalle, listarCuotasAlumno, eliminarCuota } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [alumno, setAlumno] = useState<AlumnoDetalle | null>(null);
  const [cuotas, setCuotas] = useState<PagoCuota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const periodoActual = mesActual();

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const [resultadoAlumno, resultadoCuotas] = await Promise.all([
      obtenerAlumnoDetalle(id),
      listarCuotasAlumno(id),
    ]);
    if (resultadoAlumno.error != null || resultadoAlumno.data == null) {
      setError(true);
      if (resultadoAlumno.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setAlumno(resultadoAlumno.data);
      setCuotas(resultadoCuotas.data ?? []);
      setError(false);
    }
    setCargando(false);
  }, [id, obtenerAlumnoDetalle, listarCuotasAlumno, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const confirmarEliminarCuota = (cuota: PagoCuota) => {
    Alert.alert(
      'Eliminar cuota',
      `¿Seguro que querés eliminar la cuota del periodo ${formatearPeriodo(cuota.periodo)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void borrarCuota(cuota) },
      ],
    );
  };

  const borrarCuota = async (cuota: PagoCuota) => {
    const resultado = await eliminarCuota(cuota.id);
    if (resultado.error != null) {
      if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
      Alert.alert('No pudimos eliminar', 'Intentá de nuevo en unos minutos.');
      return;
    }
    setCuotas((actual) => actual.filter((item) => item.id !== cuota.id));
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando alumno…</Text>
      </View>
    );
  }

  if (error || alumno == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la ficha del alumno.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const edad = calcularEdad(alumno.fecha_nacimiento);
  const estadoMes: 'pagado' | 'pendiente' = cuotas.some((cuota) => cuota.periodo === periodoActual)
    ? 'pagado'
    : 'pendiente';

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.nombre}>{alumno.nombre_completo}</Text>

      <View style={styles.tarjeta}>
        <Fila etiqueta="DNI" valor={alumno.dni ?? 'Sin datos'} />
        <Fila
          etiqueta="Fecha de nacimiento"
          valor={
            edad != null
              ? `${formatearFecha(alumno.fecha_nacimiento)} (${edad} años)`
              : formatearFecha(alumno.fecha_nacimiento)
          }
        />
        <Fila etiqueta="Género" valor={alumno.genero != null ? ETIQUETA_GENERO[alumno.genero] : 'Sin datos'} />
        <Fila etiqueta="Grado" valor={etiquetaGrado(alumno.grado_actual)} />
        <Fila etiqueta="Peso" valor={alumno.peso_kg != null ? `${alumno.peso_kg} kg` : 'Sin datos'} />
        <Fila etiqueta="Altura" valor={alumno.altura_cm != null ? `${alumno.altura_cm} cm` : 'Sin datos'} />
        <Fila etiqueta="Teléfono" valor={alumno.telefono ?? 'Sin datos'} />
        <Fila etiqueta="Contacto de emergencia" valor={alumno.contacto_emergencia ?? 'Sin datos'} />
        <Fila etiqueta="Datos de salud" valor={alumno.datos_salud ?? 'Sin datos'} />
        <Fila etiqueta="Alta" valor={formatearFechaHora(alumno.creado_en)} />
      </View>

      <View style={styles.tarjeta}>
        <View style={styles.tarjetaCabecera}>
          <Text style={styles.tarjetaTitulo}>Cuotas</Text>
          <Pressable
            onPress={() => router.push(`/instructor/alumno/${alumno.id}/cuota`)}
            style={styles.botonChico}
            accessibilityRole="button"
          >
            <Text style={styles.botonChicoTexto}>+ Registrar cuota</Text>
          </Pressable>
        </View>

        <View style={[styles.estadoCuota, estadoMes === 'pagado' ? styles.estadoPagado : styles.estadoPendiente]}>
          <Text style={[styles.estadoCuotaTexto, estadoMes === 'pagado' ? styles.textoPagado : styles.textoPendiente]}>
            {formatearPeriodo(periodoActual)}: {estadoMes === 'pagado' ? 'Pagado' : 'Pendiente'}
          </Text>
        </View>

        {cuotas.length === 0 ? (
          <Text style={styles.tarjetaContenido}>Todavía no registraste cuotas para este alumno.</Text>
        ) : (
          cuotas.map((cuota) => (
            <View key={cuota.id} style={styles.filaCuota}>
              <View style={styles.cuotaInfo}>
                <Text style={styles.cuotaPeriodo}>{formatearPeriodo(cuota.periodo)}</Text>
                <Text style={styles.cuotaDatos}>
                  {formatearMonto(cuota.monto)} · {formatearFecha(cuota.fecha)}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmarEliminarCuota(cuota)}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar cuota del periodo ${cuota.periodo}`}
              >
                <Text style={styles.quitarCuota}>✕</Text>
              </Pressable>
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
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 16,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  fila: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  etiqueta: {
    fontSize: 13,
    color: '#666',
  },
  valor: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
    marginTop: 2,
  },
  tarjetaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginBottom: 8,
  },
  tarjetaTitulo: {
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
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
  estadoCuota: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  estadoPagado: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2E7D32',
  },
  estadoPendiente: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  estadoCuotaTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  textoPagado: {
    color: '#2E7D32',
  },
  textoPendiente: {
    color: '#C62828',
  },
  tarjetaContenido: {
    fontSize: 14,
    color: '#666',
    paddingBottom: 14,
  },
  filaCuota: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  cuotaInfo: {
    flex: 1,
  },
  cuotaPeriodo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  cuotaDatos: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  quitarCuota: {
    fontSize: 15,
    color: '#C62828',
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});