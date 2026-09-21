import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilaOpcionMenu } from '@/components/FilaOpcionMenu';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function InstructorScreen() {
  const { esInstructor } = useAuthGlobal();

  if (!esInstructor) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Instructor</Text>
      <Text style={styles.subtitulo}>Gestión de tus alumnos directos. Está disponible en próximas versiones.</Text>

      <View style={styles.menu}>
        <FilaOpcionMenu titulo="Mis alumnos" descripcion="Lista y detalle de tus alumnos directos" />
        <FilaOpcionMenu titulo="Alta de alumno" descripcion="Crear la ficha de un alumno nuevo" />
        <FilaOpcionMenu titulo="Grupos y horarios" descripcion="Crear grupos y asignar tus alumnos" />
        <FilaOpcionMenu titulo="Toma de asistencia" descripcion="Crear clases y registrar presentes" />
        <FilaOpcionMenu titulo="Cuotas de alumnos" descripcion="Registrar los pagos mensuales" />
        <FilaOpcionMenu titulo="Locaciones" descripcion="Administrar los centros de entrenamiento" />
        <FilaOpcionMenu titulo="Registro de alquileres" descripcion="Registrar los pagos de alquiler" />
        <FilaOpcionMenu titulo="Postulación a examen" descripcion="Postular a tus alumnos a las mesas abiertas" />
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
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  menu: {
    marginTop: 4,
  },
});