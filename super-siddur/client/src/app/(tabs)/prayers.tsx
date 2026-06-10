import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Card, Screen, Txt } from '@/ui/primitives';

const SERVICES = [
  { id: 'shacharit', en: 'Shacharit', he: 'שַׁחֲרִית', sub: 'Morning' },
  { id: 'mincha', en: 'Mincha', he: 'מִנְחָה', sub: 'Afternoon' },
  { id: 'maariv', en: 'Maariv', he: 'מַעֲרִיב', sub: 'Evening' },
  { id: 'bircat-hamazon', en: 'Blessing after meals', he: 'בִּרְכַּת הַמָּזוֹן', sub: 'Birkat HaMazon' },
  { id: 'kriat-shema-al-hamita', en: 'Bedtime Shema', he: 'קְרִיאַת שְׁמַע', sub: 'Before sleep' },
  { id: 'tefilat-haderech', en: "Traveler's Prayer", he: 'תְּפִלַּת הַדֶּרֶךְ', sub: 'On a journey' },
];

export default function Prayers() {
  const { c } = useTheme();
  return (
    <Screen>
      <Txt variant="display">Prayers</Txt>
      <Txt variant="label">Choose a service</Txt>
      {SERVICES.map((s) => (
        <Link key={s.id} href={`/prayer/${s.id}`} asChild>
          <Pressable>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="title">{s.en}</Txt>
                  <Txt variant="label">{s.sub}</Txt>
                </View>
                <Txt variant="hebrew" style={{ color: c.accent }}>{s.he}</Txt>
              </View>
            </Card>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
