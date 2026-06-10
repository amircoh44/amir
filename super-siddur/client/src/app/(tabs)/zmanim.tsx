import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ZmanimClock } from '@/components/zmanim-clock';
import { CITIES, computeZmanim, hmFmt, nowInLocTz, ZMANIM_ORDER } from '@/core/engine';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { Card, Txt } from '@/ui/primitives';
import { MaxContentWidth } from '@/constants/theme';

export default function ZmanimScreen() {
  const { c } = useTheme();
  const { loc, setLoc, timeFmt } = useSettings();

  const { rows, nowMin } = useMemo(() => {
    const z = computeZmanim(new Date(), loc);
    const nowMin = nowInLocTz(loc);
    const rows = ZMANIM_ORDER.map(({ key, en, he }) => ({
      key, en, he, t: z ? z[key] : null,
    }));
    return { rows, nowMin };
  }, [loc]);

  // Which zman is "current" (most recent passed)?
  const currentKey = useMemo(() => {
    let best: string | null = null;
    let bestT = -1;
    for (const r of rows) if (r.t != null && r.t <= nowMin && r.t > bestT) { bestT = r.t; best = r.key; }
    return best;
  }, [rows, nowMin]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <Txt variant="display">Zmanim</Txt>

          {/* City picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
            {CITIES.map((city) => {
              const on = city.name === loc.name;
              return (
                <Pressable
                  key={city.name}
                  onPress={() => setLoc(city)}
                  style={[
                    styles.chip,
                    { borderColor: on ? c.accent : c.line, backgroundColor: on ? c.surface2 : 'transparent' },
                  ]}>
                  <Txt variant="label" style={{ color: on ? c.accent : c.textSecondary }}>{city.name}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>

          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ZmanimClock loc={loc} timeFmt={timeFmt} />
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {rows.map((r, i) => {
              const on = r.key === currentKey;
              return (
                <View
                  key={r.key}
                  style={[
                    styles.row,
                    { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                    on && { backgroundColor: c.surface2 },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" style={on ? { color: c.accent, fontWeight: '700' } : undefined}>{r.en}</Txt>
                    <Txt variant="hebrew" style={{ fontSize: 16, color: c.textSecondary }}>{r.he}</Txt>
                  </View>
                  <Txt variant="mono" style={{ fontSize: 16, color: on ? c.accent : c.text }}>{hmFmt(r.t, timeFmt)}</Txt>
                </View>
              );
            })}
          </Card>

          <Txt variant="mono" style={{ textAlign: 'center' }}>
            Real astronomical times · computed on-device
          </Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
});
