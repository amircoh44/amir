"""Siddur content loader for the server-rendered app.

Reads the bundled prayer text (window.TEXTDATA from the frontend bundle) and
builds a nusach → service → section index, assigning a unique slug to every
service and prayer section so the routes can use human-readable URLs.
"""
from __future__ import annotations

import json
from pathlib import Path

from .slugs import slugify

# textdata.js lives in the original frontend bundle
_TEXTDATA = Path(__file__).resolve().parent.parent / "public" / "js" / "textdata.js"

NUSACH_LABELS = {
    "ashkenaz": "Ashkenaz",
    "sefard": "Sefard",
    "edot": "Edot HaMizrach",
    "chabad": "Chabad",
}

# Nicer English titles for known services (fallback: the doc's own `service`).
SERVICE_TITLES = {
    "shacharit": "Shacharit", "mincha": "Mincha", "maariv": "Maariv",
    "birkat": "Birkat HaMazon", "krias": "Krias Shema al HaMita",
    "torah": "Torah Reading",
}


def load_docs() -> list:
    src = _TEXTDATA.read_text(encoding="utf-8")
    a, b = src.find("["), src.rfind("]")
    if a < 0 or b < 0:
        return []
    try:
        return json.loads(src[a:b + 1])
    except json.JSONDecodeError:
        return []


def build_index() -> dict:
    """nusach -> { svcId -> {svcId,name,slug,sections,by_slug} }."""
    idx: dict = {}
    for d in load_docs():
        nus, svc = d.get("nusach"), d.get("svcId")
        if not nus or not svc:
            continue
        name = SERVICE_TITLES.get(svc) or d.get("service") or svc
        sections, used = [], set()
        for si, sec in enumerate(d.get("sections", [])):
            header = (sec.get("header") or "").strip() or name
            base = slugify(header, fallback=f"section-{si + 1}")
            slug, k = base, 2
            while slug in used:
                slug, k = f"{base}-{k}", k + 1
            used.add(slug)
            sections.append({"slug": slug, "header": header, "pos": si,
                             "blocks": sec.get("blocks", [])})
        idx.setdefault(nus, {})[svc] = {
            "svcId": svc, "name": name, "slug": svc,
            "sections": sections, "by_slug": {s["slug"]: s for s in sections},
        }
    return idx
