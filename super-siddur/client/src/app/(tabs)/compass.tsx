import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { bearing, compassPoint, distanceKm, KOTEL } from '@/core/geo';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { Card, Screen, Txt } from '@/ui/primitives';

const SIZE = 240;

export default function Compass() {
  const { c } = useTheme();
  const { loc } = useSettings();

  const { deg, dist, atKotel } = useMemo(() => {
    const dist = distanceKm(loc, KOTEL);
    return { deg: bearing(loc, KOTEL), dist, atKotel: dist < 2 };
  }, [loc]);

  return (
    <Screen>
      <Txt variant="display">Compass</Txt>
      <Txt variant="label">Mizrach · direction of prayer toward the Kotel</Txt>

      <Card style={{ alignItems: 'center', gap: 20, paddingVertical: 32 }}>
        <View style={[styles.face, { borderColor: c.accent, backgroundColor: c.surface2 }]}>
          {(['N', 'E', 'S', 'W'] as const).map((d, i) => (
            <View key={d} style={[styles.cardinalHolder, { transform: [{ rotate: `${i * 90}deg` }] }]}>
              <Txt variant="label" style={styles.cardinal}>{d}</Txt>
            </View>
          ))}
          {!atKotel && (
            <View style={[styles.needleHolder, { transform: [{ rotate: `${deg}deg` }] }]}>
              <View style={[styles.needle, { backgroundColor: c.accent }]} />
            </View>
          )}
          <View style={[styles.hub, { backgroundColor: c.accent }]} />
        </View>

        {atKotel ? (
          <Txt variant="title" style={{ color: c.accent }}>You are at the Kotel 🕊️</Txt>
        ) : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Txt variant="display" style={{ color: c.accent }}>{Math.round(deg)}° {compassPoint(deg)}</Txt>
            <Txt variant="label">{Math.round(dist).toLocaleString()} km from {loc.name}</Txt>
          </View>
        )}
      </Card>

      <Txt variant="mono" style={{ textAlign: 'center' }}>
        Bearing from your selected city. Live device-heading rotation comes with the
        magnetometer in the next build.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  face: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  cardinalHolder: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center' },
  cardinal: { marginTop: 8 },
  needleHolder: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'flex-start' },
  needle: { width: 4, height: SIZE * 0.42, marginTop: SIZE / 2 - SIZE * 0.42, borderRadius: 2 },
  hub: { width: 14, height: 14, borderRadius: 7, position: 'absolute' },
});
