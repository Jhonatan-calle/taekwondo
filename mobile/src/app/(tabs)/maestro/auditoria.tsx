import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type SeccionRama = {
  raizId: string | null;
  titulo: string;
  locaciones: LocacionAuditada[];
};

function FilaLocacion({
  locacion,
  indirecta,
  onPresionar,
}: {
  locacion: LocacionAuditada;
  indirecta: boolean;
  onPresionar: () => void;
}) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <Text style={styles.nombre}>{locacion.nombre}</Text>
        <Text style={styles.dueno}>{indirecta ? 'De su rama' : locacion.dueno_nombre ?? 'De su rama'}</Text>
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
  const { listarLocacionesAuditadas, listarInstructoresSubordinados, listarRamaDescendientes } =
    useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [locaciones, setLocaciones] = useState<LocacionAuditada[]>([]);
  const [instructores, setInstructores] = useState<InstructorLinaje[]>([]);
  const [raizPorDescendiente, setRaizPorDescendiente] = useState<Map<string, string>>(new Map());
  const [ramaFiltro, setRamaFiltro] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resultadoLocaciones, resultadoInstructores, resultadoRama] = await Promise.all([
      listarLocacionesAuditadas(),
      listarInstructoresSubordinados(),
      listarRamaDescendientes(),
    ]);

    if (resultadoLocaciones.error != null || resultadoLocaciones.data == null) {
      setError(true);
      if (resultadoLocaciones.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setLocaciones(resultadoLocaciones.data);
      setError(false);
    }

    if (resultadoInstructores.data != null) setInstructores(resultadoInstructores.data);
    if (resultadoRama.data != null) {
      setRaizPorDescendiente(new Map(resultadoRama.data.map((fila) => [fila.descendiente_id, fila.raiz_id])));
    }
    setCargando(false);
  }, [listarLocacionesAuditadas, listarInstructoresSubordinados, listarRamaDescendientes, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  // Secciones: una por subordinado directo (raíz de rama) + "De su rama".
  const secciones = useMemo<SeccionRama[]>(() => {
    const nombreDirecto = new Map(instructores.map((i) => [i.id, i.nombre_completo]));
    const grupos = new Map<string, LocacionAuditada[]>();
    const sueltas: LocacionAuditada[] = [];

    for (const locacion of locaciones) {
      const raiz = raizPorDescendiente.get(locacion.dueno_id) ?? null;
      if (raiz != null && nombreDirecto.has(raiz)) {
        const lista = grupos.get(raiz) ?? [];
        lista.push(locacion);
        grupos.set(raiz, lista);
      } else {
        sueltas.push(locacion);
      }
    }

    const seccionesDirectas: SeccionRama[] = instructores
      .map((instructor) => ({
        raizId: instructor.id,
        titulo: instructor.nombre_completo,
        locaciones: grupos.get(instructor.id) ?? [],
      }))
      .filter((seccion) => seccion.locaciones.length > 0);

    if (sueltas.length > 0) {
      seccionesDirectas.push({ raizId: null, titulo: 'De su rama', locaciones: sueltas });
    }
    return seccionesDirectas;
  }, [locaciones, instructores, raizPorDescendiente]);

  const seccionesVisibles = useMemo(
    () => (ramaFiltro == null ? secciones : secciones.filter((s) => s.raizId === ramaFiltro)),
    [secciones, ramaFiltro],
  );

  const totalVisibles = seccionesVisibles.reduce((total, s) => total + s.locaciones.length, 0);

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
            onPress={() => setRamaFiltro(null)}
            style={[styles.chipFiltro, ramaFiltro == null ? styles.chipFiltroActivo : null]}
          >
            <Text style={[styles.chipTexto, ramaFiltro == null ? styles.chipTextoActivo : null]}>
              Toda mi rama
            </Text>
          </Pressable>
          {instructores.map((instructor) => (
            <Pressable
              key={instructor.id}
              onPress={() => setRamaFiltro(instructor.id)}
              style={[styles.chipFiltro, ramaFiltro === instructor.id ? styles.chipFiltroActivo : null]}
            >
              <Text style={[styles.chipTexto, ramaFiltro === instructor.id ? styles.chipTextoActivo : null]}>
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
      ) : totalVisibles === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>
            {ramaFiltro != null
              ? 'Esta rama no tiene locaciones registradas.'
              : 'Todavía no hay locaciones en tu rama descendente.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {seccionesVisibles.map((seccion) => {
            const vencidas = seccion.locaciones.filter((l) => l.estado_pago === 'vencida').length;
            return (
              <View key={seccion.raizId ?? 'rama'} style={styles.seccion}>
                <View style={styles.seccionCabecera}>
                  <Text style={styles.seccionTitulo}>{seccion.titulo}</Text>
                  <Text style={styles.seccionResumen}>
                    {seccion.locaciones.length} locación(es)
                    {vencidas > 0 ? ` · ${vencidas} vencida(s)` : ''}
                  </Text>
                </View>
                {seccion.locaciones.map((locacion) => (
                  <FilaLocacion
                    key={locacion.id}
                    locacion={locacion}
                    indirecta={seccion.raizId != null && locacion.dueno_id !== seccion.raizId}
                    onPresionar={() => router.push(`/maestro/auditoria/${locacion.id}`)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
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
  seccion: {
    marginBottom: 20,
  },
  seccionCabecera: {
    borderBottomWidth: 2,
    borderBottomColor: '#C62828',
    paddingBottom: 6,
    marginBottom: 10,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  seccionResumen: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
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
