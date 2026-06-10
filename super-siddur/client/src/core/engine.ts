/**
 * The Super Siddur — core engine (platform-agnostic, no DOM / React Native safe).
 *
 * Ported from the original vanilla-JS engine: Hebrew calendar, real astronomical
 * zmanim, gematria, and the city database. Pure functions only, so this module is
 * shared verbatim across iOS, Android, and Web (and is unit-testable in Node).
 */

export interface Loc {
  name?: string;
  lat: number;
  lng: number;
  tz?: string;
}

export interface HebDate {
  year: number;
  month: number;
  day: number;
}

/** All zmanim are minutes-after-midnight in the location's local timezone. */
export interface Zmanim {
  alot: number | null;
  netz: number | null;
  shma: number | null;
  tefila: number | null;
  chatzot: number | null;
  minchaG: number | null;
  minchaK: number | null;
  plag: number | null;
  shkia: number | null;
  tzeit: number | null;
}

/* ====== HEBREW CALENDAR ENGINE ====== */
const HEB_EPOCH = -1373427;

export const HMONTHS = [
  'Nissan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar', 'Adar II',
];
export const HMONTHS_HE = [
  'נִיסָן', 'אִיָּר', 'סִיוָן', 'תַמּוּז', 'אָב', 'אֱלוּל',
  'תִשְׁרֵי', 'חֶשְׁוָן', 'כִּסְלֵו', 'טֵבֵת', 'שְׁבָט', 'אֲדָר', "אֲדָר ב'",
];

function gLeap(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}
function gRD(y: number, m: number, d: number): number {
  return (
    365 * (y - 1) +
    Math.floor((y - 1) / 4) -
    Math.floor((y - 1) / 100) +
    Math.floor((y - 1) / 400) +
    Math.floor((367 * m - 362) / 12) +
    (m <= 2 ? 0 : gLeap(y) ? -1 : -2) +
    d
  );
}
export function hLeap(y: number): boolean {
  return (7 * y + 1) % 19 < 7;
}
function lastMonthH(y: number): number {
  return hLeap(y) ? 13 : 12;
}
function hElapsed(y: number): number {
  const m = Math.floor((235 * y - 234) / 19);
  const p = 12084 + 13753 * m;
  const d = m * 29 + Math.floor(p / 25920);
  return (3 * (d + 1)) % 7 < 3 ? d + 1 : d;
}
function hDelay(y: number): number {
  const a = hElapsed(y - 1), b = hElapsed(y), c = hElapsed(y + 1);
  if (c - b === 356) return 2;
  if (b - a === 382) return 1;
  return 0;
}
function hNewYear(y: number): number {
  return HEB_EPOCH + hElapsed(y) + hDelay(y);
}
function daysInHY(y: number): number {
  return hNewYear(y + 1) - hNewYear(y);
}
function longCheshvan(y: number): boolean {
  return daysInHY(y) % 10 === 5;
}
function shortKislev(y: number): boolean {
  return daysInHY(y) % 10 === 3;
}
function lastDayH(m: number, y: number): number {
  if ([2, 4, 6, 10, 13].includes(m)) return 29;
  if (m === 12 && !hLeap(y)) return 29;
  if (m === 8 && !longCheshvan(y)) return 29;
  if (m === 9 && shortKislev(y)) return 29;
  return 30;
}
function hRD(y: number, mo: number, d: number): number {
  let rd = hNewYear(y) + d - 1;
  if (mo < 7) {
    const lm = lastMonthH(y);
    for (let m = 7; m <= lm; m++) rd += lastDayH(m, y);
    for (let m = 1; m < mo; m++) rd += lastDayH(m, y);
  } else {
    for (let m = 7; m < mo; m++) rd += lastDayH(m, y);
  }
  return rd;
}
function hFromRD(rd: number): HebDate {
  let y = Math.floor((rd - HEB_EPOCH) / 366);
  while (hNewYear(y + 1) <= rd) y++;
  let m = rd < hRD(y, 1, 1) ? 7 : 1;
  while (rd > hRD(y, m, lastDayH(m, y))) m++;
  return { year: y, month: m, day: rd - hRD(y, m, 1) + 1 };
}
export function todayHeb(d?: Date): HebDate {
  d = d || new Date();
  return hFromRD(gRD(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}
export function monthHe(m: number, y: number): string {
  return m === 12 && hLeap(y) ? "אֲדָר א'" : HMONTHS_HE[m - 1];
}
export function gematria(n: number): string {
  if (n <= 0) return '';
  const o = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const t = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hu = ['', 'ק', 'ר', 'ש', 'ת'];
  if (n === 15) return 'טו';
  if (n === 16) return 'טז';
  if (n > 400) {
    let s = '', r = n;
    while (r >= 400) { s += 'ת'; r -= 400; }
    return s + gematria(r);
  }
  const h = Math.floor(n / 100), tt = Math.floor((n % 100) / 10), oo = n % 10;
  return (hu[h] || '') + (t[tt] || '') + (o[oo] || '');
}

/* ====== ZMANIM (astronomical, real) ====== */
function julianDay(d: Date): number {
  const y = d.getFullYear(), m = d.getMonth() + 1, dy = d.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    dy + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  );
}
interface SolarBase { Jtran: number; delta: number; lat: number; }
function solarBase(date: Date, lat: number, lng: number): SolarBase {
  const n = julianDay(date) - 2451545.0 + 0.0008;
  const Jstar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;
  const Mr = (M * Math.PI) / 180;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lam = (M + C + 180 + 102.9372) % 360;
  const lamR = (lam * Math.PI) / 180;
  const Jtran = 2451545 + Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lamR);
  const delta = Math.asin(Math.sin(lamR) * Math.sin((23.44 * Math.PI) / 180));
  return { Jtran, delta, lat };
}
function haFor(deg: number, b: SolarBase): number | null {
  const phi = (b.lat * Math.PI) / 180;
  const aR = (deg * Math.PI) / 180;
  const cosH = (Math.sin(aR) - Math.sin(phi) * Math.sin(b.delta)) / (Math.cos(phi) * Math.cos(b.delta));
  if (cosH < -1 || cosH > 1) return null;
  return (Math.acos(cosH) * 180) / Math.PI;
}
export function tzForLoc(loc?: Loc): string {
  if (!loc) return Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (loc.tz) return loc.tz;
  const n = (loc.name || '').toLowerCase();
  if (/denver|colorado/.test(n)) return 'America/Denver';
  if (/jerusalem|tel aviv|israel|bnei brak|haifa|yerushalayim/.test(n)) return 'Asia/Jerusalem';
  if (/new york|brooklyn|lakewood|crown heights|miami|monsey/.test(n)) return 'America/New_York';
  if (/los angeles/.test(n)) return 'America/Los_Angeles';
  if (/houston|chicago|dallas/.test(n)) return 'America/Chicago';
  if (/london|manchester/.test(n)) return 'Europe/London';
  if (/toronto/.test(n)) return 'America/Toronto';
  if (/phoenix/.test(n)) return 'America/Phoenix';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
function jdToLocalMin(jd: number | null, tz: string): number | null {
  if (jd == null) return null;
  const utcMs = (jd - 2440587.5) * 86400000;
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(utcMs));
    return (
      +(p.find((x) => x.type === 'hour')!.value) * 60 +
      +(p.find((x) => x.type === 'minute')!.value)
    );
  } catch {
    return null;
  }
}
export function computeZmanim(date: Date, loc: Loc): Zmanim | null {
  const b = solarBase(date, loc.lat, loc.lng);
  const sHA = haFor(-0.833, b);
  if (!sHA) return null;
  const dHA = haFor(-16.1, b);
  const tHA = haFor(-8.5, b);
  const Jn = b.Jtran;
  const Jr = Jn - sHA / 360, Js = Jn + sHA / 360;
  const tz = tzForLoc(loc);
  const r = jdToLocalMin(Jr, tz), s = jdToLocalMin(Js, tz);
  if (r == null || s == null) return null;
  let day = s - r;
  if (day < 0) day += 1440;
  const sha = day / 12;
  return {
    alot: jdToLocalMin(dHA ? Jn - dHA / 360 : null, tz),
    netz: r,
    shma: r + sha * 3,
    tefila: r + sha * 4,
    chatzot: jdToLocalMin(Jn, tz),
    minchaG: r + sha * 6.5,
    minchaK: r + sha * 9.5,
    plag: r + sha * 10.75,
    shkia: s,
    tzeit: jdToLocalMin(tHA ? Jn + tHA / 360 : null, tz),
  };
}
export function nowInLocTz(loc?: Loc): number {
  const tz = tzForLoc(loc);
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    return (
      +(p.find((x) => x.type === 'hour')!.value) * 60 +
      +(p.find((x) => x.type === 'minute')!.value)
    );
  } catch {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }
}
export function hmFmt(t: number | null, fmt: '12' | '24' = '12'): string {
  if (t == null || isNaN(t)) return '—';
  const T = Math.round(t);
  const h = Math.floor(T / 60) % 24;
  const mm = String(T % 60).padStart(2, '0');
  if (fmt === '24') return h + ':' + mm;
  const ap = h < 12 ? 'AM' : 'PM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return h12 + ':' + mm + ' ' + ap;
}
export function gregToHeb(y: number, m: number, d: number): HebDate {
  return hFromRD(gRD(y, m, d));
}
export function computeHebAge(b?: HebDate): number | null {
  if (!b) return null;
  const t = todayHeb();
  let a = t.year - b.year;
  if (t.month < b.month || (t.month === b.month && t.day < b.day)) a -= 1;
  return a;
}
export function omerCount(d?: Date): number {
  const h = todayHeb(d || new Date());
  if (h.month === 1 && h.day >= 16) return h.day - 15;
  if (h.month === 2) return 15 + h.day;
  if (h.month === 3 && h.day <= 5) return 44 + h.day;
  return 0;
}

/* ====== CITY DATABASE ====== */
export const CITIES: Loc[] = [
  { name: 'Denver, CO', lat: 39.7392, lng: -104.9903, tz: 'America/Denver' },
  { name: 'Jerusalem', lat: 31.7683, lng: 35.2137, tz: 'Asia/Jerusalem' },
  { name: 'Bnei Brak', lat: 32.0838, lng: 34.8338, tz: 'Asia/Jerusalem' },
  { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818, tz: 'Asia/Jerusalem' },
  { name: 'Haifa', lat: 32.794, lng: 34.9896, tz: 'Asia/Jerusalem' },
  { name: 'Beit Shemesh', lat: 31.7497, lng: 34.9886, tz: 'Asia/Jerusalem' },
  { name: 'Tzfat', lat: 32.9646, lng: 35.496, tz: 'Asia/Jerusalem' },
  { name: 'New York, NY', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  { name: 'Brooklyn, NY', lat: 40.6782, lng: -73.9442, tz: 'America/New_York' },
  { name: 'Lakewood, NJ', lat: 40.0978, lng: -74.2176, tz: 'America/New_York' },
  { name: 'Monsey, NY', lat: 41.1112, lng: -74.0682, tz: 'America/New_York' },
  { name: 'Miami, FL', lat: 25.7617, lng: -80.1918, tz: 'America/New_York' },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
  { name: 'Houston, TX', lat: 29.7604, lng: -95.3698, tz: 'America/Chicago' },
  { name: 'Dallas, TX', lat: 32.7767, lng: -96.797, tz: 'America/Chicago' },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.074, tz: 'America/Phoenix' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
  { name: 'Montreal', lat: 45.5019, lng: -73.5674, tz: 'America/Toronto' },
  { name: 'London', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { name: 'Manchester, UK', lat: 53.4808, lng: -2.2426, tz: 'Europe/London' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  { name: 'Antwerp', lat: 51.2194, lng: 4.4025, tz: 'Europe/Brussels' },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631, tz: 'Australia/Melbourne' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, tz: 'Africa/Johannesburg' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, tz: 'America/Argentina/Buenos_Aires' },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City' },
];

/** Hebrew names of the zmanim, in halachic order, with English labels. */
export const ZMANIM_ORDER: { key: keyof Zmanim; en: string; he: string }[] = [
  { key: 'alot', en: 'Dawn', he: 'עֲלוֹת הַשַּׁחַר' },
  { key: 'netz', en: 'Sunrise', he: 'הָנֵץ הַחַמָּה' },
  { key: 'shma', en: 'Latest Shema', he: 'סוֹף זְמַן שְׁמַע' },
  { key: 'tefila', en: 'Latest Shacharit', he: 'סוֹף זְמַן תְּפִלָּה' },
  { key: 'chatzot', en: 'Midday', he: 'חֲצוֹת הַיּוֹם' },
  { key: 'minchaG', en: 'Earliest Mincha', he: 'מִנְחָה גְּדוֹלָה' },
  { key: 'minchaK', en: 'Mincha Ketana', he: 'מִנְחָה קְטַנָּה' },
  { key: 'plag', en: 'Plag HaMincha', he: 'פְּלַג הַמִּנְחָה' },
  { key: 'shkia', en: 'Sunset', he: 'שְׁקִיעַת הַחַמָּה' },
  { key: 'tzeit', en: 'Nightfall', he: 'צֵאת הַכּוֹכָבִים' },
];
