"""Zmanim (halachic times) and the bearing to the Kotel — ported from the
frontend's 00-engine.js so the server can render them with no client JS.
Pure math + stdlib timezone handling (zoneinfo).
"""
from __future__ import annotations

import datetime as dt
import math
from zoneinfo import ZoneInfo

KOTEL_LAT, KOTEL_LNG = 31.7767, 35.2345  # Western Wall


def julian_day(d: dt.date) -> int:
    y, m, dy = d.year, d.month, d.day
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return dy + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


def _solar_base(date: dt.date, lat: float, lng: float):
    n = julian_day(date) - 2451545.0 + 0.0008
    jstar = n - lng / 360
    M = (357.5291 + 0.98560028 * jstar) % 360
    Mr = math.radians(M)
    C = 1.9148 * math.sin(Mr) + 0.0200 * math.sin(2 * Mr) + 0.0003 * math.sin(3 * Mr)
    lam = (M + C + 180 + 102.9372) % 360
    lamr = math.radians(lam)
    jtran = 2451545 + jstar + 0.0053 * math.sin(Mr) - 0.0069 * math.sin(2 * lamr)
    delta = math.asin(math.sin(lamr) * math.sin(math.radians(23.44)))
    return jtran, delta


def _ha(deg: float, delta: float, lat: float):
    phi = math.radians(lat)
    ar = math.radians(deg)
    denom = math.cos(phi) * math.cos(delta)
    if denom == 0:
        return None
    cos_h = (math.sin(ar) - math.sin(phi) * math.sin(delta)) / denom
    if cos_h < -1 or cos_h > 1:
        return None
    return math.degrees(math.acos(cos_h))


def _jd_to_local_min(jd, tz: str):
    if jd is None:
        return None
    utc = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(seconds=(jd - 2440587.5) * 86400)
    try:
        loc = utc.astimezone(ZoneInfo(tz))
    except Exception:
        return None
    return loc.hour * 60 + loc.minute


# order + display labels for the template
ZMAN_LABELS = [
    ("alot", "Dawn (Alot HaShachar)"), ("netz", "Sunrise (Netz)"),
    ("shma", "Latest Shema"), ("tefila", "Latest Shacharit"),
    ("chatzot", "Midday (Chatzot)"), ("minchaG", "Earliest Mincha (Gedolah)"),
    ("minchaK", "Mincha Ketana"), ("plag", "Plag HaMincha"),
    ("shkia", "Sunset (Shkia)"), ("tzeit", "Nightfall (Tzeit)"),
]


def zmanim(lat: float, lng: float, tz: str, date: dt.date) -> dict | None:
    jtran, delta = _solar_base(date, lat, lng)
    s_ha = _ha(-0.833, delta, lat)
    if s_ha is None:
        return None
    d_ha = _ha(-16.1, delta, lat)
    t_ha = _ha(-8.5, delta, lat)
    jn = jtran
    r = _jd_to_local_min(jn - s_ha / 360, tz)
    s = _jd_to_local_min(jn + s_ha / 360, tz)
    if r is None or s is None:
        return None
    day = s - r
    if day < 0:
        day += 1440
    sha = day / 12
    return {
        "alot": _jd_to_local_min(jn - d_ha / 360, tz) if d_ha else None,
        "netz": r, "shma": r + sha * 3, "tefila": r + sha * 4,
        "chatzot": _jd_to_local_min(jn, tz),
        "minchaG": r + sha * 6.5, "minchaK": r + sha * 9.5, "plag": r + sha * 10.75,
        "shkia": s, "tzeit": _jd_to_local_min(jn + t_ha / 360, tz) if t_ha else None,
    }


def bearing_to_kotel(lat: float, lng: float) -> float:
    phi1 = math.radians(lat)
    phi2 = math.radians(KOTEL_LAT)
    dlam = math.radians(KOTEL_LNG - lng)
    y = math.sin(dlam) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlam)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def hm_fmt(t, fmt: str = "12") -> str:
    if t is None:
        return "—"
    t = round(t)
    h = (t // 60) % 24
    mm = t % 60
    if fmt == "24":
        return f"{h}:{mm:02d}"
    ap = "AM" if h < 12 else "PM"
    h12 = h % 12 or 12
    return f"{h12}:{mm:02d} {ap}"


def now_in_tz_min(tz: str) -> float:
    """Current minutes-since-midnight (with seconds) in the location's timezone."""
    try:
        n = dt.datetime.now(ZoneInfo(tz))
    except Exception:
        n = dt.datetime.now()
    return n.hour * 60 + n.minute + n.second / 60.0


def halachic_state(z: dict, now_min: float) -> dict | None:
    """Sha'ah zmanit (halachic hour) and da'kah zmanit (halachic minute = hour/60),
    plus the current halachic position used to drive the clock hands.

    Day is divided into 12 sha'ot from sunrise→sunset (GRA); night likewise from
    sunset→sunrise. The minute hand advances one da'kah zmanit at a time, so it
    completes a full revolution each sha'ah zmanit.
    """
    netz, shkia = z.get("netz"), z.get("shkia")
    if netz is None or shkia is None or shkia <= netz:
        return None
    day_len = shkia - netz
    night_len = 1440 - day_len
    shaah_day = day_len / 12.0
    shaah_night = night_len / 12.0

    if netz <= now_min < shkia:
        period, shaah, elapsed = "day", shaah_day, now_min - netz
    else:
        period, shaah = "night", shaah_night
        elapsed = (now_min - shkia) if now_min >= shkia else (now_min + 1440 - shkia)

    hours = max(0.0, min(12.0, elapsed / shaah)) if shaah else 0.0
    hour_num = min(12, int(hours) + 1)
    minutes_into = (hours - int(hours)) * 60.0  # da'kot into the current sha'ah
    return {
        "shaah_day_min": shaah_day, "shaah_night_min": shaah_night,
        "dakah_day_min": shaah_day / 60.0, "dakah_night_min": shaah_night / 60.0,
        "period": period, "shaah_cur_min": shaah, "dakah_cur_min": shaah / 60.0,
        "hours": hours, "hour_num": hour_num, "minutes_into": minutes_into,
        "netz": netz, "shkia": shkia,
    }


def compass_label(deg: float) -> str:
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW",
            "WSW", "W", "WNW", "NW", "NNW"]
    return dirs[round(deg / 22.5) % 16]
