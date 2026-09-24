import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CampoFecha } from '@/components/CampoFecha';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { aIsoLocal, esFechaBienFormada, fechaLocalDesdeISO, type Locacion } from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'fecha' | 'lugar', string>>;

const OTRO_LUGAR = '__otro__';

export default function NuevaMesaScreen() {
  const params = useLocalSearchParams<{ mesa_id?: string; id?: string }>();
  const mesaId = params.mesa_id ?? params.id;
  const esEdicion = mesaId != null && mesaId !== '';

  const { listarLocaciones, crearMesaExamen, editarMesaExamen, listarMesasExamen } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [locaciones, setLocaciones] = useState<Locacion[]>([]);
  const [locacionElegida, setLocacionElegida] = useState<string>(OTRO_LUGAR);
  const [otroLugar, setOtroLugar] = useState('');
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const resultado = await listarLocaciones();
    if (resultado.data != null) setLocaciones(resultado.data);

    if (esEdicion && mesaId != null) {
      const resultadoMesas = await listarMesasExamen();
      const mesa = resultadoMesas.data?.find((item) => item.id === mesaId) ?? null;
      if (mesa == null) {
        setError(MENSAJE_ERROR_GENERICO);
      } else {
        setFechaSeleccionada(fechaLocalDesdeISO(mesa.fecha) ?? new Date());
        const locacionCoincidente = resultado.data?.find((l) => l.nombre === mesa.lugar);
        if (locacionCoincidente != null) {
          setLocacionElegida(locacionCoincidente.id);
          setOtroLugar('');
        } else {
          setLocacionElegida(OTRO_LUGAR);
          setOtroLugar(mesa.lugar ?? '');
        }
      }
    }
    setCargando(false);
  }, [esEdicion, mesaId, listarLocaciones, listarMesasExamen]);

  useEffect(() => {
    // Carga inicial (precarga en modo edición).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const resolverLugar = (): string => {
    if (locacionElegida === OTRO_LUGAR) return otroLugar.trim();
    return locaciones.find((l) => l.id === locacionElegida)?.nombre ?? '';
  };

  const alEnviar = async () => {
    if (enviando) return;
    const lugar = resolverLugar();
    const e: ErroresFormulario = {};
    const fechaISO = aIsoLocal(fechaSeleccionada);
    if (!esFechaBienFormada(fechaISO)) e.fecha = 'Elegí una fecha válida.';
    if (lugar === '') e.lugar = 'Elegí una locación o escribí el lugar.';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      const datos = { fecha: fechaISO, lugar };
      const resultado =
        esEdicion && mesaId != null
          ? await editarMesaExamen(mesaId, datos)
          : await crearMesaExamen(datos);
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      if (esEdicion) {
        router.back();
      } else {
        const nuevoId = (resultado as { nuevoId?: string }).nuevoId;
        if (nuevoId != null) {
          router.replace({ pathname: '/maestro/mesas/[id]', params: { id: nuevoId } });
        } else {
          router.back();
        }
      }
    } catch {
      setError(MENSAJE_ERROR_GENERICO);
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>Cargando…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitulo}>
          {esEdicion
            ? 'Actualizá la fecha y el lugar de la mesa.'
            : 'Definí la fecha y el lugar de la mesa. Se abre con estado "abierta" para que los profesores postulen.'}
        </Text>

        <CampoFecha
          label="Fecha *"
          value={fechaSeleccionada}
          onChange={setFechaSeleccionada}
          error={errores.fecha}
        />

        <View style={styles.bloque}>
          <Text style={styles.label}>Lugar *</Text>
          {locaciones.length > 0 ? (
            <View style={styles.chips}>
              {locaciones.map((locacion) => {
                const seleccionada = locacionElegida === locacion.id;
                return (
                  <Pressable
                    key={locacion.id}
                    onPress={() => setLocacionElegida(locacion.id)}
                    style={[styles.chip, seleccionada ? styles.chipSeleccionado : null]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionada }}
                  >
                    <Text style={[styles.chipTexto, seleccionada ? styles.chipTextoSeleccionado : null]}>
                      {locacion.nombre}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setLocacionElegida(OTRO_LUGAR)}
                style={[styles.chip, locacionElegida === OTRO_LUGAR ? styles.chipSeleccionado : null]}
                accessibilityRole="button"
                accessibilityState={{ selected: locacionElegida === OTRO_LUGAR }}
              >
                <Text
                  style={[styles.chipTexto, locacionElegida === OTRO_LUGAR ? styles.chipTextoSeleccionado : null]}
                >
                  + Otro lugar
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.ayuda}>No tenés locaciones registradas: escribí el lugar.</Text>
          )}

          {locacionElegida === OTRO_LUGAR ? (
            <CampoTexto
              label="Otro lugar"
              autoCapitalize="words"
              placeholder="Ej. Dojang Central"
              value={otroLugar}
              onChangeText={setOtroLugar}
              error={errores.lugar}
            />
          ) : errores.lugar ? (
            <Text style={styles.errorTexto}>{errores.lugar}</Text>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void alEnviar()}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>
            {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Abrir mesa'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pantalla: {
    flex: 1,
  },
  contenido: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  bloque: {
    marginTop: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ayuda: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSeleccionado: {
    backgroundColor: '#fdf0f0',
    borderColor: '#C62828',
  },
  chipTexto: {
    fontSize: 13,
    color: '#555',
  },
  chipTextoSeleccionado: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  errorTexto: {
    color: '#C62828',
    fontSize: 13,
    marginBottom: 8,
  },
  error: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  boton: {
    backgroundColor: '#C62828',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  botonPresionado: {
    backgroundColor: '#a02020',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aviso: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
