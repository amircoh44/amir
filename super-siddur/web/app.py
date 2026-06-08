"""Server-rendered siddur (Flask) — human-readable slug URLs.

Routes
  /                                          home: choose a nusach
  /siddur/<nusach>                           services in that nusach
  /siddur/<nusach>/<service>                 prayers (sections) in that service
  /siddur/<nusach>/<service>/<prayer>        one prayer, rendered server-side

This is the front-end rewrite (replacing the client-side JS app) for the siddur
reading flow. Other views (Tehillim, zmanim, compass, settings, the marketplace
UI) follow the same pattern and are layered on next.
"""
from __future__ import annotations

import datetime as dt

from flask import Flask, abort, redirect, render_template, request, url_for

from . import astro
from . import tehillim as teh
from .data import NUSACH_LABELS, build_index

app = Flask(__name__)
INDEX = build_index()

# Quick-pick locations for the zmanim / kotel forms (name, lat, lng, tz)
CITIES = [
    ("Jerusalem", 31.7683, 35.2137, "Asia/Jerusalem"),
    ("Bnei Brak", 32.0807, 34.8338, "Asia/Jerusalem"),
    ("New York", 40.7128, -74.0060, "America/New_York"),
    ("Lakewood", 40.0978, -74.2176, "America/New_York"),
    ("Los Angeles", 34.0522, -118.2437, "America/Los_Angeles"),
    ("London", 51.5074, -0.1278, "Europe/London"),
]


def _nusach_or_404(nusach: str) -> dict:
    svcs = INDEX.get(nusach)
    if not svcs:
        abort(404)
    return svcs


def _label(nusach: str) -> str:
    return NUSACH_LABELS.get(nusach, nusach.title())


@app.context_processor
def _globals():
    return {"nusach_label": _label}


@app.route("/")
def home():
    nusachot = [(n, _label(n)) for n in INDEX]
    return render_template("home.html", nusachot=nusachot)


@app.route("/siddur/<nusach>")
def nusach(nusach):
    svcs = _nusach_or_404(nusach)
    services = [(svc["slug"], svc["name"]) for svc in svcs.values()]
    return render_template("nusach.html", nusach=nusach, services=services)


@app.route("/siddur/<nusach>/<service>")
def service(nusach, service):
    svc = _nusach_or_404(nusach).get(service)
    if not svc:
        abort(404)
    return render_template("service.html", nusach=nusach, svc=svc)


@app.route("/siddur/<nusach>/<service>/<prayer>")
def prayer(nusach, service, prayer):
    svc = _nusach_or_404(nusach).get(service)
    if not svc:
        abort(404)
    sec = svc["by_slug"].get(prayer)
    if not sec:
        abort(404)
    order = [s["slug"] for s in svc["sections"]]
    pos = order.index(prayer)
    prev_s = svc["sections"][pos - 1] if pos > 0 else None
    next_s = svc["sections"][pos + 1] if pos < len(order) - 1 else None
    return render_template("prayer.html", nusach=nusach, svc=svc, sec=sec,
                           prev=prev_s, next=next_s)


@app.route("/tehillim")
def tehillim_index():
    return render_template("tehillim_index.html", books=teh.BOOKS,
                           embedded=sorted(teh.EMBED), total=150)


@app.route("/tehillim/<int:n>")
def tehillim_chapter(n):
    if n < 1 or n > 150:
        abort(404)
    return render_template("tehillim.html", n=n, verses=teh.verses(n),
                           book=teh.book_of(n), embedded=teh.is_embedded(n),
                           prev=(n - 1 if n > 1 else None),
                           next=(n + 1 if n < 150 else None))


def _loc_from_args(default_name, dlat, dlng, dtz):
    a = request.args
    try:
        lat, lng = float(a.get("lat", dlat)), float(a.get("lng", dlng))
    except ValueError:
        lat, lng = dlat, dlng
    return a.get("name", default_name), lat, lng, a.get("tz", dtz)


@app.route("/zmanim")
def zmanim():
    name, lat, lng, tz = _loc_from_args("Jerusalem", 31.7683, 35.2137, "Asia/Jerusalem")
    try:
        date = dt.date.fromisoformat(request.args["date"]) if request.args.get("date") else dt.date.today()
    except ValueError:
        date = dt.date.today()
    z = astro.zmanim(lat, lng, tz, date)
    rows = [(label, astro.hm_fmt(z.get(key)) if z else "—") for key, label in astro.ZMAN_LABELS]
    now_min = astro.now_in_tz_min(tz)
    hal = astro.halachic_state(z, now_min) if z else None
    return render_template("zmanim.html", rows=rows, name=name, lat=lat, lng=lng, tz=tz,
                           date=date.isoformat(), cities=CITIES, hal=hal,
                           now_hm=astro.hm_fmt(now_min, "24"), now_min=round(now_min, 3))


@app.route("/kotel")
def kotel():
    name, lat, lng, _tz = _loc_from_args("New York", 40.7128, -74.0060, "America/New_York")
    b = astro.bearing_to_kotel(lat, lng)
    return render_template("kotel.html", bearing=round(b, 1), compass=astro.compass_label(b),
                           name=name, lat=lat, lng=lng, cities=CITIES)


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5001)
