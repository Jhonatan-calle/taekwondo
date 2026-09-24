import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { etiquetaElemento } from '@/constants/elementosClase';
import type { ClaseItem } from '@/lib/perfil';

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
}

function limpiarHora(hora: string): string {
  return hora.slice(0, 5);
}

export default function ClaseDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { obtenerClaseDetalle } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [clase, setClase] = useState<ClaseItem | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const { data, error: err } = await obtenerClaseDetalle(id);
    if (err != null || data == null) {
      setError(true);
      if (err === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setClase(data);
      setError(false);
    }
    setCargando(false);
  }, [id, obtenerClaseDetalle, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando datos de la clase…</Text>
      </View>
    );
  }

  if (error || clase == null) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No pudimos cargar la clase solicitada.</Text>
        <Pressable onPress={() => void cargar()} style={styles.reintentar} accessibilityRole="button">
          <Text style={styles.reintentarTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <View style={styles.cabecera}>
        <Text style={styles.nombreGrupo}>{clase.nombre_grupo ?? 'Grupo'}</Text>
        <Text style={styles.datosPrincipales}>
          {formatearFecha(clase.fecha)} · {limpiarHora(clase.hora_inicio)} a {limpiarHora(clase.hora_fin)} hs
        </Text>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.tarjetaTitulo}>Objetivo de la clase</Text>
        <Text style={styles.tarjetaContenido}>
          {clase.elementos_objetivo.length > 0
            ? clase.elementos_objetivo.map((e) => etiquetaElemento(e)).join(' · ')
            : 'Sin especificar'}
        </Text>
      </View>

      {clase.objetivo_detalle ? (
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaTitulo}>Detalles</Text>
          <Text style={styles.tarjetaContenido}>{clase.objetivo_detalle}</Text>
        </View>
      ) : null}

      <View style={styles.acciones}>
        <Pressable
          onPress={() => router.push(`/instructor/clase/${clase.id}/asistencia`)}
          style={styles.botonPrimario}
          accessibilityRole="button"
        >
          <Text style={styles.botonPrimarioTexto}>Tomar asistencia</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/instructor/grupo/${clase.grupo_id}`)}
          style={styles.botonSecundario}
          accessibilityRole="button"
        >
          <Text style={styles.botonSecundarioTexto}>Ver grupo</Text>
        </Pressable>
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
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nombreGrupo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  datosPrincipales: {
    fontSize: 15,
    color: '#C62828',
    fontWeight: '600',
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
  tarjetaContenido: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
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
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  botonSecundarioTexto: {
    color: '#444',
    fontSize: 15,
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
