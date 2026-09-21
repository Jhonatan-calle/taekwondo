import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RecuperarContrasenaScreen() {
  const { recuperarContrasena } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async () => {
    if (enviando) return;
    setError(null);

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Ingresá un email válido.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await recuperarContrasena(email.trim());
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) {
          reportarError();
        }
        return;
      }
      setEnviado(true);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.mensaje}>
          Si existe una cuenta con ese email, vas a recibir un enlace para restablecer tu contraseña.
        </Text>
        <Link href="/iniciar-sesion" style={styles.enlace}>
          Volver a iniciar sesión
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.pantalla}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.titulo}>Recuperar contraseña</Text>
        <Text style={styles.subtitulo}>
          Ingresá tu email y te enviaremos un enlace para restablecerla.
        </Text>

        <CampoTexto
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          error={error}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Enviando…' : 'Enviar enlace'}</Text>
        </Pressable>

        <Link href="/iniciar-sesion" style={styles.enlaceCentrado}>
          Volver a iniciar sesión
        </Link>
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
    justifyContent: 'center',
    padding: 24,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
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
  enlaceCentrado: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mensaje: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  enlace: {
    marginTop: 16,
    color: '#C62828',
    fontSize: 16,
    fontWeight: '600',
  },
});