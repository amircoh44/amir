"""Tehillim (Psalms) text for the server-rendered app.

Reuses the embedded, vocalized psalms bundled in the frontend (10-data.js,
window.TEHILLIM_EMBED). Only a subset is embedded; the rest are fetched live
from Sefaria in production (the route falls back to a note when offline).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_SRC = Path(__file__).resolve().parent.parent / "public" / "js" / "10-data.js"

BOOKS = [("Book I", 1, 41), ("Book II", 42, 72), ("Book III", 73, 89),
         ("Book IV", 90, 106), ("Book V", 107, 150)]


def _extract_object(src: str, marker: str) -> str | None:
    i = src.find(marker)
    if i < 0:
        return None
    j = src.find("{", i)
    depth, in_str, esc, k = 0, False, False, j
    while k < len(src):
        c = src[k]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return src[j:k + 1]
        k += 1
    return None


def _load() -> dict[int, list]:
    try:
        src = _SRC.read_text(encoding="utf-8")
    except OSError:
        return {}
    obj = _extract_object(src, "const TEHILLIM_EMBED=")
    if not obj:
        return {}
    obj = re.sub(r"([{,])\s*(\d+)\s*:", r'\1"\2":', obj)   # quote numeric keys
    obj = re.sub(r",\s*}", "}", obj)                        # drop trailing commas
    try:
        d = json.loads(obj)
    except json.JSONDecodeError:
        return {}
    return {int(k): v for k, v in d.items()}


EMBED: dict[int, list] = _load()


def verses(n: int) -> list | None:
    return EMBED.get(int(n))


def is_embedded(n: int) -> bool:
    return int(n) in EMBED


def book_of(n: int) -> str:
    for label, lo, hi in BOOKS:
        if lo <= n <= hi:
            return label
    return ""
