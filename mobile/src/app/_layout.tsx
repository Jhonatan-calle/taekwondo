import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorGlobalProvider } from '@/contextos/ErrorGlobal';
import { AuthGlobalProvider, useAuthGlobal } from '@/contextos/AuthGlobal';

function RootNavigator() {
  const { sesion, cargando, onboardingCompleto } = useAuthGlobal();

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <Text style={styles.cargandoTexto}>Cargando…</Text>
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
    <ErrorGlobalProvider>
      <AuthGlobalProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthGlobalProvider>
    </ErrorGlobalProvider>
  );
}

const styles = StyleSheet.create({
  cargando: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargandoTexto: {
    fontSize: 16,
    color: '#666',
  },
});