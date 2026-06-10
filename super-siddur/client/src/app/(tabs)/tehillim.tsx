import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { gematria } from '@/core/engine';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { GradientText, Kicker, Screen, Txt } from '@/ui/primitives';

export default function Tehillim() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive();
  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Kicker>Sefer Tehillim · 1–150</Kicker>
        <GradientText size={isDesktop ? 48 : 38}>Tehillim</GradientText>
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => (
          <Link key={n} href={`/prayer/tehillim-${n}`} asChild>
            <Pressable style={[styles.cell, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Txt style={{ color: c.text, fontSize: 17, fontWeight: '600' }}>{n}</Txt>
              <Txt variant="hebrew" style={{ fontSize: 13, color: c.accentSoft }}>{gematria(n)}</Txt>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  cell: {
    width: 64, height: 60, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
});
