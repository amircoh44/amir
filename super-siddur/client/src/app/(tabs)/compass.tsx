import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { bearing, compassPoint, distanceKm, KOTEL } from '@/core/geo';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { GlassCard, GradientText, Kicker, Screen, Txt } from '@/ui/primitives';

const SIZE = 260;

export default function Compass() {
  const { c } = useTheme();
  const { isDesktop } = useResponsive();
  const { loc } = useSettings();

  const { deg, dist, atKotel } = useMemo(() => {
    const dist = distanceKm(loc, KOTEL);
    return { deg: bearing(loc, KOTEL), dist, atKotel: dist < 2 };
  }, [loc]);

  return (
    <Screen maxWidth={720}>
      <View style={{ gap: 4 }}>
        <Kicker>Mizrach · toward the Kotel</Kicker>
        <GradientText size={isDesktop ? 48 : 38}>Compass</GradientText>
      </View>

      <GlassCard glow contentStyle={{ alignItems: 'center', gap: 24, paddingVertical: 36 }}>
        <LinearGradient
          colors={['#f3d27a', '#9a7322', '#1a1530']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { shadowColor: c.glow, shadowOpacity: 0.35, shadowRadius: 26, elevation: 10 }]}>
          <View style={[styles.face, { backgroundColor: c.backgroundElevated }]}>
            {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
              <View key={d} style={[styles.cardHolder, { transform: [{ rotate: `${i * 90}deg` }] }]}>
                <Txt variant="kicker" style={{ marginTop: 10, color: i === 0 ? c.accent : c.textSecondary }}>{d}</Txt>
              </View>
            ))}
            {!atKotel && (
              <View style={[styles.needleHolder, { transform: [{ rotate: `${deg}deg` }] }]}>
                <View style={[styles.needle, { backgroundColor: c.accent }]} />
              </View>
            )}
            <View style={[styles.hub, { backgroundColor: c.accent, shadowColor: c.glow, shadowOpacity: 0.8, shadowRadius: 8 }]} />
          </View>
        </LinearGradient>

        {atKotel ? (
          <Txt variant="title" style={{ color: c.accent }}>You are at the Kotel 🕊️</Txt>
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <GradientText size={44}>{`${Math.round(deg)}° ${compassPoint(deg)}`}</GradientText>
            <Kicker>{`${Math.round(dist).toLocaleString()} km from ${loc.name}`}</Kicker>
          </View>
        )}
      </GlassCard>

      <Txt variant="mono" style={{ textAlign: 'center', color: c.textFaint }}>
        Bearing from your selected city. Live device-heading rotation arrives with the
        magnetometer in the next build.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, padding: 4, alignItems: 'center', justifyContent: 'center' },
  face: { width: SIZE - 8, height: SIZE - 8, borderRadius: (SIZE - 8) / 2, alignItems: 'center', justifyContent: 'center' },
  cardHolder: { position: 'absolute', width: SIZE - 8, height: SIZE - 8, alignItems: 'center' },
  needleHolder: { position: 'absolute', width: SIZE - 8, height: SIZE - 8, alignItems: 'center', justifyContent: 'flex-start' },
  needle: { width: 4, height: (SIZE - 8) * 0.42, marginTop: (SIZE - 8) / 2 - (SIZE - 8) * 0.42, borderRadius: 2 },
  hub: { width: 15, height: 15, borderRadius: 8, position: 'absolute' },
});
