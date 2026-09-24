import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { formatearPeriodo } from '@/lib/perfil'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const ANIO_ACTUAL = new Date().getFullYear()

/** Divide 'AAAA-MM' en año/mes; si no es válido, cae al mes actual. */
function partirPeriodo(periodo: string): { anio: number; mes: number } {
  const hoy = new Date()
  const [anioTexto, mesTexto] = periodo.split('-')
  const anio = Number(anioTexto)
  const mes = Number(mesTexto)
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 }
  }
  return { anio, mes }
}

type CampoPeriodoProps = {
  label: string
  /** Periodo mensual en formato 'AAAA-MM'. */
  value: string
  onChange: (periodo: string) => void
  error?: string | null
  /** Año mínimo seleccionable (por defecto, 5 años atrás). */
  minAnio?: number
  /** Año máximo seleccionable (por defecto, 5 años adelante). */
  maxAnio?: number
}

/** Selector de mes (el picker nativo no tiene modo solo-mes). */
export function CampoPeriodo({
  label,
  value,
  onChange,
  error,
  minAnio = ANIO_ACTUAL - 5,
  maxAnio = ANIO_ACTUAL + 5,
}: CampoPeriodoProps) {
  const [mostrar, setMostrar] = useState(false)
  const [anioVisible, setAnioVisible] = useState(ANIO_ACTUAL)
  const seleccion = partirPeriodo(value)

  const abrir = () => {
    setAnioVisible(seleccion.anio)
    setMostrar(true)
  }

  const elegirMes = (mes: number) => {
    onChange(`${anioVisible}-${String(mes).padStart(2, '0')}`)
    setMostrar(false)
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={abrir}
        style={[styles.entrada, error ? styles.entradaError : null]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.valor}>{formatearPeriodo(value)}</Text>
      </Pressable>
      {error ? <Text style={styles.errorTexto}>{error}</Text> : null}

      <Modal visible={mostrar} transparent animationType="fade" onRequestClose={() => setMostrar(false)}>
        <View style={styles.fondo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMostrar(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de mes"
          />
          <View style={styles.tarjeta} onStartShouldSetResponder={() => true}>
            <View style={styles.cabecera}>
              <Pressable
                onPress={() => setAnioVisible((actual) => actual - 1)}
                disabled={anioVisible <= minAnio}
                style={[styles.flecha, anioVisible <= minAnio ? styles.flechaDeshabilitada : null]}
                accessibilityRole="button"
                accessibilityLabel="Año anterior"
              >
                <Text style={styles.flechaTexto}>‹</Text>
              </Pressable>
              <Text style={styles.anio}>{anioVisible}</Text>
              <Pressable
                onPress={() => setAnioVisible((actual) => actual + 1)}
                disabled={anioVisible >= maxAnio}
                style={[styles.flecha, anioVisible >= maxAnio ? styles.flechaDeshabilitada : null]}
                accessibilityRole="button"
                accessibilityLabel="Año siguiente"
              >
                <Text style={styles.flechaTexto}>›</Text>
              </Pressable>
            </View>

            <View style={styles.grilla}>
              {MESES.map((nombre, indice) => {
                const mes = indice + 1
                const seleccionado = anioVisible === seleccion.anio && mes === seleccion.mes
                return (
                  <Pressable
                    key={nombre}
                    onPress={() => elegirMes(mes)}
                    style={[styles.mes, seleccionado ? styles.mesSeleccionado : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionado }}
                  >
                    <Text style={[styles.mesTexto, seleccionado ? styles.mesTextoSeleccionado : null]}>
                      {nombre}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable onPress={() => setMostrar(false)} style={styles.botonCerrar} accessibilityRole="button">
              <Text style={styles.botonCerrarTexto}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginTop: 4,
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  anio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
  },
  flecha: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  flechaDeshabilitada: {
    opacity: 0.3,
  },
  flechaTexto: {
    fontSize: 24,
    color: '#C62828',
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mes: {
    width: '31%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  mesSeleccionado: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  mesTexto: {
    fontSize: 13,
    color: '#555',
  },
  mesTextoSeleccionado: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  botonCerrar: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C62828',
  },
  botonCerrarTexto: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
})
