import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorGlobalProvider } from '@/contextos/ErrorGlobal';
import { AuthGlobalProvider, useAuthGlobal } from '@/contextos/AuthGlobal';

// Fondo raíz de la app (detrás de la barra de estado y entre pantallas): blanco. Es el
// color que se ve donde la app no pinta nada, p. ej. la franja de la barra de estado.
// Si a futuro se agrega modo oscuro, este color se deriva del esquema.
void SystemUI.setBackgroundColorAsync('#ffffff');

// Mantenemos el splash nativo (oscuro, `app.json`) visible hasta que la sesión y el perfil
// estén resueltos. Así evitamos el salto visual entre el fondo oscuro del splash y la app
// clara (que antes se veía como un parpadeo blanco).
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

function BarraEstado() {
  // La app es clara (`userInterfaceStyle: "light"`): íconos OSCUROS sobre fondo blanco,
  // SIEMPRE en contraste. Cuando se implemente el modo oscuro, esto pasa a derivarse del
  // esquema (useColorScheme) junto con la paleta.
  return <StatusBar style="dark" />;
}

function RootNavigator() {
  const { sesion, cargando, onboardingCompleto, resolviendoPerfil } = useAuthGlobal();
  const appLista = !cargando && !resolviendoPerfil;

  // Recién cuando hay contenido para mostrar ocultamos el splash nativo (así nunca se
  // ve una pantalla en blanco entre el splash y la app).
  useEffect(() => {
    if (appLista) {
      void SplashScreen.hideAsync();
    }
  }, [appLista]);

  if (!appLista) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#C62828" accessibilityLabel="Cargando" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={sesion != null && onboardingCompleto}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={sesion != null && !onboardingCompleto}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={sesion == null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="nueva-contrasena" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.raiz}>
      <ErrorGlobalProvider>
        <AuthGlobalProvider>
          <RootNavigator />
          <BarraEstado />
        </AuthGlobalProvider>
      </ErrorGlobalProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  cargando: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});