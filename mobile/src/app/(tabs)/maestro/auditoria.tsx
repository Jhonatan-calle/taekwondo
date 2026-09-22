import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  formatearMonto,
  formatearPeriodo,
  type InstructorLinaje,
  type LocacionAuditada,
} from '@/lib/perfil';

const ETIQUETA_ESTADO: Record<LocacionAuditada['estado_pago'], string> = {
  al_dia: 'Al día',
  vencida: 'Vencida',
  sin_pagos: 'Sin pagos',
};

function FilaLocacion({ locacion, onPresionar }: { locacion: LocacionAuditada; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{locacion.nombre}</Text>
        <Text style={styles.dueno}>{locacion.dueno_nombre}</Text>
        <Text style={styles.datos}>Pactado: {formatearMonto(locacion.valor_alquiler)}</Text>
        <Text style={styles.datos}>
          {locacion.ultimo_periodo_pagado != null
            ? `Último pago: ${formatearPeriodo(locacion.ultimo_periodo_pagado)} · ${formatearMonto(locacion.ultimo_monto)}`
            : 'Sin pagos registrados'}
        </Text>
        <View style={[styles.badge, badgeEstilo(locacion.estado_pago)]}>
          <Text style={[styles.badgeTexto, badgeTextoEstilo(locacion.estado_pago)]}>
            {ETIQUETA_ESTADO[locacion.estado_pago]}
            {locacion.estado_pago === 'vencida' && locacion.meses_adeudados > 0
              ? ` · ${locacion.meses_adeudados} mes(es)`
              : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function badgeEstilo(estado: LocacionAuditada['estado_pago']) {
  if (estado === 'al_dia') return styles.badgeAlDia;
  if (estado === 'vencida') return styles.badgeVencida;
  return styles.badgeSinPagos;
}

function badgeTextoEstilo(estado: LocacionAuditada['estado_pago']) {
  if (estado === 'al_dia') return styles.badgeTextoAlDia;
  if (estado === 'vencida') return styles.badgeTextoVencida;
  return styles.badgeTextoSinPagos;
}

export default function AuditoriaScreen() {
  const { listarLocacionesAuditadas, listarInstructoresSubordinados } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [locaciones, setLocaciones] = useState<LocacionAuditada[]>([]);
  const [instructores, setInstructores] = useState<InstructorLinaje[]>([]);
  const [instructorFiltro, setInstructorFiltro] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resultadoLocaciones, resultadoInstructores] = await Promise.all([
      listarLocacionesAuditadas(instructorFiltro ?? undefined),
      listarInstructoresSubordinados(),
    ]);

    if (resultadoLocaciones.error != null || resultadoLocaciones.data == null) {
      setError(true);
      if (resultadoLocaciones.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocaciones(resultadoLocaciones.data);
      setError(false);
    }

    if (resultadoInstructores.data != null) setInstructores(resultadoInstructores.data);
    setCargando(false);
  }, [instructorFiltro, listarLocacionesAuditadas, listarInstructoresSubordinados, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const renderItem: ListRenderItem<LocacionAuditada> = ({ item }) => (
    <FilaLocacion
      locacion={item}
      onPresionar={() => router.push(`/maestro/auditoria/${item.id}`)}
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.cabecera}>
        <Text style={styles.subtitulo}>
          Locaciones y alquileres de tu rama descendente (auditoría de infraestructura). Solo lectura.
        </Text>
      </View>

      {instructores.length > 0 ? (
        <View style={styles.filtros}>
          <Pressable
            onPress={() => setInstructorFiltro(null)}
            style={[styles.chipFiltro, instructorFiltro == null ? styles.chipFiltroActivo : null]}
          >
            <Text style={[styles.chipTexto, instructorFiltro == null ? styles.chipTextoActivo : null]}>
              Toda mi rama
            </Text>
          </Pressable>
          {instructores.map((instructor) => (
            <Pressable
              key={instructor.id}
              onPress={() => setInstructorFiltro(instructor.id)}
              style={[styles.chipFiltro, instructorFiltro === instructor.id ? styles.chipFiltroActivo : null]}
            >
              <Text
                style={[
                  styles.chipTexto,
                  instructorFiltro === instructor.id ? styles.chipTextoActivo : null,
                ]}
              >
                {instructor.nombre_completo}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {cargando ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Cargando auditoría…</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar la auditoría.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : locaciones.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>
            {instructorFiltro != null
              ? 'Este instructor no tiene locaciones registradas.'
              : 'Todavía no hay locaciones en tu rama descendente.'}
          </Text>
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
  cabecera: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 8,
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
  dueno: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    marginTop: 2,
  },
  datos: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeAlDia: {
    backgroundColor: '#e8f5e9',
    borderColor: '#2E7D32',
  },
  badgeVencida: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  badgeSinPagos: {
    backgroundColor: '#f5f5f5',
    borderColor: '#bbb',
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextoAlDia: {
    color: '#2E7D32',
  },
  badgeTextoVencida: {
    color: '#C62828',
  },
  badgeTextoSinPagos: {
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
