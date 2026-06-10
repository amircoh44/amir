/**
 * Halachic ("zmanit") clock math.
 *
 * A halachic hour (sha'ah zmanit) is 1/12 of the daylight period, and a halachic
 * minute (da'kah zmanit) is 1/60 of that hour. We take the day as alot ha-shachar
 * → tzeit ha-kochavim (falling back to sunrise→sunset if dawn/nightfall can't be
 * computed at extreme latitudes), exactly as requested. At night the period flips
 * to tzeit → next-day alot.
 *
 * All inputs/outputs are "minutes after local midnight"; pure functions only.
 */
import type { Zmanim } from './engine';

export interface HalState {
  /** Are we in the daytime period or the nighttime period? */
  phase: 'day' | 'night';
  /** Length of one halachic hour, in real minutes. */
  shaahMin: number;
  /** Length of one halachic minute (da'kah zmanit), in real minutes. */
  dakahMin: number;
  /** Current halachic hour within the period, 0–11. */
  halHour: number;
  /** Current halachic minute within the hour, 0–59. */
  halMin: number;
  /** Fraction through the current period, 0..1 (drives the analog hand). */
  frac: number;
  /** Real-minute bounds of the active period (end may exceed 1440 at night). */
  startMin: number;
  endMin: number;
}

/** Pick the day window: prefer alot→tzeit, else sunrise→sunset. */
function dayWindow(z: Zmanim): { start: number; end: number } | null {
  const start = z.alot ?? z.netz;
  const end = z.tzeit ?? z.shkia;
  if (start == null || end == null) return null;
  return { start, end };
}

/**
 * Compute the halachic-clock state for `nowMin`.
 * `zToday` is today's zmanim; `zAdj` is the adjacent day's zmanim used to bound
 * the night period (yesterday's tzeit before dawn, or tomorrow's alot after).
 */
export function halState(nowMin: number, zToday: Zmanim, zAdj?: Zmanim): HalState | null {
  const win = dayWindow(zToday);
  if (!win) return null;
  const { start: dayStart, end: dayEnd } = win;

  // Daytime.
  if (nowMin >= dayStart && nowMin < dayEnd) {
    const period = dayEnd - dayStart;
    return build('day', nowMin - dayStart, period, dayStart, dayEnd);
  }

  // Nighttime — before dawn (belongs to the night that started yesterday).
  if (nowMin < dayStart) {
    const prevEnd = zAdj ? dayWindow(zAdj)?.end ?? null : null;
    const start = (prevEnd ?? dayEnd) - 1440; // yesterday's tzeit, mapped before midnight
    const period = dayStart - start;
    return build('night', nowMin - start, period, start, dayStart);
  }

  // Nighttime — after nightfall (night runs to tomorrow's dawn).
  const nextStart = zAdj ? dayWindow(zAdj)?.start ?? null : null;
  const end = (nextStart ?? dayStart) + 1440;
  const period = end - dayEnd;
  return build('night', nowMin - dayEnd, period, dayEnd, end);
}

function build(
  phase: 'day' | 'night',
  elapsed: number,
  period: number,
  startMin: number,
  endMin: number,
): HalState {
  const shaahMin = period / 12;
  const dakahMin = shaahMin / 60;
  const clamped = Math.max(0, Math.min(period, elapsed));
  let halHour = Math.floor(clamped / shaahMin);
  if (halHour > 11) halHour = 11;
  const within = clamped - halHour * shaahMin;
  let halMin = Math.floor(within / dakahMin);
  if (halMin > 59) halMin = 59;
  return {
    phase,
    shaahMin,
    dakahMin,
    halHour,
    halMin,
    frac: clamped / period,
    startMin,
    endMin,
  };
}

/** Format a halachic time as "H:MM" (1–12 hour, like a clock face). */
export function halTimeFmt(h: HalState): string {
  const hr = h.halHour === 0 ? 12 : h.halHour;
  return `${hr}:${String(h.halMin).padStart(2, '0')}`;
}
