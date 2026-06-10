import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { GlassCard, Kicker, Screen, Txt } from '@/ui/primitives';

export default function PrayerDetail() {
  const { c } = useTheme();
  const { gutter } = useResponsive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const title = (id ?? '').replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: gutter, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={c.accent} />
        </Pressable>
        <Txt variant="title">{title}</Txt>
      </View>
      <Screen maxWidth={760}>
        <GlassCard glow contentStyle={{ alignItems: 'center', gap: 10, paddingVertical: 34 }}>
          <Txt variant="hebrew" style={{ fontSize: 34, color: c.accent }}>בְּעֶזְרַת הַשֵּׁם</Txt>
          <Kicker>With God’s help</Kicker>
        </GlassCard>
        <GlassCard contentStyle={{ gap: 12 }}>
          <Kicker>Text coming next</Kicker>
          <Txt variant="body" style={{ color: c.textSecondary }}>
            The full Hebrew, transliteration, and English for “{title}” gets wired in
            next — ported from the siddur’s text data with nusach variants,
            day-sensitive insertions, and the “Daven With Me” guided mode.
          </Txt>
        </GlassCard>
      </Screen>
    </SafeAreaView>
  );
}
