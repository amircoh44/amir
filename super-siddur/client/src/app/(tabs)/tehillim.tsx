import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { gematria } from '@/core/engine';
import { useTheme } from '@/hooks/use-theme';
import { Screen, Txt } from '@/ui/primitives';

export default function Tehillim() {
  const { c } = useTheme();
  return (
    <Screen>
      <Txt variant="display">Tehillim</Txt>
      <Txt variant="label">Psalms 1–150 · tap to open</Txt>
      <View style={styles.grid}>
        {Array.from({ length: 150 }, (_, i) => i + 1).map((n) => (
          <Link key={n} href={`/prayer/tehillim-${n}`} asChild>
            <Pressable
              style={[styles.cell, { borderColor: c.line, backgroundColor: c.surface }]}>
              <Txt variant="body" style={{ color: c.text }}>{n}</Txt>
              <Txt variant="hebrew" style={{ fontSize: 13, color: c.textSecondary }}>{gematria(n)}</Txt>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  cell: {
    width: 60, height: 56, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
});
