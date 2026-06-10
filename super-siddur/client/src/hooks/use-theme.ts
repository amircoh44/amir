/**
 * Theme hook — returns the active palette plus the scheme name and shared tokens.
 */
import { BP, Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // Default to the OLED dark theme (futuristic + battery saving); honor an
  // explicit light preference.
  const name = scheme === 'light' ? 'light' : 'dark';
  return { c: Colors[name], name, fonts: Fonts, gradients: Gradients, spacing: Spacing, radius: Radius, bp: BP };
}
