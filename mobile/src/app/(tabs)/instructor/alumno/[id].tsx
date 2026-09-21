import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { etiquetaGrado } from '@/constants/grados';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { calcularEdad, type AlumnoDetalle, type Genero } from '@/lib/perfil';

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
  const { obtenerAlumnoDetalle } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [alumno, setAlumno] = useState<AlumnoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (id == null) {
      setError(true);
      setCargando(false);
      return;
    }
    setCargando(true);
    const { data, error: errorConsulta } = await obtenerAlumnoDetalle(id);
    if (errorConsulta != null || data == null) {
      setError(true);
      if (errorConsulta === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setAlumno(data);
      setError(false);
    }
    setCargando(false);
  }, [id, obtenerAlumnoDetalle, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

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
});