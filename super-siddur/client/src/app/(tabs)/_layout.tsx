import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { type ColorValue, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.tabInactive,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.line,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="prayers" options={{ title: 'Prayers', tabBarIcon: icon('book-outline') }} />
      <Tabs.Screen name="tehillim" options={{ title: 'Tehillim', tabBarIcon: icon('musical-notes-outline') }} />
      <Tabs.Screen name="zmanim" options={{ title: 'Zmanim', tabBarIcon: icon('time-outline') }} />
      <Tabs.Screen name="compass" options={{ title: 'Compass', tabBarIcon: icon('compass-outline') }} />
    </Tabs>
  );
}
