/**
 * Resolves the active theme name from the user's preference (auto/light/dark)
 * and the OS color scheme, and exposes it via context. Defaults to dark (OLED,
 * battery-friendly) when "auto" and the OS is dark or unspecified.
 */
import { createContext, useContext } from 'react';

import type { ThemeName } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettings } from '@/store/settings';

const Ctx = createContext<ThemeName | null>(null);

export function ThemeControllerProvider({ children }: { children: React.ReactNode }) {
  const { themePref } = useSettings();
  const sys = useColorScheme();
  const name: ThemeName = themePref === 'auto' ? (sys === 'light' ? 'light' : 'dark') : themePref;
  return <Ctx.Provider value={name}>{children}</Ctx.Provider>;
}

/** Resolved theme name, or null when used outside the provider. */
export function useThemeNameCtx(): ThemeName | null {
  return useContext(Ctx);
}
