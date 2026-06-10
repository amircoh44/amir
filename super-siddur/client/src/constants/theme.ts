/**
 * The Super Siddur — warm parchment & gold theme.
 * Shared design tokens for every platform.
 */
import { Platform } from 'react-native';

const gold = '#c79a4b';
const goldBright = '#dcb45e';

export const Colors = {
  light: {
    text: '#2b2317',
    textSecondary: '#6b6149',
    background: '#f7f1e3',
    surface: '#fffaf0',
    surface2: '#f0e7d2',
    line: '#e2d6ba',
    accent: gold,
    accentBright: goldBright,
    tabBar: '#fffaf0',
    tabInactive: '#a99e82',
  },
  dark: {
    text: '#f3e9d2',
    textSecondary: '#b6a784',
    background: '#0f0c07',
    surface: '#1a140b',
    surface2: '#241b0f',
    line: '#3a2e1a',
    accent: goldBright,
    accentBright: '#f0d089',
    tabBar: '#15100a',
    tabInactive: '#7a6d52',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    hebrew: 'system-ui',
    display: 'ui-serif',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
    hebrew: 'serif',
    display: 'serif',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    hebrew: 'serif',
    display: 'serif',
  },
  web: {
    sans: "'Inter','Segoe UI',system-ui,sans-serif",
    serif: "'Cormorant Garamond','Frank Ruhl Libre',Georgia,serif",
    rounded: "'Inter',system-ui,sans-serif",
    mono: "'JetBrains Mono',ui-monospace,monospace",
    hebrew: "'Frank Ruhl Libre','Times New Roman',serif",
    display: "'Cinzel',Georgia,serif",
  },
})!;

export const Spacing = {
  half: 2, one: 4, two: 8, three: 12, four: 16, five: 24, six: 32, eight: 48,
} as const;

export const Radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const MaxContentWidth = 820;
