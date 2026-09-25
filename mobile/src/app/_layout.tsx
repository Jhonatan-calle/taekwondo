import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorGlobalProvider } from '@/contextos/ErrorGlobal';
import { AuthGlobalProvider, useAuthGlobal } from '@/contextos/AuthGlobal';
import { PantallaArranque } from '@/components/PantallaArranque';

// Fondo raíz de la app (detrás de la barra de estado y entre pantallas): blanco. Es el
// color que se ve donde la app no pinta nada, p. ej. la franja de la barra de estado.
// Si a futuro se agrega modo oscuro, este color se deriva del esquema.
void SystemUI.setBackgroundColorAsync('#ffffff');

// Evitamos que el splash nativo se oculte solo: lo ocultamos nosotros apenas monta el JS para
// dar paso a la pantalla de arranque propia (PantallaArranque), que muestra el póster completo.
// El splash nativo de Android 12+ sólo puede mostrar el ícono recortado en un círculo.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

function RootNavigator() {
  const { sesion, cargando, onboardingCompleto, resolviendoPerfil } = useAuthGlobal();
  const appLista = !cargando && !resolviendoPerfil;

  // Ocultamos el splash nativo apenas monta el JS (no esperamos a `appLista`): la pantalla de
  // arranque propia ya está renderizada detrás y muestra el póster a pantalla completa.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <>
      {/* Splash (oscuro) → íconos claros; app (clara) → íconos oscuros. */}
      <StatusBar style={appLista ? 'dark' : 'light'} />
      {appLista ? (
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
      ) : (
        <PantallaArranque />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider style={styles.raiz}>
      <ErrorGlobalProvider>
        <AuthGlobalProvider>
          <RootNavigator />
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
});
