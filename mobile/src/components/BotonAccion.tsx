import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  titulo: string;
  onPresionar: () => void;
};

// Acción rápida del panel de Inicio: botón compacto a una tarea frecuente.
export function BotonAccion({ titulo, onPresionar }: Props) {
  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.boton, pressed ? styles.presionado : null]}
      accessibilityRole="button"
      accessibilityLabel={titulo}
    >
      <Text style={styles.texto}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  presionado: {
    backgroundColor: '#fdf0f0',
  },
  texto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
