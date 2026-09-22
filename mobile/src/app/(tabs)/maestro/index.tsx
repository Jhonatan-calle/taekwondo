import { Redirect, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilaOpcionMenu } from '@/components/FilaOpcionMenu';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function MaestroScreen() {
  const { esMaestro } = useAuthGlobal();
  const router = useRouter();

  if (!esMaestro) {
    return <Redirect href="/" />;
  }

  return (
    <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>Maestro</Text>
      <Text style={styles.subtitulo}>Poder de gestión sobre tu rama. Está disponible en próximas versiones.</Text>

      <View style={styles.menu}>
        <FilaOpcionMenu
          titulo="Mesas de examen"
          descripcion="Planificar y abrir mesas de graduación"
          habilitada
          onPresionar={() => router.push('/maestro/mesas')}
        />
        <FilaOpcionMenu
          titulo="Planilla técnica de evaluación"
          descripcion="Evaluar a los alumnos postulados"
          habilitada
          onPresionar={() => router.push('/maestro/mesas')}
        />
        <FilaOpcionMenu
          titulo="Auditoría de locaciones en cascada"
          descripcion="Locaciones y alquileres de tus subordinados"
          habilitada
          onPresionar={() => router.push('/maestro/auditoria')}
        />
        <FilaOpcionMenu
          titulo="Estadísticas anonimizadas"
          descripcion="Métricas por género, edad y grado"
          habilitada
          onPresionar={() => router.push('/maestro/estadisticas')}
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