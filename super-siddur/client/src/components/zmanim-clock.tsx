/**
 * The halachic ("zmanit") clock — 2026 edition.
 *
 * An analog face whose hands track halachic time: the day (alot → tzeit) is split
 * into 12 sha'ot zmaniot, each into 60 da'kot zmaniot. The digital readout shows
 * real local time and halachic time plus the live length of a sha'ah and da'kah.
 * Pure Views + a gradient ring (no SVG), and it ticks every 10s — the minute hand
 * moves only ~0.0001°/sec, so a slower tick is invisible yet much kinder to the
 * battery.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { computeZmanim, hmFmt, nowInLocTz, type Loc } from '@/core/engine';
import { halState, halTimeFmt } from '@/core/halachic';
import { useTheme } from '@/hooks/use-theme';
import { Txt } from '@/ui/primitives';

const SIZE = 240;
const TICK_MS = 10_000;

export function ZmanimClock({ loc, timeFmt }: { loc: Loc; timeFmt: '12' | '24' }) {
  const { c } = useTheme();
  const [bucket, setBucket] = useState(() => Math.floor(Date.now() / TICK_MS));

  useEffect(() => {
    const id = setInterval(() => setBucket(Math.floor(Date.now() / TICK_MS)), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    const zToday = computeZmanim(now, loc);
    if (!zToday) return null;
    const next = new Date(now); next.setDate(next.getDate() + 1);
    const prev = new Date(now); prev.setDate(prev.getDate() - 1);
    const zNext = computeZmanim(next, loc);
    const zPrev = computeZmanim(prev, loc);
    const nowMin = nowInLocTz(loc);
    const before = zToday.alot != null && nowMin < zToday.alot;
    const hs = halState(nowMin, zToday, (before ? zPrev : zNext) ?? undefined);
    return { nowMin, hs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, bucket]);

  if (!data?.hs) {
    return (
      <View style={styles.wrap}>
        <Txt variant="label">Halachic clock unavailable at this latitude/date.</Txt>
      </View>
    );
  }

  const { hs, nowMin } = data;
  const hourDeg = ((hs.halHour + hs.halMin / 60) / 12) * 360;
  const minDeg = (hs.halMin / 60) * 360;
  const isNight = hs.phase === 'night';
  const ring = isNight ? (['#6c5cff', '#39d0d8', '#1a1530'] as const) : (['#f3d27a', '#e7b955', '#5a4316'] as const);

  return (
    <View style={styles.wrap}>
      <View style={styles.faceWrap}>
        {/* glowing gradient ring */}
        <LinearGradient
          colors={ring}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.ring,
            { shadowColor: isNight ? '#6c5cff' : c.glow, shadowOpacity: 0.4, shadowRadius: 26, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
          ]}>
          <View style={[styles.face, { backgroundColor: c.backgroundElevated }]}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={[styles.tickHolder, { transform: [{ rotate: `${(i / 12) * 360}deg` }] }]}>
                <View style={[styles.tick, { backgroundColor: i % 3 === 0 ? c.accentSoft : c.line }]} />
              </View>
            ))}
            <View style={[styles.handHolder, { transform: [{ rotate: `${hourDeg}deg` }] }]}>
              <View style={[styles.hourHand, { backgroundColor: c.text }]} />
            </View>
            <View style={[styles.handHolder, { transform: [{ rotate: `${minDeg}deg` }] }]}>
              <View style={[styles.minHand, { backgroundColor: c.accent }]} />
            </View>
            <View style={[styles.hub, { backgroundColor: c.accent, shadowColor: c.glow, shadowOpacity: 0.8, shadowRadius: 8 }]} />
            <View style={styles.centerLabel} pointerEvents="none">
              <Txt variant="kicker" style={{ color: isNight ? c.indigo : c.accent }}>{isNight ? 'Layla' : 'Yom'}</Txt>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.readout}>
        <Row label="Halachic time" value={halTimeFmt(hs)} big />
        <Row label="Local time" value={hmFmt(nowMin, timeFmt)} />
        <Row label="Sha'ah zmanit" value={`${hs.shaahMin.toFixed(1)} min`} />
        <Row label="Da'kah zmanit" value={`${hs.dakahMin.toFixed(2)} min`} />
      </View>
    </View>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <Txt variant="kicker">{label}</Txt>
      <Txt variant="mono" style={{ color: big ? c.accent : c.text, fontSize: big ? 20 : 14, fontWeight: big ? '700' : '400' }}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 22, width: '100%' },
  faceWrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, padding: 4, alignItems: 'center', justifyContent: 'center' },
  face: { width: SIZE - 8, height: SIZE - 8, borderRadius: (SIZE - 8) / 2, alignItems: 'center', justifyContent: 'center' },
  tickHolder: { position: 'absolute', width: SIZE - 8, height: SIZE - 8, alignItems: 'center' },
  tick: { width: 2, height: 12, marginTop: 8, borderRadius: 1 },
  handHolder: { position: 'absolute', width: SIZE - 8, height: SIZE - 8, alignItems: 'center', justifyContent: 'flex-start' },
  hourHand: { width: 5, height: (SIZE - 8) * 0.27, marginTop: (SIZE - 8) / 2 - (SIZE - 8) * 0.27, borderRadius: 3 },
  minHand: { width: 3, height: (SIZE - 8) * 0.4, marginTop: (SIZE - 8) / 2 - (SIZE - 8) * 0.4, borderRadius: 2 },
  hub: { width: 13, height: 13, borderRadius: 7, position: 'absolute' },
  centerLabel: { position: 'absolute', bottom: (SIZE - 8) * 0.2 },
  readout: { width: '100%', maxWidth: 340, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
