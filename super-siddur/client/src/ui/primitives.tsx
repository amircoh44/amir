/**
 * 2026 themed building blocks: full-bleed responsive Screen, glass GlassCard with
 * a gradient hairline + soft glow, gradient text, section headers, and a typed
 * text component. No GPU blur loops — glow/translucency only, to stay battery-kind.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, ScrollView, StyleSheet, Text, type TextProps, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Gradients } from '@/constants/theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type TxtVariant = 'hero' | 'display' | 'title' | 'body' | 'label' | 'kicker' | 'hebrew' | 'mono';

export function Txt({ variant = 'body', style, ...rest }: TextProps & { variant?: TxtVariant }) {
  const { c, fonts } = useTheme();
  const base: Record<TxtVariant, object> = {
    hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, color: c.text, fontWeight: '700', letterSpacing: 0.5 },
    display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: c.text, fontWeight: '700', letterSpacing: 0.4 },
    title: { fontFamily: fonts.serif, fontSize: 20, color: c.text, fontWeight: '600' },
    body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, color: c.text },
    label: { fontFamily: fonts.sans, fontSize: 13, color: c.textSecondary },
    kicker: { fontFamily: fonts.sans, fontSize: 11, color: c.accentSoft, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: '700' },
    hebrew: { fontFamily: fonts.hebrew, fontSize: 24, color: c.text, writingDirection: 'rtl' },
    mono: { fontFamily: fonts.mono, fontSize: 13, color: c.textSecondary, letterSpacing: 0.5 },
  };
  return <Text style={[base[variant], style]} {...rest} />;
}

/**
 * Frosted "glass" panel: a gradient hairline border (outer gradient with 1px
 * padding) wrapping a translucent surface, with an optional soft accent glow.
 */
export function GlassCard({
  style,
  contentStyle,
  glow = false,
  children,
}: {
  style?: ViewProps['style'];
  contentStyle?: ViewProps['style'];
  glow?: boolean;
  children: React.ReactNode;
}) {
  const { c, radius } = useTheme();
  return (
    <LinearGradient
      colors={[c.lineStrong, c.line, 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.4 }}
      style={[
        { borderRadius: radius.lg, padding: 1 },
        glow && {
          shadowColor: c.glow,
          shadowOpacity: 0.25,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        style,
      ]}>
      <View style={[{ borderRadius: radius.lg - 1, backgroundColor: c.surface, padding: 18 }, contentStyle]}>
        {children}
      </View>
    </LinearGradient>
  );
}

/** Gradient-filled display text (web uses background-clip; native falls back to accent). */
export function GradientText({ children, size = 40 }: { children: string; size?: number }) {
  const { c, fonts } = useTheme();
  if (Platform.OS === 'web') {
    const webStyle = {
      fontFamily: fonts.display,
      fontSize: size,
      fontWeight: '800',
      letterSpacing: 0.5,
      backgroundImage: `linear-gradient(120deg, ${Gradients.gold[0]}, ${Gradients.gold[1]}, ${Gradients.gold[2]})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent',
    } as unknown as TextProps['style'];
    return <Text style={webStyle}>{children}</Text>;
  }
  return <Text style={{ fontFamily: fonts.display, fontSize: size, fontWeight: '800', color: c.accent, letterSpacing: 0.5 }}>{children}</Text>;
}

export function Kicker({ children }: { children: string }) {
  return <Txt variant="kicker">{children}</Txt>;
}

/** Page shell: safe-area, themed background, full-bleed with responsive gutters. */
export function Screen({
  children,
  scroll = true,
  maxWidth,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  /** Optional content clamp; omit for true 100% width. */
  maxWidth?: number;
}) {
  const { c } = useTheme();
  const { gutter } = useResponsive();
  const pad = { paddingHorizontal: gutter, paddingTop: 12, paddingBottom: 40 };
  const inner = <View style={[{ width: '100%', gap: 18 }, maxWidth ? { maxWidth, alignSelf: 'center' } : null]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={pad} showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[pad, { flex: 1 }]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}
