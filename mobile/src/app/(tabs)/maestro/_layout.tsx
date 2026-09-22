import { Redirect, Stack } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function MaestroLayout() {
  const { esMaestro } = useAuthGlobal();

  if (!esMaestro) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: '#C62828',
        headerTitleStyle: { color: '#111' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="auditoria" options={{ title: 'Auditoría de locaciones' }} />
      <Stack.Screen name="auditoria/[id]" options={{ title: 'Locación auditada' }} />
    </Stack>
  );
}
