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

from flask import Flask, abort, redirect, render_template, url_for

from .data import NUSACH_LABELS, build_index

app = Flask(__name__)
INDEX = build_index()


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


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True, port=5001)
