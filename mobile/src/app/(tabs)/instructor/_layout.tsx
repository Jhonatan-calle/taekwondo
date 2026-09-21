import { Redirect, Stack } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function InstructorLayout() {
  const { esProfesorBandera } = useAuthGlobal();

  if (!esProfesorBandera) {
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
      <Stack.Screen name="alumnos" options={{ title: 'Mis alumnos' }} />
      <Stack.Screen name="alta-alumno" options={{ title: 'Alta de alumno' }} />
      <Stack.Screen name="alumno/[id]" options={{ title: 'Detalle del alumno' }} />
      <Stack.Screen name="grupos" options={{ title: 'Mis grupos' }} />
      <Stack.Screen name="nuevo-grupo" options={{ title: 'Nuevo grupo' }} />
      <Stack.Screen name="grupo/[id]" options={{ title: 'Detalle del grupo' }} />
      <Stack.Screen name="registrar-locacion" options={{ title: 'Registrar locación' }} />
      <Stack.Screen name="clases" options={{ title: 'Clases' }} />
      <Stack.Screen name="nueva-clase" options={{ title: 'Nueva clase' }} />
      <Stack.Screen name="clase/[id]" options={{ title: 'Detalle de la clase' }} />
    </Stack>
  );
}