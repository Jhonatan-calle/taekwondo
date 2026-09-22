import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import type { ItemDistribucion } from '@/lib/perfil';

// Paleta institucional para las categorías de la dona (rojo + tonos neutros/acento).
const PALETA = ['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#00838F'];

type Props = {
  items: ItemDistribucion[];
  etiquetaCentro: string;
};

function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

// Dona de una distribución (SRS §3.6) con leyenda de conteo y porcentaje.
export function GraficoDona({ items, etiquetaCentro }: Props) {
  const total = items.reduce((acumulado, item) => acumulado + item.total, 0);
  if (total <= 0) {
    return <Text style={styles.vacio}>Sin datos para graficar.</Text>;
  }

  const datos = items.map((item, indice) => ({
    value: item.total,
    color: PALETA[indice % PALETA.length],
  }));

  const resumen = items
    .filter((item) => item.total > 0)
    .map((item) => `${item.etiqueta}: ${item.total}`)
    .join(', ');

  return (
    <View style={styles.contenedor} accessible accessibilityLabel={`Distribución ${etiquetaCentro}. ${resumen}`}>
      <PieChart
        data={datos}
        donut
        radius={78}
        innerRadius={50}
        innerCircleColor="#fff"
        strokeColor="#fff"
        strokeWidth={2}
        centerLabelComponent={() => (
          <View style={styles.centro}>
            <Text style={styles.centroValor}>{total}</Text>
            <Text style={styles.centroEtiqueta}>{etiquetaCentro}</Text>
          </View>
        )}
      />
      <View style={styles.leyenda}>
        {items.map((item, indice) => (
          <View key={item.clave} style={styles.filaLeyenda}>
            <View style={[styles.punto, { backgroundColor: PALETA[indice % PALETA.length] }]} />
            <Text style={styles.etiqueta} numberOfLines={1}>
              {item.etiqueta}
            </Text>
            <Text style={styles.valor}>
              {item.total} · {porcentaje(item.total, total)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroValor: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111',
  },
  centroEtiqueta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  leyenda: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  filaLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  etiqueta: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  valor: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginLeft: 8,
  },
  vacio: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
