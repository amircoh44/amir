"use strict";
/* Calendar glue: connects @hebcal/core (loaded as the `hebcal` global) to the app.
   Provides the Israel/Diaspora flag, sunset rollover (the Jewish day starts at
   nightfall), the location-correct weekly parasha, and today's holidays. */

function hbReady() { return typeof hebcal !== "undefined" && hebcal && hebcal.HebrewCalendar && hebcal.HDate; }
/* Israel (incl. Yerushalayim) keeps one day of Yom Tov; the diaspora keeps two.
   This flag also drives the parasha, which can differ between them. */
function ilFlag() { return state.israelMode === "israel" || state.israelMode === "yerushalayim"; }

/* True once the local sun has set — from then the halachic day is tomorrow. */
function afterSunset(loc) {
  loc = loc || state.loc; if (!loc) return false;
  const z = computeZmanim(new Date(), loc);
  if (!z || z.shkia == null) return false;
  return nowInLocTz(loc) >= z.shkia;
}
/* The date the app should treat as "today": rolls to the next civil day after sunset
   so the user sees the next Jewish day's date, parasha, and prayers in the evening. */
function appNow(loc) {
  const d = new Date();
  if (afterSunset(loc)) d.setDate(d.getDate() + 1);
  return d;
}
function appHebDate(loc) {
  const past = afterSunset(loc);
  return { date: appNow(loc), heb: todayHeb(appNow(loc)), afterSunset: past };
}

/* The parasha for the Shabbat on or after `refDate`, for the user's region.
   Returns {en, he} or null (e.g. on a festival Shabbat with no weekly sedra). */
function currentParasha(refDate) {
  if (!hbReady()) return null;
  try {
    const { HebrewCalendar, HDate, flags } = hebcal;
    const sat = new HDate(refDate || appNow()).onOrAfter(6); // 6 = Shabbat
    const evs = HebrewCalendar.calendar({ start: sat.greg(), end: sat.greg(), il: ilFlag(), sedrot: true, noHolidays: false });
    const p = evs.find((e) => e.getFlags() & flags.PARSHA_HASHAVUA);
    if (p) return { en: p.render("en"), he: p.render("he") };
    const f = evs[0];
    return f ? { en: f.render("en"), he: f.render("he") } : null;
  } catch (e) { return null; }
}

/* Holiday/observance events for a given day, region-aware (Yom Tov Sheni etc.). */
function holidaysFor(refDate) {
  if (!hbReady()) return [];
  try {
    const { HebrewCalendar } = hebcal;
    const d = refDate || appNow();
    return HebrewCalendar.calendar({ start: d, end: d, il: ilFlag(), sedrot: false, noHolidays: false })
      .map((e) => ({ en: e.render("en"), he: e.render("he") }));
  } catch (e) { return []; }
}

/* A tappable "this week's parasha" card for the home screen (null if unavailable). */
function parashaCard() {
  const p = currentParasha();
  if (!p) return null;
  const card = el("button", "");
  card.style.cssText = "display:flex;align-items:center;gap:.8rem;width:100%;margin-bottom:.45rem;padding:.75rem .9rem;background:var(--surface);border:1px solid var(--line);border-radius:.6rem;cursor:pointer;text-align:left";
  card.innerHTML = `<div style="flex:none;width:2.2rem;height:2.2rem;border-radius:.5rem;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);display:grid;place-items:center"><svg class="icon" viewBox="0 0 24 24" style="width:1.2em;height:1.2em"><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14"/><path d="M8 7h8M8 11h6"/></svg></div><div style="flex:1"><div style="font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:700">This week's parasha${ilFlag() ? " · Eretz Yisrael" : ""}</div><div style="font-size:1rem;font-weight:600;color:var(--ink)">${esc(p.en)} <span style="font-family:var(--hebrew);direction:rtl;color:var(--accent)">${esc(p.he)}</span></div></div>`;
  card.onclick = () => toast(p.en + " — " + p.he);
  return card;
}
