import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilaOpcionMenu } from '@/components/FilaOpcionMenu';

export default function InstructorScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Instructor</Text>
      <Text style={styles.subtitulo}>
        Gestión de tus alumnos directos. El resto de las opciones estará disponible en próximas versiones.
      </Text>

      <View style={styles.menu}>
        <FilaOpcionMenu
          titulo="Mis alumnos"
          descripcion="Lista y detalle de tus alumnos directos"
          habilitada
          onPresionar={() => router.push('/instructor/alumnos')}
        />
        <FilaOpcionMenu
          titulo="Alta de alumno"
          descripcion="Crear la ficha de un alumno nuevo"
          habilitada
          onPresionar={() => router.push('/instructor/alta-alumno')}
        />
        <FilaOpcionMenu
          titulo="Grupos y horarios"
          descripcion="Crear grupos y asignar tus alumnos"
          habilitada
          onPresionar={() => router.push('/instructor/grupos')}
        />
        <FilaOpcionMenu
          titulo="Toma de asistencia"
          descripcion="Registrar presentes y ausentes"
          habilitada
          onPresionar={() => router.push('/instructor/clases')}
        />
        <FilaOpcionMenu
          titulo="Objetivos de clase"
          descripcion="Distribución de la práctica por elemento ITF"
          habilitada
          onPresionar={() => router.push('/instructor/objetivos')}
        />
        <FilaOpcionMenu
          titulo="Cuotas de alumnos"
          descripcion="Registrar los pagos mensuales"
          habilitada
          onPresionar={() => router.push('/instructor/cuotas')}
        />
        <FilaOpcionMenu
          titulo="Locaciones"
          descripcion="Administrar los centros de entrenamiento"
          habilitada
          onPresionar={() => router.push('/instructor/locaciones')}
        />
        <FilaOpcionMenu titulo="Registro de alquileres" descripcion="Registrar los pagos de alquiler" />
        <FilaOpcionMenu
          titulo="Postulación a examen"
          descripcion="Postular a tus alumnos a las mesas abiertas"
          habilitada
          onPresionar={() => router.push('/instructor/mesas')}
        />
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