import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function HomeScreen() {
  const { sesion, cerrarSesion } = useAuthGlobal();
  const email = sesion?.user?.email;

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Taekwondo ITF</Text>
      <Text style={styles.subtitulo}>Sesión iniciada como</Text>
      <Text style={styles.correo}>{email ?? 'usuario'}</Text>
      <Pressable
        onPress={cerrarSesion}
        style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
        accessibilityRole="button"
      >
        <Text style={styles.botonTexto}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitulo: {
    fontSize: 16,
    marginTop: 8,
    color: '#666',
  },
  correo: {
    fontSize: 16,
    marginTop: 2,
    color: '#333',
    fontWeight: '600',
  },
  boton: {
    marginTop: 32,
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  botonPresionado: {
    backgroundColor: '#a02020',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});