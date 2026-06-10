import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { View } from 'react-native';

import {
  computeZmanim, gematria, hmFmt, monthHe, nowInLocTz, omerCount, todayHeb, ZMANIM_ORDER,
} from '@/core/engine';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { GlassCard, GradientText, Kicker, Screen, Txt } from '@/ui/primitives';

function greeting(nowMin: number): string {
  const h = nowMin / 60;
  if (h < 5) return 'Laila tov';
  if (h < 12) return 'Boker tov';
  if (h < 18) return 'Tzaharayim tovim';
  return 'Erev tov';
}

export default function Today() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive();
  const { loc, timeFmt } = useSettings();

  const { hebStr, nowMin, next, omer, afterSunset } = useMemo(() => {
    const now = new Date();
    const z = computeZmanim(now, loc);
    const nowMin = nowInLocTz(loc);
    const afterSunset = z?.shkia != null && nowMin >= z.shkia;
    const rollDate = new Date(now);
    if (afterSunset) rollDate.setDate(rollDate.getDate() + 1);
    const h = todayHeb(rollDate);
    const hebStr = `${gematria(h.day)} ${monthHe(h.month, h.year)}`;
    let next: { en: string; he: string; t: number } | null = null;
    if (z) for (const { key, en, he } of ZMANIM_ORDER) {
      const t = z[key];
      if (t != null && t >= nowMin && (!next || t < next.t)) next = { en, he, t };
    }
    return { hebStr, nowMin, next, omer: omerCount(rollDate), afterSunset };
  }, [loc]);

  const dateCard = (
    <GlassCard glow style={{ flex: 1 }} contentStyle={{ alignItems: 'center', paddingVertical: 34, gap: 10 }}>
      <Kicker>{afterSunset ? 'Evening · after sunset' : 'Hebrew date'}</Kicker>
      <Txt variant="hebrew" style={{ fontSize: 52, lineHeight: 60, color: c.accent }}>{hebStr}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }} />
        <Txt variant="label">{loc.name}</Txt>
      </View>
    </GlassCard>
  );

  const nextCard = next && (
    <GlassCard style={{ flex: 1 }} contentStyle={{ gap: 8, paddingVertical: 24 }}>
      <Kicker>Next zman</Kicker>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt variant="title">{next.en}</Txt>
          <Txt variant="hebrew" style={{ fontSize: 20, color: c.textSecondary }}>{next.he}</Txt>
        </View>
        <GradientText size={34}>{hmFmt(next.t, timeFmt)}</GradientText>
      </View>
    </GlassCard>
  );

  return (
    <Screen>
      {/* hero band */}
      <LinearGradient
        colors={[c.surface2, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ borderRadius: 24, paddingVertical: 8 }}>
        <View style={{ gap: 4, paddingHorizontal: 6, paddingTop: 8 }}>
          <Kicker>{greeting(nowMin)}</Kicker>
          <GradientText size={isDesktop ? 52 : 40}>Today</GradientText>
        </View>
      </LinearGradient>

      {isDesktop ? (
        <View style={{ flexDirection: 'row', gap: 18 }}>
          {dateCard}
          <View style={{ flex: 1, gap: 18 }}>
            {nextCard}
            {omer > 0 && (
              <GlassCard contentStyle={{ gap: 6 }}>
                <Kicker>Sefirat HaOmer</Kicker>
                <Txt variant="title">Day {omer} of the Omer</Txt>
              </GlassCard>
            )}
          </View>
        </View>
      ) : (
        <>
          {dateCard}
          {nextCard}
          {omer > 0 && (
            <GlassCard contentStyle={{ gap: 6 }}>
              <Kicker>Sefirat HaOmer</Kicker>
              <Txt variant="title">Day {omer} of the Omer</Txt>
            </GlassCard>
          )}
        </>
      )}
    </Screen>
  );
}
