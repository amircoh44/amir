/**
 * Small themed building blocks used across screens.
 */
import { ScrollView, StyleSheet, Text, type TextProps, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TxtVariant = 'display' | 'title' | 'body' | 'label' | 'hebrew' | 'mono';

export function Txt({
  variant = 'body',
  style,
  ...rest
}: TextProps & { variant?: TxtVariant }) {
  const { c, fonts } = useTheme();
  const base = {
    display: { fontFamily: fonts.display ?? fonts.serif, fontSize: 28, color: c.text, fontWeight: '700' as const },
    title: { fontFamily: fonts.serif, fontSize: 20, color: c.text, fontWeight: '600' as const },
    body: { fontFamily: fonts.sans, fontSize: 16, color: c.text },
    label: { fontFamily: fonts.sans, fontSize: 12, color: c.textSecondary, letterSpacing: 1, textTransform: 'uppercase' as const },
    hebrew: { fontFamily: fonts.hebrew ?? fonts.serif, fontSize: 24, color: c.text, writingDirection: 'rtl' as const },
    mono: { fontFamily: fonts.mono, fontSize: 14, color: c.textSecondary },
  }[variant];
  return <Text style={[base, style]} {...rest} />;
}

export function Card({ style, ...rest }: ViewProps) {
  const { c, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: 16,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** Page shell: safe-area, themed background, centered max-width column, scrollable. */
export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { c } = useTheme();
  const Inner = (
    <View style={styles.column}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {Inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{Inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 16 },
});
