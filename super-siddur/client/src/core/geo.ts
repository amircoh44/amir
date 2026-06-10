/** Great-circle bearing & distance — used by the Kotel compass. Pure math. */
import type { Loc } from './engine';

/** The Kotel (Western Wall), Jerusalem — the direction of prayer. */
export const KOTEL: Loc = { name: 'The Kotel', lat: 31.7767, lng: 35.2345, tz: 'Asia/Jerusalem' };

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Initial bearing (degrees, 0=N clockwise) from `from` toward `to`. */
export function bearing(from: Loc, to: Loc): number {
  const φ1 = toRad(from.lat), φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Great-circle distance in kilometres. */
export function distanceKm(from: Loc, to: Loc): number {
  const R = 6371;
  const φ1 = toRad(from.lat), φ2 = toRad(to.lat);
  const Δφ = toRad(to.lat - from.lat), Δλ = toRad(to.lng - from.lng);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function compassPoint(deg: number): string {
  return COMPASS_POINTS[Math.round(deg / 45) % 8];
}
