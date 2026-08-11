import pymupdf, re, json

d = pymupdf.open("pdf/usps.pdf")

def nums(page, start=0):
    t = d[page].get_text()
    return t

def money(tok):
    return float(tok.replace("$", "").replace(",", ""))

MONEY = re.compile(r"^\$?[\d,]+\.\d{2}$")
DASH = {"-", "\u2013", "\u2014", "\u2212"}


def cell(tok):
    return None if tok in DASH else money(tok)


def is_cell(tok):
    return tok in DASH or bool(MONEY.match(tok))
INT = re.compile(r"^\d+(\.\d)?$")


def parse_weight_table(page, groups, weight_is_float_first=False):
    """Rows: <weight> then len(groups) money values."""
    toks = [x for x in d[page].get_text().split("\n") if x.strip()]
    out = {}
    i = 0
    # skip until first row start
    while i < len(toks):
        tok = toks[i].strip()
        if INT.match(tok) and i + len(groups) < len(toks):
            window = [t.strip() for t in toks[i + 1:i + 1 + len(groups)]]
            if all(is_cell(w) for w in window):
                w = float(tok)
                out[w] = {g: cell(v) for g, v in zip(groups, window) if cell(v) is not None}
                i += 1 + len(groups)
                continue
        i += 1
    return out


# ---- Priority Mail International, retail, weight-based ----
pmi = {}
for page, groups in ((40, list(range(1, 11))), (41, list(range(11, 21)))):
    for w, row in parse_weight_table(page, groups).items():
        pmi.setdefault(w, {}).update(row)

# ---- Priority Mail Express International, retail, weight-based ----
pmei = {}
for page, groups in ((38, list(range(1, 11))), (39, list(range(11, 21)))):
    for w, row in parse_weight_table(page, groups).items():
        pmei.setdefault(w, {}).update(row)

# ---- First-Class Package International Service (oz bands) ----
fcpis = {}
toks = [x.strip() for x in d[42].get_text().split("\n") if x.strip()]
bands = ["1-8", "9-16", "17-32", "33-48", "49-64"]
band_src = {"1–8": "1-8", "9–16": "9-16", "17–32": "17-32", "33–48": "33-48", "49–64": "49-64"}
i = 0
group_sets = [list(range(1, 11)), list(range(11, 21))]
gi = 0
while i < len(toks) and gi < 2:
    if toks[i] in band_src:
        band = band_src[toks[i]]
        vals = toks[i + 1:i + 11]
        if all(MONEY.match(v) for v in vals):
            fcpis.setdefault(band, {}).update(
                {g: money(v) for g, v in zip(group_sets[gi], vals)})
            i += 11
            if band == "49-64":
                gi += 1
            continue
    i += 1

# ---- Flat rate prices (page 37) ----
flat_toks = [x.strip() for x in d[37].get_text().split("\n") if x.strip()]


def grab_flat(after_idx, n=8):
    vals = []
    j = after_idx
    while j < len(flat_toks) and len(vals) < n:
        if MONEY.match(flat_toks[j]):
            vals.append(money(flat_toks[j]))
        j += 1
    return vals


flat = {}
labels = [
    ("pmei_envelope", "Priority Mail Express International"),
    ("pmi_envelope", "Priority Mail International"),
]
idx_pmei = flat_toks.index("Priority Mail Express International")
idx_pmi = flat_toks.index("Priority Mail International")
flat["pmeiFlatRateEnvelope"] = grab_flat(idx_pmei)
flat["pmiFlatRateEnvelope"] = grab_flat(idx_pmi)
# after PMI envelope come: small box, large video box, medium box, large box
after = idx_pmi
seen = 0
cursor = idx_pmi
sets = []
j = idx_pmi
vals = []
while j < len(flat_toks):
    if MONEY.match(flat_toks[j]):
        vals.append(money(flat_toks[j]))
    j += 1
sets = [vals[i:i + 8] for i in range(0, len(vals) - len(vals) % 8, 8)]
flat["pmiFlatRateEnvelope"] = sets[0]
flat["pmiSmallFlatRateBox"] = sets[1]
flat["pmiLargeVideoFlatRateBox"] = sets[2]
flat["pmiMediumFlatRateBox"] = sets[3]
flat["pmiLargeFlatRateBox"] = sets[4]

# ---- Country -> price groups (pages 54-59) ----
countries = []
NA = "n/a"
for page in range(54, 60):
    toks = [x.strip() for x in d[page].get_text().split("\n") if x.strip()]
    i = 0
    while i < len(toks):
        name = toks[i]
        # a country row is: name, then 9 group/limit fields
        if len(name) > 2 and name[0].isupper() and not name[0].isdigit() and i + 9 < len(toks):
            f = toks[i + 1:i + 10]
            if all(x == NA or re.fullmatch(r"\d+", x) for x in f):
                countries.append({
                    "country": name,
                    "pmeiGroup": f[0], "pmeiMaxLb": f[1], "pmeiFlatGroup": f[2],
                    "pmiGroup": f[3], "pmiMaxLb": f[4], "pmiFlatGroup": f[5],
                    "fcmiGroup": f[6], "fcpisGroup": f[7], "ipaGroup": f[8],
                })
                i += 10
                continue
        i += 1

out = {"pmi": pmi, "pmei": pmei, "fcpis": fcpis, "flat": flat, "countries": countries}
json.dump(out, open("usps.json", "w"), indent=1)
print("PMI weights:", len(pmi), "max", max(pmi), "groups@1lb", len(pmi[1.0]))
print("PMEI weights:", len(pmei), "max", max(pmei))
print("FCPIS bands:", {k: len(v) for k, v in fcpis.items()})
print("flat:", {k: len(v) for k, v in flat.items()})
print("countries:", len(countries))
print(countries[:3])
print("PMI 1lb:", pmi[1.0])
