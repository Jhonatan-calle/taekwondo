import { Tabs } from 'expo-router';
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
      />
      <Tabs.Screen name="maestro" options={{ title: 'Maestro', href: esMaestro ? undefined : null }} />
    </Tabs>
  );
}