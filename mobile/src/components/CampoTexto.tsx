import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'

type CampoTextoProps = {
  label: string
  error?: string | null
} & Omit<TextInputProps, 'style'>

export function CampoTexto({ label, error, ...rest }: CampoTextoProps) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.entrada, error ? styles.entradaError : null]}
        placeholderTextColor="#999"
        {...rest}
      />
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
    fontSize: 16,
    color: '#111',
  },
  entradaError: {
    borderColor: '#C62828',
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
})