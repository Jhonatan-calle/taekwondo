import { Redirect, Stack } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

// Ancla del stack: garantiza que `maestro/index` quede debajo al navegar
// desde otro tab (p. ej. desde las tarjetas del Inicio) y el back vuelva al menú.
export const unstable_settings = { initialRouteName: 'index' };

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
      <Stack.Screen name="mesas/[id]/planilla" options={{ title: 'Planilla de evaluación' }} />
      <Stack.Screen name="auditoria" options={{ title: 'Auditoría de locaciones' }} />
      <Stack.Screen name="auditoria/[id]" options={{ title: 'Locación auditada' }} />
      <Stack.Screen name="estadisticas" options={{ title: 'Estadísticas' }} />
    </Stack>
  );
}
