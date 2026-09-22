import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { CampoTexto } from '@/components/CampoTexto';
import { useErrorGlobal } from '@/contextos/ErrorGlobal';
import { esErrorDeRed, registrarError } from '@/lib/errores';
import { mensajeAmigableDeErrorAuth } from '@/lib/auth-mensajes';
import { obtenerParametrosDeUrl } from '@/lib/parsear-deeplink';
import { supabase } from '@/lib/supabase';

export default function NuevaContrasenaScreen() {
  const url = Linking.useLinkingURL();
  const params = useMemo(() => obtenerParametrosDeUrl(url), [url]);
  const router = useRouter();
  const { reportarError } = useErrorGlobal();

  const [procesando, setProcesando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;

    const procesarEnlace = async () => {
      try {
        const { access_token, refresh_token, code } = params;
        let sesionEstablecida = false;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          sesionEstablecida = error == null;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          sesionEstablecida = error == null;
        }

        if (activo) {
          setTokenValido(sesionEstablecida);
          setProcesando(false);
        }
      } catch (error) {
        void registrarError({
          modulo: 'auth',
          contexto: 'nuevaContrasena',
          error,
          severidad: esErrorDeRed(error) ? 'critical' : 'error',
        });
        if (activo) {
          setTokenValido(false);
          setProcesando(false);
          reportarError();
        }
      }
    };

    procesarEnlace();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const guardarContrasena = async () => {
    if (enviando) return;
    setError(null);

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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(mensajeAmigableDeErrorAuth(error));
        return;
      }
      await supabase.auth.signOut();
      router.replace('/iniciar-sesion');
    } catch (error) {
      void registrarError({
        modulo: 'auth',
        contexto: 'nuevaContrasena',
        error,
        severidad: esErrorDeRed(error) ? 'critical' : 'error',
      });
      reportarError();
    } finally {
      setEnviando(false);
    }
  };

  if (procesando) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.mensaje}>Procesando el enlace…</Text>
      </View>
    );
  }

  if (!tokenValido) {
    return (
      <View style={styles.contenedor}>
        <Text style={styles.mensaje}>El enlace no es válido o expiró.</Text>
        <Link href="/iniciar-sesion" style={styles.enlace}>
          Volver a iniciar sesión
        </Link>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.titulo}>Recuperar contraseña</Text>
      <Text style={styles.subtitulo}>Elegí tu nueva contraseña.</Text>

      <CampoTexto
        label="Nueva contraseña"
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

      <Pressable
        onPress={guardarContrasena}
        disabled={enviando}
        style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
        accessibilityRole="button"
      >
        <Text style={styles.botonTexto}>{enviando ? 'Guardando…' : 'Guardar contraseña'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: '#fff',
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