import { Slot } from 'expo-router';
import { View } from 'react-native';

import { Dock, Sidebar } from '@/components/app-nav';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export default function AppShell() {
  const { c } = useTheme();
  const { isPhone } = useResponsive();

  if (isPhone) {
    // Phone: full-bleed content with a translucent dock beneath.
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <Dock />
      </View>
    );
  }

  // Tablet / desktop: sidebar rail + full-width main area.
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.background }}>
      <Sidebar />
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
