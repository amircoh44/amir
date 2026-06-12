import { BP, Colors, Fonts, Gradients, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeNameCtx } from '@/store/theme-controller';

export function useTheme() {
  // Prefer the user's resolved preference; fall back to the OS scheme (default
  // dark — OLED + battery friendly) when used outside the controller.
  const ctxName = useThemeNameCtx();
  const sys = useColorScheme();
  const name = ctxName ?? (sys === 'light' ? 'light' : 'dark');
  return { c: Colors[name], name, fonts: Fonts, gradients: Gradients, spacing: Spacing, radius: Radius, bp: BP };
}
