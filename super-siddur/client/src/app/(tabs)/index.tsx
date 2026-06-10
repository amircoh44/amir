import { useMemo } from 'react';
import { View } from 'react-native';

import {
  computeZmanim,
  gematria,
  hmFmt,
  monthHe,
  nowInLocTz,
  omerCount,
  todayHeb,
  ZMANIM_ORDER,
} from '@/core/engine';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { Card, Screen, Txt } from '@/ui/primitives';

function greeting(nowMin: number): string {
  const h = nowMin / 60;
  if (h < 5) return 'Laila tov';
  if (h < 12) return 'Boker tov';
  if (h < 18) return 'Tzaharayim tovim';
  return 'Erev tov';
}

export default function Today() {
  const { c } = useTheme();
  const { loc, timeFmt } = useSettings();

  const { hebStr, nowMin, next, omer } = useMemo(() => {
    const now = new Date();
    const z = computeZmanim(now, loc);
    const nowMin = nowInLocTz(loc);
    // The Hebrew day rolls at sunset.
    const afterSunset = z?.shkia != null && nowMin >= z.shkia;
    const rollDate = new Date(now);
    if (afterSunset) rollDate.setDate(rollDate.getDate() + 1);
    const h = todayHeb(rollDate);
    const hebStr = `${gematria(h.day)} ${monthHe(h.month, h.year)}`;
    // Next upcoming zman today.
    let next: { en: string; he: string; t: number } | null = null;
    if (z) {
      for (const { key, en, he } of ZMANIM_ORDER) {
        const t = z[key];
        if (t != null && t >= nowMin && (!next || t < next.t)) next = { en, he, t };
      }
    }
    return { hebStr, nowMin, next, omer: omerCount(rollDate) };
  }, [loc]);

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt variant="label">{greeting(nowMin)}</Txt>
        <Txt variant="display">Today</Txt>
      </View>

      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
        <Txt variant="hebrew" style={{ fontSize: 40, color: c.accent }}>{hebStr}</Txt>
        <Txt variant="label">{loc.name}</Txt>
      </Card>

      {next && (
        <Card>
          <Txt variant="label">Next</Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
            <View>
              <Txt variant="title">{next.en}</Txt>
              <Txt variant="hebrew" style={{ fontSize: 18, color: c.textSecondary }}>{next.he}</Txt>
            </View>
            <Txt variant="mono" style={{ fontSize: 22, color: c.accent }}>{hmFmt(next.t, timeFmt)}</Txt>
          </View>
        </Card>
      )}

      {omer > 0 && (
        <Card>
          <Txt variant="label">Sefirat HaOmer</Txt>
          <Txt variant="title" style={{ marginTop: 4 }}>Day {omer} of the Omer</Txt>
        </Card>
      )}

      <Txt variant="mono" style={{ textAlign: 'center', marginTop: 8 }}>
        The Super Siddur · offline-first
      </Txt>
    </Screen>
  );
}
