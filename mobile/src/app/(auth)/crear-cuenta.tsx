import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { CampoTexto } from '@/components/CampoTexto';
import { useAuthGlobal } from '@/contextos/AuthGlobal';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { MENSAJE_ERROR_GENERICO } from '@/lib/errores';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CrearCuentaScreen() {
  const { registrarCuenta } = useAuthGlobal();
  const { reportarError } = useErrorGlobal();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendienteConfirmacion, setPendienteConfirmacion] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const alEnviar = async () => {
    if (enviando) return;
    setError(null);

    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Ingresá un email válido.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await registrarCuenta(email.trim(), password);
      if (resultado.error) {
        setError(resultado.error);
        if (resultado.error === MENSAJE_ERROR_GENERICO) {
          reportarError();
        }
        return;
      }
      if (resultado.pendienteConfirmacion) {
        setPendienteConfirmacion(true);
      }
    } finally {
      setEnviando(false);
    }
  };

  if (pendienteConfirmacion) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.mensaje}>
          Tu cuenta fue creada. Revisá tu email para confirmarla antes de iniciar sesión.
        </Text>
        <Link href="/iniciar-sesion" style={styles.enlace}>
          Ir a iniciar sesión
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
        <Text style={styles.titulo}>Crear cuenta</Text>
        <Text style={styles.subtitulo}>Registrate con tu email y contraseña.</Text>

        <CampoTexto
          label="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <CampoTexto
          label="Contraseña"
          esContrasena
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        <CampoTexto
          label="Confirmar contraseña"
          esContrasena
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirmacion}
          onChangeText={setConfirmacion}
          error={error}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={alEnviar}
          disabled={enviando}
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
        >
          <Text style={styles.botonTexto}>{enviando ? 'Registrando…' : 'Registrarme'}</Text>
        </Pressable>

        <Link href="/iniciar-sesion" style={styles.enlaceCentrado}>
          Ya tengo una cuenta
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