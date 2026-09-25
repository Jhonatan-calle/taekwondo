import { Image, StyleSheet, View } from 'react-native';

/**
 * Pantalla de arranque propia: muestra el póster del cliente a pantalla completa mientras
 * se resuelve la sesión/perfil.
 *
 * El splash **nativo** de Android 12+ sólo puede mostrar el ícono recortado en un círculo
 * (chico y sin el póster). Por eso se oculta apenas monta el JS y el arte completo se
 * muestra acá, con el tamaño y la forma originales.
 */
export function PantallaArranque() {
  return (
    <View style={styles.pantalla} accessibilityLabel="Cargando">
      <Image
        source={require('../../assets/splash-poster.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fondo oscuro alineado con la textura del póster (evita franjas claras si la imagen no
  // cubre del todo por relación de aspecto).
  pantalla: {
    flex: 1,
    backgroundColor: '#141414',
  },
});
