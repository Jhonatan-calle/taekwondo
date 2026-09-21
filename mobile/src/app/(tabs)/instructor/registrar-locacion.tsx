import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { esDireccionValida, esMontoValido, esNombreValido } from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'nombre' | 'direccion' | 'valorAlquiler', string>>;

export default function RegistrarLocacionScreen() {
  const { locacion_id: locacionId } = useLocalSearchParams<{ locacion_id?: string }>();
  const { crearLocacion, editarLocacion, obtenerLocacionDetalle } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const esEdicion = locacionId != null && locacionId !== '';

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [valorAlquiler, setValorAlquiler] = useState('');
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(esEdicion);

  const cargarEdicion = useCallback(async () => {
    if (!esEdicion || locacionId == null) return;
    setCargando(true);
    const { data, error: err } = await obtenerLocacionDetalle(locacionId);
    if (err != null || data == null) {
      setError(MENSAJE_ERROR_GENERICO);
      if (err === MENSAJE_ERROR_GENERICO) reportarError();
    } else {
      setNombre(data.nombre);
      setDireccion(data.direccion);
      setValorAlquiler(String(data.valor_alquiler));
    }
    setCargando(false);
  }, [esEdicion, locacionId, obtenerLocacionDetalle, reportarError]);

  useEffect(() => {
    // Carga inicial en modo edición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarEdicion();
  }, [cargarEdicion]);

  const alEnviar = async () => {
    if (enviando) return;
    const e: ErroresFormulario = {};
    if (!esNombreValido(nombre)) e.nombre = 'Ingresá el nombre de la locación.';
    if (!esDireccionValida(direccion)) e.direccion = 'Ingresá la dirección de la locación.';
    if (!esMontoValido(valorAlquiler)) e.valorAlquiler = 'Ingresá el valor de alquiler pactado (mayor a 0).';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    const datos = {
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      valor_alquiler: Number(valorAlquiler.trim().replace(',', '.')),
    };

    setEnviando(true);
    try {
      const resultado =
        esEdicion && locacionId != null
          ? await editarLocacion(locacionId, datos)
          : await crearLocacion(datos);
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) reportarError();
        return;
      }
      router.back();
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
        <Text style={styles.aviso}>Cargando locación…</Text>
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
          Registrá el centro de entrenamiento con su valor de alquiler pactado. El monto de cada pago mensual se
          asienta recién al registrar el pago del periodo.
        </Text>

        <CampoTexto
          label="Nombre *"
          autoCapitalize="words"
          placeholder="Ej. Dojang Centro"
          value={nombre}
          onChangeText={setNombre}
          error={errores.nombre}
        />
        <CampoTexto
          label="Dirección *"
          placeholder="Ej. Av. Siempre Viva 742"
          value={direccion}
          onChangeText={setDireccion}
          error={errores.direccion}
        />
        <CampoTexto
          label="Valor de alquiler pactado *"
          keyboardType="numeric"
          placeholder="Ej. 50000"
          value={valorAlquiler}
          onChangeText={setValorAlquiler}
          error={errores.valorAlquiler}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>
            {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Guardar locación'}
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
