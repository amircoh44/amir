"""Slug helpers — turn a (often vocalized Hebrew) prayer header into a readable
ASCII URL slug, e.g. "מוֹדֶה אֲנִי" → "modeh-ani". A light niqqud-aware
transliteration; deterministic, not scholarly. Uniqueness is enforced by the
caller (data.build_index) by suffixing collisions.
"""
from __future__ import annotations

import re

# Hebrew consonants (incl. final forms) → Latin
_CONS = {
    0x05D0: "", 0x05D1: "b", 0x05D2: "g", 0x05D3: "d", 0x05D4: "h",
    0x05D6: "z", 0x05D7: "ch", 0x05D8: "t", 0x05DA: "ch", 0x05DB: "k",
    0x05DC: "l", 0x05DD: "m", 0x05DE: "m", 0x05DF: "n", 0x05E0: "n",
    0x05E1: "s", 0x05E2: "", 0x05E3: "f", 0x05E4: "p", 0x05E5: "tz",
    0x05E6: "tz", 0x05E7: "k", 0x05E8: "r", 0x05E9: "sh", 0x05EA: "t",
}
# Niqqud (vowel points) → Latin
_VOW = {
    0x05B0: "", 0x05B1: "e", 0x05B2: "a", 0x05B3: "o", 0x05B4: "i",
    0x05B5: "e", 0x05B6: "e", 0x05B7: "a", 0x05B8: "a", 0x05B9: "o",
    0x05BA: "o", 0x05BB: "u", 0x05C7: "o",
}
_VAV, _YOD = 0x05D5, 0x05D9
_HOLAM = (0x05B9, 0x05BA)
_DAGESH = 0x05BC


def heb_translit(s: str) -> str:
    out: list[str] = []
    i, n = 0, len(s)
    prev = ""
    while i < n:
        o = ord(s[i])
        no = ord(s[i + 1]) if i + 1 < n else 0
        if o == _VAV:                       # vav: mater (o/u) or consonant v
            if no in _HOLAM:
                out.append("o"); prev = "o"; i += 2; continue
            if no == _DAGESH:
                out.append("u"); prev = "u"; i += 2; continue
            out.append("v"); prev = "v"; i += 1; continue
        if o == _YOD:                       # yod: silent mater after chirik, else y
            if prev == "i":
                i += 1; continue
            out.append("y"); prev = "y"; i += 1; continue
        if o in _CONS:
            out.append(_CONS[o]); prev = "c"; i += 1; continue
        if o in _VOW:
            v = _VOW[o]
            if v:
                out.append(v); prev = v
            i += 1; continue
        ch = s[i]
        if ch.isspace():
            out.append(" "); prev = ""; i += 1; continue
        if ch.isalnum():                    # pass Latin letters / digits through
            out.append(ch.lower()); prev = ""; i += 1; continue
        i += 1                              # drop punctuation/cantillation
    return "".join(out)


def slugify(text: str, fallback: str = "prayer") -> str:
    t = heb_translit(text or "").lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return t or fallback
