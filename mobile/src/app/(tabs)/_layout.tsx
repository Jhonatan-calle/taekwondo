import { Tabs } from 'expo-router';
import { useAuthGlobal } from '@/contextos/AuthGlobal';

export default function TabsLayout() {
  const { esInstructor, esMaestro } = useAuthGlobal();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C62828',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen
        name="instructor"
        options={{ title: 'Instructor', href: esInstructor ? undefined : null }}
      />
      <Tabs.Screen name="maestro" options={{ title: 'Maestro', href: esMaestro ? undefined : null }} />
    </Tabs>
  );
}