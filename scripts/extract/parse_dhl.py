import pymupdf, re, json

SRC = "pdf/dhl-service-and-rate-guide-us.pdf"
d = pymupdf.open(SRC)

ZONES = list("ABCDEFGHIJKLMN")

# ---------- Country -> zone (pages 23, 24) ----------
zones = {}
for pno in (23, 24):
    words = [w for w in d[pno].get_text("words") if w[1] > 120 and w[3] < 700]
    lines = {}
    for w in words:
        lines.setdefault(round(w[1] / 3), []).append(w)
    for k in sorted(lines):
        ws = sorted(lines[k], key=lambda w: w[0])
        # split into left column (x < 300) and right column
        for col in (0, 1):
            sel = [w for w in ws if (w[0] < 300) == (col == 0)]
            if not sel:
                continue
            name_parts, zone = [], None
            for w in sel:
                t = w[4]
                if t == "•":
                    continue
                if len(t) == 1 and t in ZONES and name_parts:
                    zone = t
                    break
                name_parts.append(t)
            if zone and name_parts:
                name = " ".join(name_parts).strip()
                if name.lower().startswith(("country", "dhl", "express", "worldwide", "table", "doc", "for ", "service")):
                    continue
                zones[name] = zone

# ---------- Export rates (pages 25-29) ----------
MONEY = re.compile(r"^[\d,]+\.\d{2}$")


def money(t):
    return float(t.replace(",", ""))


rates = {}          # weight_lb -> {zone: price}
docs = {}           # documents 1-4 lb
envelope = None
multipliers = []    # (from_lb, to_lb, {zone: per_lb})

for pno in (25, 26, 27, 28, 29):
    toks = [x.strip() for x in d[pno].get_text().split("\n") if x.strip()]
    i = 0
    while i < len(toks):
        t = toks[i]
        if t == "Envelope up to 0.625 LB only" and envelope is None:
            vals = [money(x) for x in toks[i + 1:i + 15] if MONEY.match(x)]
            if len(vals) == 14:
                envelope = dict(zip(ZONES, vals))
            i += 15
            continue
        if re.fullmatch(r"\d+\.\d", t):
            window = toks[i + 1:i + 15]
            if len(window) == 14 and all(MONEY.match(x) for x in window):
                rates[float(t)] = dict(zip(ZONES, [money(x) for x in window]))
                i += 15
                continue
        i += 1

# page 29 has a transposed block (weights listed first, then columns of prices)
p29 = [x.strip() for x in d[29].get_text().split("\n") if x.strip()]
i = 0
while i < len(p29):
    if re.fullmatch(r"\d+\.0", p29[i]) and re.fullmatch(r"\d+\.0", p29[i + 1] if i + 1 < len(p29) else ""):
        # run of consecutive weights, then 14 columns of len(run) prices
        run = []
        j = i
        while j < len(p29) and re.fullmatch(r"\d+\.0", p29[j]):
            run.append(float(p29[j]))
            j += 1
        n = len(run)
        block = p29[j:j + 14 * n]
        if len(block) == 14 * n and all(MONEY.match(x) for x in block):
            for zi, z in enumerate(ZONES):
                col = block[zi * n:(zi + 1) * n]
                for wi, w in enumerate(run):
                    rates.setdefault(w, {})[z] = money(col[wi])
            i = j + 14 * n
            continue
        i = j
        continue
    i += 1

# Trailing-label rows on page 29: 14 prices followed by their weight label.
i = 0
while i + 14 < len(p29):
    window = p29[i:i + 14]
    if all(MONEY.match(x) for x in window) and re.fullmatch(r"\d+\.0", p29[i + 14]):
        rates[float(p29[i + 14])] = dict(zip(ZONES, [money(x) for x in window]))
        i += 15
        continue
    i += 1

# ---------- Multiplier rates over 150 lb (page 29) ----------
try:
    k = p29.index("Multiplier rate per 1 lb. from 150.1 Lb")
    seg = p29[k:]
    rows = []
    i = 0
    while i < len(seg):
        if re.fullmatch(r"[\d,]+", seg[i]) and i + 14 < len(seg):
            window = seg[i + 1:i + 15]
            if all(MONEY.match(x) for x in window):
                rows.append((seg[i], dict(zip(ZONES, [money(x) for x in window])), seg[i + 15] if i + 15 < len(seg) else None))
                i += 16
                continue
        i += 1
    bounds = [("150.1", "330"), ("330.1", "660"), ("660.1", "2199"), ("2199.1", "99999")]
    for (lo, hi), (_to, vals, _nxt) in zip(bounds, rows):
        multipliers.append({"fromLb": float(lo), "toLb": float(hi), "perLb": vals})
except ValueError:
    pass

out = {
    "zones": zones,
    "envelope": envelope,
    "rates": {str(k): v for k, v in sorted(rates.items())},
    "multipliers": multipliers,
}
json.dump(out, open("dhl.json", "w"), indent=1)

ws = sorted(rates)
print("countries:", len(zones))
print("weights:", len(ws), "min", ws[0], "max", ws[-1])
missing = [w for w in ws if len(rates[w]) != 14]
print("incomplete rows:", missing[:10])
gaps = [w for w in range(1, 151) if float(w) not in rates]
print("missing integer weights:", gaps)
print("1 lb:", rates[1.0])
print("150 lb:", rates[150.0])
print("multipliers:", len(multipliers), multipliers[:1])
print("sample zones:", {k: zones[k] for k in list(zones)[:6]})
