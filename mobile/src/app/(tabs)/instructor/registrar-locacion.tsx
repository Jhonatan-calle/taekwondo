import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';
import { esDireccionValida, esNombreValido } from '@/lib/perfil';

type ErroresFormulario = Partial<Record<'nombre' | 'direccion', string>>;

export default function RegistrarLocacionScreen() {
  const { crearLocacion } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async () => {
    if (enviando) return;
    const e: ErroresFormulario = {};
    if (!esNombreValido(nombre)) e.nombre = 'Ingresá el nombre de la locación.';
    if (!esDireccionValida(direccion)) e.direccion = 'Ingresá la dirección de la locación.';
    setErrores(e);
    setError(null);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      const resultado = await crearLocacion({
        nombre: nombre.trim(),
        direccion: direccion.trim(),
      });
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitulo}>
          Registrá el centro de entrenamiento. El valor del alquiler se asienta recién al registrar el pago de un
          periodo.
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

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Guardar locación'}</Text>
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
});