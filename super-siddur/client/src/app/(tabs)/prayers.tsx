import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { GlassCard, GradientText, Kicker, Screen, Txt } from '@/ui/primitives';

type Ion = React.ComponentProps<typeof Ionicons>['name'];

const SERVICES: { id: string; en: string; he: string; sub: string; icon: Ion }[] = [
  { id: 'shacharit', en: 'Shacharit', he: 'שַׁחֲרִית', sub: 'Morning', icon: 'sunny-outline' },
  { id: 'mincha', en: 'Mincha', he: 'מִנְחָה', sub: 'Afternoon', icon: 'partly-sunny-outline' },
  { id: 'maariv', en: 'Maariv', he: 'מַעֲרִיב', sub: 'Evening', icon: 'moon-outline' },
  { id: 'bircat-hamazon', en: 'Blessing after meals', he: 'בִּרְכַּת הַמָּזוֹן', sub: 'Birkat HaMazon', icon: 'restaurant-outline' },
  { id: 'kriat-shema-al-hamita', en: 'Bedtime Shema', he: 'קְרִיאַת שְׁמַע', sub: 'Before sleep', icon: 'bed-outline' },
  { id: 'tefilat-haderech', en: "Traveler's Prayer", he: 'תְּפִלַּת הַדֶּרֶךְ', sub: 'On a journey', icon: 'airplane-outline' },
];

export default function Prayers() {
  const { c } = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const cols = isDesktop ? 3 : isTablet ? 2 : 1;
  const basis = `${100 / cols}%`;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Kicker>Tefillah</Kicker>
        <GradientText size={isDesktop ? 48 : 38}>Prayers</GradientText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -9 }}>
        {SERVICES.map((s) => (
          <View key={s.id} style={{ width: basis as `${number}%`, padding: 9 }}>
            <Link href={`/prayer/${s.id}`} asChild>
              <Pressable>
                <GlassCard contentStyle={{ gap: 14, minHeight: 140, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={s.icon} size={22} color={c.accent} />
                    </View>
                    <Txt variant="hebrew" style={{ color: c.accentSoft, fontSize: 26 }}>{s.he}</Txt>
                  </View>
                  <View>
                    <Txt variant="title">{s.en}</Txt>
                    <Kicker>{s.sub}</Kicker>
                  </View>
                </GlassCard>
              </Pressable>
            </Link>
          </View>
        ))}
      </View>
    </Screen>
  );
}
