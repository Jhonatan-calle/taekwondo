import { useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatearFechaLegible } from '@/lib/perfil'

type CampoFechaProps = {
  label: string
  value: Date | null
  onChange: (fecha: Date) => void
  error?: string | null
  /** Fecha mínima seleccionable (inclusive). */
  minimo?: Date
  /** Fecha máxima seleccionable (inclusive). */
  maximo?: Date
  placeholder?: string
}

/** Selector de fecha con el picker nativo (reemplaza al input de texto libre). */
export function CampoFecha({
  label,
  value,
  onChange,
  error,
  minimo,
  maximo,
  placeholder = 'Seleccionar fecha',
}: CampoFechaProps) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setMostrar(true)}
        style={[styles.entrada, error ? styles.entradaError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={value == null ? styles.placeholder : styles.valor}>
          {value != null ? formatearFechaLegible(value) : placeholder}
        </Text>
      </Pressable>
      {mostrar ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimo}
          maximumDate={maximo}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={(_evento, fecha) => {
            // En Android/iOS el picker es un overlay: al elegir se cierra (en iOS inline se mantiene).
            if (Platform.OS !== 'ios') setMostrar(false)
            if (fecha != null) onChange(fecha)
          }}
          onDismiss={() => setMostrar(false)}
        />
      ) : null}
      {error ? <Text style={styles.errorTexto}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  entrada: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  entradaError: {
    borderColor: '#C62828',
  },
  valor: {
    fontSize: 16,
    color: '#111',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
})
