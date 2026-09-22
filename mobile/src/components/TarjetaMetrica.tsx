import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  valor: string;
  etiqueta: string;
  detalle?: string;
  tono?: 'neutro' | 'alerta' | 'ok';
  onPresionar?: () => void;
};

// Tarjeta de métrica del panel de Inicio. Si recibe `onPresionar`, es
// navegable (lleva al listado correspondiente).
export function TarjetaMetrica({ valor, etiqueta, detalle, tono = 'neutro', onPresionar }: Props) {
  const contenido = (
    <View style={[styles.tarjeta, tono === 'alerta' ? styles.tarjetaAlerta : null]}>
      <Text style={[styles.valor, tono === 'alerta' ? styles.valorAlerta : null]}>{valor}</Text>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      {detalle != null ? <Text style={styles.detalle}>{detalle}</Text> : null}
    </View>
  );

  if (onPresionar == null) return contenido;

  return (
    <Pressable
      onPress={onPresionar}
      style={({ pressed }) => [styles.contenedor, pressed ? styles.presionada : null]}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}: ${valor}`}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: '48%',
    marginBottom: 12,
  },
  presionada: {
    opacity: 0.7,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 92,
    justifyContent: 'center',
  },
  tarjetaAlerta: {
    borderColor: '#f5c6cb',
    backgroundColor: '#fdf0f0',
  },
  valor: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  valorAlerta: {
    color: '#C62828',
  },
  etiqueta: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  detalle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
});
