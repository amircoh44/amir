import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { SettingsProvider } from '@/store/settings';

export default function RootLayout() {
  const { c, name } = useTheme();
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="prayer/[id]" options={{ presentation: 'card' }} />
        </Stack>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
