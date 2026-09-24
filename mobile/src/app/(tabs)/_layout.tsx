import { Tabs, router } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function TabsLayout() {
  const { esProfesorBandera, esMaestro } = useAuthGlobal();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C62828',
        tabBarInactiveTintColor: '#666',
        tabBarIcon: () => null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen
        name="instructor"
        options={{ title: 'Instructor', href: esProfesorBandera ? undefined : null }}
        listeners={{
          // Tocar la pestaña siempre lleva al menú del tab (no a la última pantalla del stack).
          tabPress: () => {
            router.navigate('/instructor');
          },
        }}
      />
      <Tabs.Screen
        name="maestro"
        options={{ title: 'Maestro', href: esMaestro ? undefined : null }}
        listeners={{
          tabPress: () => {
            router.navigate('/maestro');
          },
        }}
      />
    </Tabs>
  );
}