import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import type { ClaseItem, Grupo } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function esFechaDeHoy(fechaISO: string): boolean {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return fechaISO === `${anio}-${mes}-${dia}`;
}

function limpiarHora(hora: string): string {
  return hora.slice(0, 5);
}

function FilaClase({ clase, onPresionar }: { clase: ClaseItem; onPresionar: () => void }) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.fila, pressed ? styles.filaPresionada : null]}
      accessibilityRole="button"
    >
      <View style={styles.filaContenido}>
        <View style={styles.filaHeader}>
          <View style={styles.filaFecha}>
            <Text style={styles.fecha}>{formatearFecha(clase.fecha)}</Text>
            {esFechaDeHoy(clase.fecha) ? (
              <View style={styles.badgeHoy}>
                <Text style={styles.badgeHoyTexto}>Hoy</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.horario}>
            {limpiarHora(clase.hora_inicio)} - {limpiarHora(clase.hora_fin)}
          </Text>
        </View>
        <Text style={styles.nombreGrupo}>{clase.nombre_grupo ?? 'Grupo'}</Text>
        {clase.objetivo ? (
          <Text style={styles.objetivo} numberOfLines={2}>
            {clase.objetivo}
          </Text>
        ) : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function ClasesScreen() {
  const { grupo_id: paramGrupoId } = useLocalSearchParams<{ grupo_id?: string }>();
  const { listarClases, listarGrupos } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(paramGrupoId ?? null);
  const [clases, setClases] = useState<ClaseItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    const [resultadoGrupos, resultadoClases] = await Promise.all([
      listarGrupos(),
      listarClases(grupoFiltro ?? undefined),
    ]);

    if (resultadoGrupos.data != null) {
      setGrupos(resultadoGrupos.data);
    }

    if (resultadoClases.error != null || resultadoClases.data == null) {
      setError(true);
      if (resultadoClases.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setClases(resultadoClases.data);
      setError(false);
    }
    setCargando(false);
  }, [grupoFiltro, listarClases, listarGrupos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargarDatos();
    }, [cargarDatos]),
  );

  const irANuevaClase = () => {
    if (grupoFiltro != null) {
      router.push(`/instructor/nueva-clase?grupo_id=${grupoFiltro}`);
    } else {
      router.push('/instructor/nueva-clase');
    }
  };

  const renderItem: ListRenderItem<ClaseItem> = ({ item }) => (
    <FilaClase
      clase={item}
      onPresionar={() => router.push(`/instructor/clase/${item.id}`)}
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={styles.barraAcciones}>
        <Text style={styles.subtitulo}>
          Sesiones de clase planificadas para toma de asistencia.
        </Text>
        <Pressable onPress={irANuevaClase} style={styles.botonNuevo} accessibilityRole="button">
          <Text style={styles.botonNuevoTexto}>+ Nueva clase</Text>
        </Pressable>
      </View>

      {grupos.length > 0 ? (
        <View style={styles.filtros}>
          <Pressable
            onPress={() => setGrupoFiltro(null)}
            style={[styles.chipFiltro, grupoFiltro == null ? styles.chipFiltroActivo : null]}
          >
            <Text style={[styles.chipTexto, grupoFiltro == null ? styles.chipTextoActivo : null]}>
              Todos
            </Text>
          </Pressable>
          {grupos.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => setGrupoFiltro(g.id)}
              style={[styles.chipFiltro, grupoFiltro === g.id ? styles.chipFiltroActivo : null]}
            >
              <Text style={[styles.chipTexto, grupoFiltro === g.id ? styles.chipTextoActivo : null]}>
                {g.nombre}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {cargando ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>Cargando clases…</Text>
        </View>
      ) : error ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar las clases.</Text>
          <Pressable onPress={() => void cargarDatos()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : clases.length === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>
            {grupoFiltro != null
              ? 'No hay clases registradas para este grupo.'
              : 'Todavía no registraste ninguna clase.'}
          </Text>
          <Pressable onPress={irANuevaClase} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Crear primera clase</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={clases}
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
  filaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  filaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeHoy: {
    backgroundColor: '#C62828',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeHoyTexto: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  fecha: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111',
  },
  horario: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
  },
  nombreGrupo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  objetivo: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
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
