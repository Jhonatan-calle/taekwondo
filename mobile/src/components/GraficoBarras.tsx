import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import type { ItemDistribucion } from '@/lib/perfil';

type Props = {
  items: ItemDistribucion[];
  /** Barras horizontales (etiquetas legibles a la izquierda). Por defecto true. */
  horizontal?: boolean;
  etiqueta: string;
};

// Barras de una distribución (SRS §3.6): conteo por categoría.
export function GraficoBarras({ items, horizontal = true, etiqueta }: Props) {
  const { width } = useWindowDimensions();
  const total = items.reduce((acumulado, item) => acumulado + item.total, 0);
  if (total <= 0 || items.length === 0) {
    return <Text style={styles.vacio}>Sin datos para graficar.</Text>;
  }

  const maximo = Math.max(...items.map((item) => item.total), 1);
  const datos = items.map((item) => ({
    value: item.total,
    label: item.etiqueta,
    frontColor: '#C62828',
    barBorderRadius: 4,
  }));

  const resumen = items.map((item) => `${item.etiqueta}: ${item.total}`).join(', ');

  return (
    <View accessible accessibilityLabel={`Distribución ${etiqueta}. ${resumen}`}>
      <BarChart
        data={datos}
        horizontal={horizontal}
        height={horizontal ? Math.max(items.length * 36, 120) : 200}
        width={horizontal ? Math.max(240, width - 112) : undefined}
        barWidth={horizontal ? 16 : 22}
        spacing={horizontal ? 14 : 20}
        yAxisLabelWidth={horizontal ? 104 : 40}
        noOfSections={4}
        maxValue={maximo}
        showValuesAsTopLabel
        barBorderRadius={4}
        frontColor="#C62828"
        rotateLabel={!horizontal}
        isAnimated
      />
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
