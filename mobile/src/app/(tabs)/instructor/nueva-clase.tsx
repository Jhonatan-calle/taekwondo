import { useCallback, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  ELEMENTOS_CLASE,
  MAX_ELEMENTOS_CLASE,
  etiquetaElemento,
  etiquetaElementoCorta,
  type ElementoClase,
} from '@/constants/elementosClase';
import {
  aIsoLocal,
  esHoraValida,
  horaFinPosterior,
  type Grupo,
} from '@/lib/perfil';

type ErroresFormulario = Partial<
  Record<'grupo' | 'fecha' | 'horaInicio' | 'horaFin' | 'objetivo', string>
>;

function formatearFechaLegible(fecha: Date): string {
  const [anio, mes, dia] = aIsoLocal(fecha).split('-');
  return `${dia}/${mes}/${anio}`;
}

export default function NuevaClaseScreen() {
  const { grupo_id: paramGrupoId } = useLocalSearchParams<{ grupo_id?: string }>();
  const { listarGrupos, crearClase } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoId, setGrupoId] = useState<string | null>(paramGrupoId ?? null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [horaInicio, setHoraInicio] = useState('18:00');
  const [horaFin, setHoraFin] = useState('19:30');
  const [elementosObjetivo, setElementosObjetivo] = useState<ElementoClase[]>([]);
  const [objetivoDetalle, setObjetivoDetalle] = useState('');
  const [modalObjetivos, setModalObjetivos] = useState(false);

  const [cargandoGrupos, setCargandoGrupos] = useState(true);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarGrupos = useCallback(async () => {
    setCargandoGrupos(true);
    const { data, error: errorConsulta } = await listarGrupos();
    if (errorConsulta != null || data == null) {
      if (errorConsulta === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setGrupos(data);
      setGrupoId((actual) => {
        if (actual != null && data.some((g) => g.id === actual)) return actual;
        return data.length > 0 ? data[0].id : null;
      });
    }
    setCargandoGrupos(false);
  }, [listarGrupos, reportarError]);

  useFocusEffect(
    useCallback(() => {
      void cargarGrupos();
    }, [cargarGrupos]),
  );

  const alCambiarFecha = (_evento: DateTimePickerEvent, fecha?: Date) => {
    if (Platform.OS !== 'ios') setMostrarSelectorFecha(false);
    if (fecha != null) setFechaSeleccionada(fecha);
  };

  const alternarElemento = (elemento: ElementoClase) => {
    if (elementosObjetivo.includes(elemento)) {
      setElementosObjetivo(elementosObjetivo.filter((e) => e !== elemento));
      return;
    }
    if (elementosObjetivo.length >= MAX_ELEMENTOS_CLASE) {
      Alert.alert('Máximo 2 objetivos', 'Podés elegir hasta 2 objetivos.');
      return;
    }
    setElementosObjetivo([...elementosObjetivo, elemento]);
  };

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (grupoId == null) e.grupo = 'Seleccioná un grupo para la clase.';
    if (!esHoraValida(horaInicio)) e.horaInicio = 'Ingresá un horario válido (ej. 18:00).';
    if (!esHoraValida(horaFin)) e.horaFin = 'Ingresá un horario válido (ej. 19:30).';
    if (esHoraValida(horaInicio) && esHoraValida(horaFin) && !horaFinPosterior(horaInicio, horaFin)) {
      e.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.';
    }
    if (elementosObjetivo.length === 0) {
      e.objetivo = 'Seleccioná al menos un objetivo (máximo 2).';
    }
    return e;
  };

  const alEnviar = async () => {
    if (enviando) return;
    const e = validar();
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0 || grupoId == null) return;

    setEnviando(true);
    try {
      const resultado = await crearClase({
        grupo_id: grupoId,
        fecha: aIsoLocal(fechaSeleccionada),
        hora_inicio: horaInicio.trim(),
        hora_fin: horaFin.trim(),
        elementos_objetivo: elementosObjetivo,
        objetivo_detalle: objetivoDetalle.trim() === '' ? null : objetivoDetalle.trim(),
      });

      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }

      if (resultado.nuevoId) {
        router.replace(`/instructor/clase/${resultado.nuevoId}`);
      } else {
        router.back();
      }
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitulo}>
          Planificá la sesión de entrenamiento vinculada a un grupo y fecha. El objetivo se elige entre los
          elementos del ciclo ITF (1 o 2).
        </Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        {/* Selector de Grupo */}
        <Text style={styles.etiqueta}>Grupo *</Text>
        {cargandoGrupos ? (
          <Text style={styles.ayuda}>Cargando grupos…</Text>
        ) : grupos.length === 0 ? (
          <View style={styles.sinGrupos}>
            <Text style={styles.sinGruposTexto}>No tenés grupos creados todavía.</Text>
            <Pressable onPress={() => router.push('/instructor/nuevo-grupo')} style={styles.botonCrearGrupo}>
              <Text style={styles.botonCrearGrupoTexto}>Crear grupo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.chipsContenedor}>
            {grupos.map((g) => {
              const seleccionado = grupoId === g.id;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGrupoId(g.id)}
                  style={[styles.chip, seleccionado ? styles.chipSeleccionado : null]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipTexto, seleccionado ? styles.chipTextoSeleccionado : null]}>
                    {g.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {errores.grupo ? <Text style={styles.errorCampo}>{errores.grupo}</Text> : null}

        {/* Selector de Fecha */}
        <Text style={styles.etiqueta}>Fecha de la clase *</Text>
        <Pressable
          onPress={() => setMostrarSelectorFecha(true)}
          style={styles.campoFecha}
          accessibilityRole="button"
        >
          <Text style={styles.campoFechaTexto}>{formatearFechaLegible(fechaSeleccionada)}</Text>
          <Text style={styles.iconoCalendario}>📅</Text>
        </Pressable>
        {mostrarSelectorFecha ? (
          <DateTimePicker
            value={fechaSeleccionada}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={alCambiarFecha}
          />
        ) : null}

        {/* Horarios */}
        <View style={styles.filaHoras}>
          <View style={styles.columnaHora}>
            <CampoTexto
              label="Hora inicio (HH:mm) *"
              value={horaInicio}
              onChangeText={setHoraInicio}
              placeholder="18:00"
              error={errores.horaInicio}
            />
          </View>
          <View style={styles.columnaHora}>
            <CampoTexto
              label="Hora fin (HH:mm) *"
              value={horaFin}
              onChangeText={setHoraFin}
              placeholder="19:30"
              error={errores.horaFin}
            />
          </View>
        </View>

        {/* Objetivo por elementos del ciclo ITF */}
        <Text style={styles.etiqueta}>Objetivo de la clase *</Text>
        <Pressable
          onPress={() => setModalObjetivos(true)}
          style={styles.selectorObjetivo}
          accessibilityRole="button"
        >
          <Text
            style={elementosObjetivo.length === 0 ? styles.selectorPlaceholder : styles.selectorValor}
          >
            {elementosObjetivo.length === 0
              ? 'Elegir objetivos'
              : elementosObjetivo.map((e) => etiquetaElementoCorta(e)).join(' · ')}
          </Text>
          <Text style={styles.selectorIcono}>▾</Text>
        </Pressable>
        {errores.objetivo ? <Text style={styles.errorCampo}>{errores.objetivo}</Text> : null}

        <CampoTexto
          label="Detalles (opcional)"
          value={objetivoDetalle}
          onChangeText={setObjetivoDetalle}
          placeholder="Ej. corrección de posturas L, combinaciones, etc."
          multiline
          numberOfLines={6}
          style={styles.campoDetalles}
        />

        <Pressable
          onPress={() => void alEnviar()}
          disabled={enviando || grupos.length === 0}
          style={[styles.boton, enviando || grupos.length === 0 ? styles.botonDeshabilitado : null]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Crear clase'}</Text>
        </Pressable>
      </ScrollView>

      {/* Modal de selección de objetivos */}
      <Modal
        visible={modalObjetivos}
        transparent
        animationType="slide"
        onRequestClose={() => setModalObjetivos(false)}
      >
        <Pressable style={styles.modalFondo} onPress={() => setModalObjetivos(false)}>
          <Pressable style={styles.modalTarjeta} onPress={() => {}}>
            <Text style={styles.modalTitulo}>Objetivos de la clase</Text>
            <Text style={styles.modalAyuda}>Elegí 1 o 2 elementos del ciclo ITF.</Text>
            {ELEMENTOS_CLASE.map((elemento) => {
              const activo = elementosObjetivo.includes(elemento);
              return (
                <Pressable
                  key={elemento}
                  onPress={() => alternarElemento(elemento)}
                  style={[styles.opcion, activo ? styles.opcionActiva : null]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: activo }}
                >
                  <Text style={[styles.opcionTexto, activo ? styles.opcionTextoActivo : null]}>
                    {activo ? '✓  ' : ''}
                    {etiquetaElemento(elemento)}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => setModalObjetivos(false)} style={styles.modalBoton}>
              <Text style={styles.modalBotonTexto}>Listo</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contenido: {
    padding: 24,
    paddingBottom: 48,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#fdf0f0',
    color: '#C62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ayuda: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },
  chipsContenedor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
  },
  chipSeleccionado: {
    borderColor: '#C62828',
    backgroundColor: '#fdf0f0',
  },
  chipTexto: {
    fontSize: 14,
    color: '#333',
  },
  chipTextoSeleccionado: {
    color: '#C62828',
    fontWeight: '600',
  },
  sinGrupos: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sinGruposTexto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  botonCrearGrupo: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#C62828',
    borderRadius: 6,
  },
  botonCrearGrupoTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  campoFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  campoFechaTexto: {
    fontSize: 15,
    color: '#111',
  },
  iconoCalendario: {
    fontSize: 16,
  },
  selectorObjetivo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  selectorValor: {
    fontSize: 15,
    color: '#111',
    flex: 1,
  },
  selectorIcono: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  campoDetalles: {
    minHeight: 128,
    textAlignVertical: 'top',
  },
  filaHoras: {
    flexDirection: 'row',
    gap: 12,
  },
  columnaHora: {
    flex: 1,
  },
  errorCampo: {
    color: '#C62828',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  boton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalTarjeta: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalAyuda: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  opcion: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  opcionActiva: {
    borderColor: '#C62828',
    backgroundColor: '#fdf0f0',
  },
  opcionTexto: {
    fontSize: 14,
    color: '#333',
  },
  opcionTextoActivo: {
    color: '#C62828',
    fontWeight: '600',
  },
  modalBoton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBotonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
