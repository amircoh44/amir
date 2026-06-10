/**
 * Theme hook — returns the active palette plus the scheme name and shared tokens.
 */
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  const name = scheme === 'dark' ? 'dark' : 'light';
  return { c: Colors[name], name, fonts: Fonts, spacing: Spacing, radius: Radius };
}
