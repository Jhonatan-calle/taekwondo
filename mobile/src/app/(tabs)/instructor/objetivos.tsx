import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { etiquetaElemento } from '@/constants/elementosClase';
import { aIsoLocal, mesActual, resumirObjetivos, type ClaseItem, type Grupo } from '@/lib/perfil';

type Periodo = 'mes' | 'tres_meses' | 'todo';

const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: 'mes', etiqueta: 'Mes actual' },
  { valor: 'tres_meses', etiqueta: 'Últimos 3 meses' },
  { valor: 'todo', etiqueta: 'Todo' },
];

// Fecha mínima (ISO) para el período elegido. Cadena vacía = sin límite.
function desdePeriodo(periodo: Periodo): string {
  if (periodo === 'mes') return `${mesActual()}-01`;
  if (periodo === 'tres_meses') {
    const hace90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    return aIsoLocal(hace90);
  }
  return '';
}

export default function ObjetivosClaseScreen() {
  const { listarClases, listarGrupos } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [clases, setClases] = useState<ClaseItem[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    const [resultadoClases, resultadoGrupos] = await Promise.all([listarClases(), listarGrupos()]);
    if (resultadoClases.error != null || resultadoClases.data == null) {
      setError(true);
      if (resultadoClases.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setClases(resultadoClases.data);
    }
    if (resultadoGrupos.data != null) setGrupos(resultadoGrupos.data);
    setCargando(false);
  }, [listarClases, listarGrupos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const filtradas = useMemo(() => {
    const desde = desdePeriodo(periodo);
    return clases.filter((clase) => {
      if (desde !== '' && clase.fecha < desde) return false;
      if (grupoId != null && clase.grupo_id !== grupoId) return false;
      return true;
    });
  }, [clases, periodo, grupoId]);

  const resumen = useMemo(() => resumirObjetivos(filtradas), [filtradas]);
  const totalMenciones = resumen.reduce((total, item) => total + item.clases, 0);

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.subtitulo}>
        Distribución de la práctica por elemento del ciclo ITF. El porcentaje se calcula sobre el total de
        objetivos marcados (suma 100%).
      </Text>

      {/* Filtro de período */}
      <Text style={styles.etiqueta}>Período</Text>
      <View style={styles.chipsContenedor}>
        {PERIODOS.map((opcion) => {
          const activo = periodo === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setPeriodo(opcion.valor)}
              style={[styles.chip, activo ? styles.chipSeleccionado : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text style={[styles.chipTexto, activo ? styles.chipTextoSeleccionado : null]}>
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Filtro de grupo */}
      <Text style={styles.etiqueta}>Grupo</Text>
      <View style={styles.chipsContenedor}>
        <Pressable
          onPress={() => setGrupoId(null)}
          style={[styles.chip, grupoId == null ? styles.chipSeleccionado : null]}
          accessibilityRole="button"
          accessibilityState={{ selected: grupoId == null }}
        >
          <Text style={[styles.chipTexto, grupoId == null ? styles.chipTextoSeleccionado : null]}>
            Todos
          </Text>
        </Pressable>
        {grupos.map((grupo) => {
          const activo = grupoId === grupo.id;
          return (
            <Pressable
              key={grupo.id}
              onPress={() => setGrupoId(grupo.id)}
              style={[styles.chip, activo ? styles.chipSeleccionado : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Text style={[styles.chipTexto, activo ? styles.chipTextoSeleccionado : null]}>
                {grupo.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {cargando ? (
        <ActivityIndicator style={styles.cargando} color="#C62828" />
      ) : error ? (
        <View style={styles.bloqueError}>
          <Text style={styles.errorTexto}>No pudimos cargar los objetivos.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : totalMenciones === 0 ? (
        <Text style={styles.vacio}>No hay clases con objetivos en el período seleccionado.</Text>
      ) : (
        <View style={styles.lista}>
          {resumen.map((item) => (
            <View key={item.elemento} style={styles.fila}>
              <View style={styles.filaCabecera}>
                <Text style={styles.filaTitulo}>{etiquetaElemento(item.elemento)}</Text>
                <Text style={styles.filaValor}>
                  {item.clases} clase{item.clases === 1 ? '' : 's'} · {Math.round(item.porcentaje)}%
                </Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barraRelleno, { width: `${item.porcentaje}%` }]} />
              </View>
            </View>
          ))}
        </View>
      )}
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
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chipsContenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  chipSeleccionado: {
    borderColor: '#C62828',
    backgroundColor: '#fdf0f0',
  },
  chipTexto: {
    fontSize: 14,
    color: '#333',
  },
  chipTextoSeleccionado: {
    color: '#C62828',
    fontWeight: '600',
  },
  cargando: {
    marginTop: 32,
  },
  bloqueError: {
    marginTop: 24,
    alignItems: 'center',
  },
  errorTexto: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  reintentar: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#C62828',
    borderRadius: 6,
  },
  reintentarTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  vacio: {
    marginTop: 24,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  lista: {
    marginTop: 8,
  },
  fila: {
    marginBottom: 16,
  },
  filaCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  filaTitulo: {
    fontSize: 14,
    color: '#111',
    flex: 1,
    paddingRight: 8,
  },
  filaValor: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  barraFondo: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: 10,
    backgroundColor: '#C62828',
    borderRadius: 5,
  },
});
