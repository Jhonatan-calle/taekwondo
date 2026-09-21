import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores'

type BannerErrorProps = {
  mensaje: string | null
  onCerrar(): void
}

export function BannerError({ mensaje, onCerrar }: BannerErrorProps) {
  const insets = useSafeAreaInsets()

  if (mensaje == null) return null

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.texto}>{mensaje ?? MENSAJE_ERROR_GENERICO}</Text>
      <Pressable
        onPress={onCerrar}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
      >
        <Text style={styles.cerrar}>✕</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#C62828',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  texto: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  cerrar: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
})