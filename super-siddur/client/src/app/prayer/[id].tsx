import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Card, Screen, Txt } from '@/ui/primitives';

export default function PrayerDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const title = (id ?? '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Txt variant="title">{title}</Txt>
      </View>
      <Screen>
        <Card style={{ gap: 12 }}>
          <Txt variant="label">Text coming next</Txt>
          <Txt variant="body">
            The full Hebrew text, transliteration, and English for “{title}” gets wired
            in next — ported from the siddur’s text data with nusach variants,
            day-sensitive insertions, and the “Daven With Me” guided mode.
          </Txt>
        </Card>
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Txt variant="hebrew" style={{ fontSize: 30, color: c.accent }}>בְּעֶזְרַת הַשֵּׁם</Txt>
          <Txt variant="label">With God’s help</Txt>
        </Card>
      </Screen>
    </SafeAreaView>
  );
}
