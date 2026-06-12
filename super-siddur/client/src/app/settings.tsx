import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CITIES, computeHebAge, gematria, gregToHeb, monthHe } from '@/core/engine';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/store/settings';
import { Field, Segmented, TextField, ToggleRow } from '@/ui/controls';
import { GlassCard, GradientText, Kicker, Txt } from '@/ui/primitives';

export default function Settings() {
  const { c } = useTheme();
  const { gutter, isDesktop } = useResponsive();
  const s = useSettings();
  const [adminTaps, setAdminTaps] = useState(0);
  const adminRevealed = adminTaps >= 7;

  const hebBirthday = useMemo(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.birthday);
    if (!m) return null;
    const h = gregToHeb(+m[1], +m[2], +m[3]);
    return `${gematria(h.day)} ${monthHe(h.month, h.year)} · age ${computeHebAge(h)}`;
  }, [s.birthday]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: gutter, paddingVertical: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={14} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={c.accent} />
        </Pressable>
        <GradientText size={isDesktop ? 34 : 28}>Personal Zone</GradientText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 48, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <GlassCard contentStyle={{ gap: 18 }}>
          <Kicker>Profile</Kicker>
          <Field label="English name">
            <TextField value={s.userEngName} onChangeText={(t) => s.update({ userEngName: t })} placeholder="e.g. David" />
          </Field>
          <Field label="Hebrew name">
            <TextField value={s.userHebName} onChangeText={(t) => s.update({ userHebName: t })} placeholder="דָּוִד" style={{ textAlign: 'right' }} />
          </Field>
          <Field label="Birthday (Gregorian)" hint={hebBirthday ?? 'Format YYYY-MM-DD — powers the birthday-psalm & Hebrew age'}>
            <TextField value={s.birthday} onChangeText={(t) => s.update({ birthday: t })} placeholder="1990-05-21" autoCapitalize="none" />
          </Field>
        </GlassCard>

        {/* Location */}
        <GlassCard contentStyle={{ gap: 12 }}>
          <Kicker>Location</Kicker>
          <Txt variant="label">Used for zmanim and the Kotel compass.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CITIES.map((city) => {
              const on = city.name === s.loc.name;
              return (
                <Pressable key={city.name} onPress={() => s.update({ loc: city })} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: on ? c.lineStrong : c.line, backgroundColor: on ? c.surface2 : 'transparent' }}>
                  <Txt style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? c.accent : c.textSecondary }}>{city.name}</Txt>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* Display */}
        <GlassCard contentStyle={{ gap: 18 }}>
          <Kicker>Display</Kicker>
          <Field label="Theme">
            <Segmented
              value={s.themePref}
              onChange={(v) => s.update({ themePref: v })}
              options={[{ value: 'auto', label: 'Auto' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]}
            />
          </Field>
          <Field label="Time format">
            <Segmented
              value={s.timeFmt}
              onChange={(v) => s.update({ timeFmt: v })}
              options={[{ value: '12', label: '12-hour' }, { value: '24', label: '24-hour' }]}
            />
          </Field>
        </GlassCard>

        {/* Prayer */}
        <GlassCard contentStyle={{ gap: 18 }}>
          <Kicker>Prayer</Kicker>
          <Field label="Nusach">
            <Segmented
              value={s.nusach}
              onChange={(v) => s.update({ nusach: v })}
              options={[
                { value: 'ashkenaz', label: 'Ashkenaz' },
                { value: 'sefard', label: 'Sefard' },
                { value: 'edot', label: 'Edot HaMizrach' },
                { value: 'ari', label: 'Ari' },
              ]}
            />
          </Field>
          <ToggleRow label="Israel (Eretz Yisrael) calendar" value={s.israelMode} onChange={(v) => s.update({ israelMode: v })} />
        </GlassCard>

        {/* Hidden admin reveal */}
        {adminRevealed && (
          <GlassCard glow contentStyle={{ gap: 12 }}>
            <Kicker>Admin · hidden</Kicker>
            <Txt variant="body">
              Admin sign-in connects to the siddur server (FastAPI) to edit content,
              splash, icons, and manage admins. Wiring to the backend comes next.
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color={c.accent} />
              <Txt variant="label">Admin entry unlocked</Txt>
            </View>
          </GlassCard>
        )}

        {/* About / hidden trigger */}
        <Pressable onPress={() => setAdminTaps((n) => n + 1)} style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Txt variant="mono" style={{ color: c.textFaint }}>The Super Siddur · v1 · offline-first</Txt>
          {adminTaps > 0 && adminTaps < 7 && (
            <Txt variant="mono" style={{ color: c.textFaint, fontSize: 10, marginTop: 4 }}>{7 - adminTaps} more…</Txt>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
