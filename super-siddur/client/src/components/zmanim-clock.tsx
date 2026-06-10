/**
 * The halachic ("zmanit") clock.
 *
 * An analog face whose hands track halachic time — the day (alot → tzeit) is
 * divided into 12 sha'ot zmaniot, each into 60 da'kot zmaniot. The digital
 * readout shows both the real local time and the halachic time, with the live
 * length of a sha'ah and da'kah. Built from plain Views (rotation transforms),
 * so it needs no SVG dependency and renders identically on web and native.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { computeZmanim, hmFmt, nowInLocTz, type Loc } from '@/core/engine';
import { halState, halTimeFmt } from '@/core/halachic';
import { Txt } from '@/ui/primitives';

const SIZE = 220;

export function ZmanimClock({ loc, timeFmt }: { loc: Loc; timeFmt: '12' | '24' }) {
  const { c } = useTheme();
  const [, tick] = useState(0);

  // Re-render every second so the hands move with the da'kah zmanit.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    const zToday = computeZmanim(now, loc);
    const adj = new Date(now);
    adj.setDate(adj.getDate() + 1);
    const zNext = computeZmanim(adj, loc);
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    const zPrev = computeZmanim(prev, loc);
    const nowMin = nowInLocTz(loc);
    if (!zToday) return null;
    // After nightfall use tomorrow's dawn; before dawn use yesterday's nightfall.
    const before = zToday.alot != null && nowMin < zToday.alot;
    const hs = halState(nowMin, zToday, before ? zPrev ?? undefined : zNext ?? undefined);
    return { nowMin, hs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, Math.floor(Date.now() / 1000)]);

  if (!data || !data.hs) {
    return (
      <View style={styles.wrap}>
        <Txt variant="label">Halachic clock unavailable at this latitude/date</Txt>
      </View>
    );
  }

  const { hs, nowMin } = data;
  // Hour hand: 12 sha'ot around the face. Minute hand: 60 da'kot.
  const hourDeg = ((hs.halHour + hs.halMin / 60) / 12) * 360;
  const minDeg = (hs.halMin / 60) * 360;
  const isNight = hs.phase === 'night';
  const faceBg = isNight ? c.surface2 : c.surface;
  const accent = c.accent;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.face,
          { backgroundColor: faceBg, borderColor: accent },
        ]}>
        {/* hour ticks */}
        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.tickHolder,
              { transform: [{ rotate: `${(i / 12) * 360}deg` }] },
            ]}>
            <View style={[styles.tick, { backgroundColor: c.line }]} />
          </View>
        ))}
        {/* hour hand */}
        <View style={[styles.handHolder, { transform: [{ rotate: `${hourDeg}deg` }] }]}>
          <View style={[styles.hourHand, { backgroundColor: c.text }]} />
        </View>
        {/* minute hand */}
        <View style={[styles.handHolder, { transform: [{ rotate: `${minDeg}deg` }] }]}>
          <View style={[styles.minHand, { backgroundColor: accent }]} />
        </View>
        <View style={[styles.hub, { backgroundColor: accent }]} />
        <View style={styles.centerLabel} pointerEvents="none">
          <Txt variant="label" style={{ color: accent }}>
            {isNight ? 'LAYLA' : 'YOM'}
          </Txt>
        </View>
      </View>

      <View style={styles.readout}>
        <Row label="Halachic time" value={halTimeFmt(hs)} accent />
        <Row label="Local time" value={hmFmt(nowMin, timeFmt)} />
        <Row label="Sha'ah zmanit" value={`${hs.shaahMin.toFixed(1)} min`} />
        <Row label="Da'kah zmanit" value={`${hs.dakahMin.toFixed(2)} min`} />
      </View>
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <Txt variant="label">{label}</Txt>
      <Txt
        variant="mono"
        style={{ color: accent ? c.accent : c.text, fontSize: accent ? 18 : 14 }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 20 },
  face: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickHolder: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center' },
  tick: { width: 2, height: 10, marginTop: 6, borderRadius: 1 },
  handHolder: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  hourHand: {
    width: 4,
    height: SIZE * 0.28,
    marginTop: SIZE / 2 - SIZE * 0.28,
    borderRadius: 2,
  },
  minHand: {
    width: 3,
    height: SIZE * 0.4,
    marginTop: SIZE / 2 - SIZE * 0.4,
    borderRadius: 2,
  },
  hub: { width: 12, height: 12, borderRadius: 6, position: 'absolute' },
  centerLabel: { position: 'absolute', bottom: SIZE * 0.22 },
  readout: { width: '100%', maxWidth: 320, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
