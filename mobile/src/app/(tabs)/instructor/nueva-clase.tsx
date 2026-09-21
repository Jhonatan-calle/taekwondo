import { useCallback, useState } from 'react';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import {
  aIsoLocal,
  esHoraValida,
  esTextoRequerido,
  horaFinPosterior,
  type Grupo,
} from '@/lib/perfil';

type ErroresFormulario = Partial<
  Record<'grupo' | 'fecha' | 'horaInicio' | 'horaFin' | 'objetivo' | 'contenidoTuls' | 'preparacionFisica', string>
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
  const [objetivo, setObjetivo] = useState('');
  const [contenidoTuls, setContenidoTuls] = useState('');
  const [preparacionFisica, setPreparacionFisica] = useState('');

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

  const validar = (): ErroresFormulario => {
    const e: ErroresFormulario = {};
    if (grupoId == null) e.grupo = 'Seleccioná un grupo para la clase.';
    if (!esHoraValida(horaInicio)) e.horaInicio = 'Ingresá un horario válido (ej. 18:00).';
    if (!esHoraValida(horaFin)) e.horaFin = 'Ingresá un horario válido (ej. 19:30).';
    if (esHoraValida(horaInicio) && esHoraValida(horaFin) && !horaFinPosterior(horaInicio, horaFin)) {
      e.horaFin = 'La hora de fin debe ser posterior a la hora de inicio.';
    }
    if (!esTextoRequerido(objetivo)) e.objetivo = 'Documentá el objetivo técnico de la sesión.';
    if (!esTextoRequerido(contenidoTuls)) e.contenidoTuls = 'Indicá las formas o tuls a practicar.';
    if (!esTextoRequerido(preparacionFisica)) {
      e.preparacionFisica = 'Detallá los ejercicios de preparación física planificados.';
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
        objetivo: objetivo.trim(),
        contenido_tuls: contenidoTuls.trim(),
        preparacion_fisica: preparacionFisica.trim(),
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
          Planificá la sesión de entrenamiento vinculada a un grupo y fecha. Toda la documentación técnica es
          obligatoria.
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

        {/* Planificación Marcial Obligatoria */}
        <CampoTexto
          label="Objetivo de la sesión *"
          value={objetivo}
          onChangeText={setObjetivo}
          placeholder="Ej. Perfeccionamiento de distancia y contraataque con giro talón"
          multiline
          numberOfLines={3}
          error={errores.objetivo}
        />

        <CampoTexto
          label="Contenido de Tuls / Formas *"
          value={contenidoTuls}
          onChangeText={setContenidoTuls}
          placeholder="Ej. Dan-Gun y Do-San; corrección de posturas L y flexión de rodilla"
          multiline
          numberOfLines={3}
          error={errores.contenidoTuls}
        />

        <CampoTexto
          label="Preparación física *"
          value={preparacionFisica}
          onChangeText={setPreparacionFisica}
          placeholder="Ej. Circuito Tabata 20s x 10s: burpees, abdominales y movilidad de cadera"
          multiline
          numberOfLines={3}
          error={errores.preparacionFisica}
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
});
