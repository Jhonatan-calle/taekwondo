import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorGlobalProvider } from '@/contextos/ErrorGlobal';

export default function RootLayout() {
  return (
    <ErrorGlobalProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ErrorGlobalProvider>
  );
}