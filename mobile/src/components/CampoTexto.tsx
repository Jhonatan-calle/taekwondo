import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { IconoOjo } from '@/components/IconoOjo'

type CampoTextoProps = {
  label: string
  error?: string | null
  /** Habilita el botón de mostrar/ocultar (solo para campos de contraseña). */
  esContrasena?: boolean
} & Omit<TextInputProps, 'style'>

export function CampoTexto({ label, error, esContrasena = false, ...rest }: CampoTextoProps) {
  // La contraseña arranca oculta; el toggle es local a cada campo.
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.filaEntrada}>
        <TextInput
          style={[
            styles.entrada,
            esContrasena ? styles.entradaConToggle : null,
            error ? styles.entradaError : null,
          ]}
          placeholderTextColor="#999"
          secureTextEntry={esContrasena ? !visible : rest.secureTextEntry}
          {...rest}
        />
        {esContrasena ? (
          <Pressable
            onPress={() => setVisible((actual) => !actual)}
            style={styles.botonOjo}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityState={{ selected: visible }}
          >
            <IconoOjo visible={visible} color={error ? '#C62828' : '#666'} />
          </Pressable>
        ) : null}
      </View>
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
  filaEntrada: {
    position: 'relative',
    justifyContent: 'center',
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
  entradaConToggle: {
    paddingRight: 44,
  },
  entradaError: {
    borderColor: '#C62828',
  },
  botonOjo: {
    position: 'absolute',
    right: 12,
    padding: 2,
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
})
