/**
 * The Super Siddur — 2026 "Midnight & Gold" design system.
 *
 * Futuristic, OLED-friendly. The dark theme uses true black (#000) so that on
 * AMOLED phones unlit pixels are genuinely off — the single biggest display
 * battery win — paired with a luminous gold and a deep indigo for depth. Glass
 * surfaces are faked with translucency + gradient hairlines + soft glow rather
 * than GPU blur, so the look is premium without draining the battery.
 */
import { Platform } from 'react-native';

const gold = '#e7b955';
const goldSoft = '#caa24a';
const indigo = '#6c5cff';
const cyan = '#39d0d8';

export const Colors = {
  dark: {
    // true black base for OLED battery saving
    background: '#000000',
    backgroundElevated: '#07070b',
    surface: 'rgba(255,255,255,0.045)',
    surfaceStrong: 'rgba(255,255,255,0.08)',
    surface2: 'rgba(231,185,85,0.06)',
    line: 'rgba(255,255,255,0.10)',
    lineStrong: 'rgba(231,185,85,0.30)',
    text: '#f5efe1',
    textSecondary: '#9a927f',
    textFaint: '#5c5749',
    accent: gold,
    accentSoft: goldSoft,
    indigo,
    cyan,
    glow: gold,
    navBar: 'rgba(7,7,11,0.86)',
    tabInactive: '#6b6553',
  },
  light: {
    background: '#f4eedf',
    backgroundElevated: '#fbf6ea',
    surface: 'rgba(255,255,255,0.65)',
    surfaceStrong: 'rgba(255,255,255,0.9)',
    surface2: 'rgba(202,162,74,0.10)',
    line: 'rgba(43,35,23,0.10)',
    lineStrong: 'rgba(202,162,74,0.45)',
    text: '#241d12',
    textSecondary: '#6b6149',
    textFaint: '#a99e82',
    accent: '#b88a2e',
    accentSoft: goldSoft,
    indigo: '#5648d6',
    cyan: '#1f9aaa',
    glow: '#caa24a',
    navBar: 'rgba(251,246,234,0.86)',
    tabInactive: '#a99e82',
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.dark;

/** Brand gradient stops, reused across hero, clock ring, and active nav. */
export const Gradients = {
  gold: ['#f3d27a', '#e7b955', '#9a7322'] as const,
  aurora: ['#6c5cff', '#39d0d8'] as const,
  fade: ['rgba(231,185,85,0.18)', 'rgba(231,185,85,0)'] as const,
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace', hebrew: 'system-ui', display: 'ui-rounded' },
  android: { sans: 'sans-serif', serif: 'serif', rounded: 'sans-serif-medium', mono: 'monospace', hebrew: 'serif', display: 'sans-serif-medium' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace', hebrew: 'serif', display: 'serif' },
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
  half: 2, one: 4, two: 8, three: 12, four: 16, five: 24, six: 32, eight: 48, ten: 64,
} as const;

export const Radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

/** Responsive breakpoints (logical px). */
export const BP = { tablet: 720, desktop: 1024, wide: 1440 } as const;

/** Sidebar width on desktop. */
export const SIDEBAR_W = 248;
