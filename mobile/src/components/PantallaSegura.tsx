import type { ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type PantallaSeguraProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * Contenedor que respeta el borde **superior** (notch / barra de estado) para
 * pantallas SIN header nativo. Con edge-to-edge (Android) el contenido se dibuja
 * debajo de la barra de estado, así que estas pantallas necesitan el inset de arriba.
 */
export function PantallaSegura({ children, style }: PantallaSeguraProps) {
  return (
    <SafeAreaView edges={['top']} style={[styles.base, style]}>
      {children}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    backgroundColor: '#fff',
  },
})
