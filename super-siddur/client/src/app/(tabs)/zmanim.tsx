import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ZmanimClock } from '@/components/zmanim-clock';
import { CITIES, computeZmanim, hmFmt, nowInLocTz, ZMANIM_ORDER } from '@/core/engine';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { GlassCard, GradientText, Kicker, Screen, Txt } from '@/ui/primitives';

export default function ZmanimScreen() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive();
  const { loc, setLoc, timeFmt } = useSettings();

  const { rows, nowMin } = useMemo(() => {
    const z = computeZmanim(new Date(), loc);
    const nowMin = nowInLocTz(loc);
    const rows = ZMANIM_ORDER.map(({ key, en, he }) => ({ key, en, he, t: z ? z[key] : null }));
    return { rows, nowMin };
  }, [loc]);

  const currentKey = useMemo(() => {
    let best: string | null = null, bestT = -1;
    for (const r of rows) if (r.t != null && r.t <= nowMin && r.t > bestT) { bestT = r.t; best = r.key; }
    return best;
  }, [rows, nowMin]);

  const clock = (
    <GlassCard glow style={isDesktop ? { width: 380 } : undefined} contentStyle={{ alignItems: 'center', paddingVertical: 30 }}>
      <ZmanimClock loc={loc} timeFmt={timeFmt} />
    </GlassCard>
  );

  const table = (
    <GlassCard style={{ flex: 1 }} contentStyle={{ padding: 0 }}>
      {rows.map((r, i) => {
        const on = r.key === currentKey;
        return (
          <View key={r.key} style={[styles.row, { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
            {on && <LinearGradient colors={[c.surface2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
            {on && <View style={[styles.bead, { backgroundColor: c.accent }]} />}
            <View style={{ flex: 1 }}>
              <Txt variant="body" style={on ? { color: c.accent, fontWeight: '700' } : undefined}>{r.en}</Txt>
              <Txt variant="hebrew" style={{ fontSize: 17, color: c.textSecondary }}>{r.he}</Txt>
            </View>
            <Txt variant="mono" style={{ fontSize: 16, color: on ? c.accent : c.text }}>{hmFmt(r.t, timeFmt)}</Txt>
          </View>
        );
      })}
    </GlassCard>
  );

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Kicker>Halachic times · on-device</Kicker>
        <GradientText size={isDesktop ? 48 : 38}>Zmanim</GradientText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {CITIES.map((city) => {
          const sel = city.name === loc.name;
          return (
            <Pressable key={city.name} onPress={() => setLoc(city)} style={[styles.chip, { borderColor: sel ? c.lineStrong : c.line, backgroundColor: sel ? c.surface2 : 'transparent' }]}>
              <Txt style={{ fontSize: 13, fontWeight: sel ? '700' : '500', color: sel ? c.accent : c.textSecondary }}>{city.name}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>

      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
          {clock}
          {table}
        </View>
      ) : (
        <>
          {clock}
          {table}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, overflow: 'hidden' },
  bead: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
});
