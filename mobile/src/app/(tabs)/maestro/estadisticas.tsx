import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { TarjetaMetrica } from '@/components/TarjetaMetrica';
import { GraficoDona } from '@/components/GraficoDona';
import { GraficoBarras } from '@/components/GraficoBarras';
import type { InstructorLinaje, MetricasDashboard, VistaMetricas } from '@/lib/perfil';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      <View style={styles.tarjeta}>{children}</View>
    </View>
  );
}

export default function EstadisticasScreen() {
  const { obtenerMetricasDashboard, listarInstructoresSubordinados } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [instructores, setInstructores] = useState<InstructorLinaje[]>([]);
  const [instructorFiltro, setInstructorFiltro] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const vista: VistaMetricas = instructorFiltro == null ? 'consolidada' : 'especifica';
    const [resultadoMetricas, resultadoInstructores] = await Promise.all([
      obtenerMetricasDashboard(vista, instructorFiltro ?? undefined),
      listarInstructoresSubordinados(),
    ]);

    if (resultadoMetricas.error != null || resultadoMetricas.data == null) {
      setError(true);
      setMetricas(null);
      if (resultadoMetricas.error === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setMetricas(resultadoMetricas.data);
      setError(false);
    }

    if (resultadoInstructores.data != null) setInstructores(resultadoInstructores.data);
    setCargando(false);
  }, [instructorFiltro, obtenerMetricasDashboard, listarInstructoresSubordinados, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.subtitulo}>
        Distribución anonimizada de tu rama descendente: género, rango de edad y grado. Solo se
        muestran conteos, nunca datos personales.
      </Text>

      {instructores.length > 0 ? (
        <View style={styles.filtros}>
          <Pressable
            onPress={() => setInstructorFiltro(null)}
            style={[styles.chipFiltro, instructorFiltro == null ? styles.chipFiltroActivo : null]}
            accessibilityRole="button"
            accessibilityLabel="Vista consolidada de toda mi rama"
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
              accessibilityRole="button"
              accessibilityLabel={`Vista específica de ${instructor.nombre_completo}`}
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
          <Text style={styles.aviso}>Cargando estadísticas…</Text>
        </View>
      ) : error || metricas == null ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>No pudimos cargar las estadísticas.</Text>
          <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </Pressable>
        </View>
      ) : metricas.total === 0 ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>
            {instructorFiltro != null
              ? 'Este instructor no tiene descendientes.'
              : 'No hay integrantes en tu rama descendente.'}
          </Text>
        </View>
      ) : (
        <View>
          <View style={styles.resumen}>
            <TarjetaMetrica valor={String(metricas.total)} etiqueta="Integrantes en la vista" />
            <TarjetaMetrica valor={String(metricas.por_grado.length)} etiqueta="Grados representados" />
          </View>

          <Seccion titulo="Género">
            <GraficoDona items={metricas.por_genero} etiquetaCentro="integrantes" />
          </Seccion>

          <Seccion titulo="Rango de edad">
            <GraficoBarras items={metricas.por_rango_edad} etiqueta="rango de edad" />
          </Seccion>

          <Seccion titulo="Grado">
            <GraficoBarras items={metricas.por_grado} etiqueta="grado" />
          </Seccion>
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
    padding: 20,
    paddingBottom: 48,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  seccion: {
    marginTop: 16,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    padding: 16,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
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
