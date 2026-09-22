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
      <Stack.Screen name="mesas" options={{ title: 'Mesas de examen' }} />
      <Stack.Screen name="mesas/nueva" options={{ title: 'Nueva mesa' }} />
      <Stack.Screen name="mesas/[id]" options={{ title: 'Detalle de la mesa' }} />
      <Stack.Screen name="auditoria" options={{ title: 'Auditoría de locaciones' }} />
      <Stack.Screen name="auditoria/[id]" options={{ title: 'Locación auditada' }} />
    </Stack>
  );
}
