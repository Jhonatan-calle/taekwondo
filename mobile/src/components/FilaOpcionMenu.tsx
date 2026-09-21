import { Pressable, StyleSheet, Text, View } from 'react-native'

type FilaOpcionMenuProps = {
  titulo: string
  descripcion?: string
}

export function FilaOpcionMenu({ titulo, descripcion }: FilaOpcionMenuProps) {
  return (
    <Pressable disabled style={styles.fila} accessibilityRole="button">
      <View style={styles.contenido}>
        <Text style={styles.titulo}>{titulo}</Text>
        {descripcion ? <Text style={styles.descripcion}>{descripcion}</Text> : null}
      </View>
      <Text style={styles.etiqueta}>Próximamente</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    opacity: 0.75,
  },
  contenido: {
    flex: 1,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  descripcion: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  etiqueta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginLeft: 8,
  },
})