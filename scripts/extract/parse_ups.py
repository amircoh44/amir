import pymupdf, re, json

d = pymupdf.open("pdf/ups-daily.pdf")
MONEY = re.compile(r"^\$?[\d,]+\.\d{2}$")


def money(t):
    return float(t.replace("$", "").replace(",", ""))


# ---------------- Zone chart (pages 33-36) ----------------
# Rows read in visual order: Name/ISO then its zone codes left-to-right across
# Express Plus | Express | ExpFreight Midday | ExpFreight | Saver | Expedited EAST | Expedited WEST
ups_zones = {}
NAME = re.compile(r"^(.+?)/\s*([A-Z]{2})\s*\*?†?$")
raw = []
for pno in (33, 34, 35, 36):
    for line in d[pno].get_text().split("\n"):
        s = line.strip()
        if s:
            raw.append(s)

i = 0
while i < len(raw):
    s = raw[i]
    m = NAME.match(s.replace("†", "").strip())
    if m:
        name = m.group(1).strip().rstrip(",")
        iso = m.group(2)
        codes = []
        j = i + 1
        while j < len(raw) and re.fullmatch(r"\d{2,3}", raw[j]):
            codes.append(raw[j])
            j += 1
        if codes:
            nines = [c for c in codes if c[0] in "89" and len(c) <= 3 and c[0] != "4"]
            nines = [c for c in codes if c.startswith("9") or (len(c) == 2 and c.startswith("8"))]
            fours = [c for c in codes if c.startswith("4")]
            sixes = [c for c in codes if c.startswith("6") or (len(c) == 2 and c.startswith("7"))]
            rec = {"iso": iso}
            if nines:
                rec["express"] = nines[-1]
                if len(nines) > 1:
                    rec["expressPlus"] = nines[0]
            if fours:
                rec["saver"] = fours[-1]
            if sixes:
                rec["expeditedWest"] = min(sixes)
                rec["expeditedEast"] = max(sixes)
            ups_zones[name] = rec
            i = j
            continue
    i += 1

# Canada and Mexico use their own province/ZIP-based charts; use the mid band.
ups_zones.setdefault("Canada", {"iso": "CA", "express": "82", "saver": "482", "expeditedWest": "72", "expeditedEast": "72"})


# ---------------- Rate tables ----------------
def parse_rate_pages(pages):
    zones, rows, per_lb, minimum = None, {}, None, None
    for pno in pages:
        toks = [t for t in d[pno].get_text().split() if t.strip()]
        # zone header
        for i, t in enumerate(toks):
            if t == "Zones":
                zs = []
                j = i + 1
                while j < len(toks) and re.fullmatch(r"\d{2,3}(/\d{3})?", toks[j]):
                    zs.append(toks[j].split("/")[0])
                    j += 1
                if len(zs) >= 15 and zones is None:
                    zones = zs
                break
        i = 0
        while i < len(toks):
            if MONEY.match(toks[i]):
                j = i
                while j < len(toks) and MONEY.match(toks[j]):
                    j += 1
                run = toks[i:j]
                label = toks[i - 1] if i else ""
                ctx = " ".join(toks[max(0, i - 4):i])
                if len(run) == len(zones or []):
                    vals = dict(zip(zones, [money(x) for x in run]))
                    if re.fullmatch(r"\d+", label):
                        rows[int(label)] = vals
                    elif label == "Lb." and "1 Lb." in ctx:
                        rows[1] = vals
                    elif label == "Lbs." and re.search(r"(\d+) Lbs\.$", ctx):
                        rows[int(re.search(r"(\d+) Lbs\.$", ctx).group(1))] = vals
                    elif label == "Letter*":
                        rows["letter"] = vals
                    elif label == "Lb.**":
                        rows["pak1"] = vals
                    elif label == "Lbs.**":
                        rows["pak2"] = vals
                    elif label == "Box†":
                        rows["box10kg" if "10 KG" in ctx else "box25kg"] = vals
                    elif label == "Pound":
                        per_lb = vals
                    elif label == "Rate":
                        minimum = vals
                i = j
                continue
            i += 1
    return {"zones": zones, "rates": rows, "perLbOver150": per_lb, "minimumOver150": minimum}


express = parse_rate_pages([110, 111, 112])
saver = parse_rate_pages([120, 121, 122])
expedited = parse_rate_pages([126, 127, 128])

out = {
    "countryZones": ups_zones,
    "services": {
        "express": express,
        "saver": saver,
        "expedited": expedited,
    },
    "expressPlusAdder": 40.00,
}
json.dump(out, open("ups.json", "w"), indent=1)

for nm, s in out["services"].items():
    wk = sorted(k for k in s["rates"] if isinstance(k, int))
    print(nm, "zones", len(s["zones"]), s["zones"][:4], "| weights", len(wk), wk[0], wk[-1],
          "| special", [k for k in s["rates"] if not isinstance(k, int)],
          "| perLb", bool(s["perLbOver150"]))
print("countries:", len(ups_zones))
print(list(ups_zones.items())[:4])
print("Austria:", ups_zones.get("Austria"), "Japan:", ups_zones.get("Japan"))
print("Express 1lb:", express["rates"][1])
