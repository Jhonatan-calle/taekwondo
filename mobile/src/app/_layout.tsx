import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { ErrorGlobalProvider } from '@/contextos/ErrorGlobal';
import { AuthGlobalProvider, useAuthGlobal } from '@/contextos/AuthGlobal';

function RootNavigator() {
  const { sesion, cargando, onboardingCompleto, resolviendoPerfil } = useAuthGlobal();

  if (cargando || resolviendoPerfil) {
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
});