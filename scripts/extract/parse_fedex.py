import pymupdf, re, json, collections

d = pymupdf.open("pdf/fedex.pdf")

NUM = re.compile(r"^[\d,]+\.\d{2}$")
INT = re.compile(r"^\d+$")

SERVICES = [
    ("FedEx International First", "internationalFirst"),
    ("FedEx International Priority Express", "priorityExpress"),
    ("FedEx International Priority", "priority"),
    ("FedEx International Economy", "economy"),
    ("FedEx International Connect Plus", "connectPlus"),
]

# Export zone pages: 2 pages per zone, zones A..O
ZONE_PAGES = {}
for pno in range(36, 68):
    t = d[pno].get_text()
    m = re.search(r"International package rates to (?:(zone [A-O])|(Canada \(zone [A-O]\))|(Puerto Rico)): U\.S\. export", t)
    if m:
        label = m.group(0)
        zm = re.search(r"zone ([A-O])", label)
        z = zm.group(1) if zm else "PR"
        ZONE_PAGES.setdefault(z, []).append(pno)


def columns(page):
    words = page.get_text("words")
    cl = collections.defaultdict(list)
    for w in words:
        # numeric columns are right-aligned; text is left-aligned
        key = round(w[2] / 6) * 6 if NUM.fullmatch(w[4]) else -round(w[0] / 6) * 6
        cl[key].append(w)
    return cl


def parse_page(pno):
    """-> (weights[(y, w)], {service: {y: value}}, specials)"""
    cl = columns(d[pno])
    # weight column: the x-cluster with the most pure integers
    wx, best = None, 0
    for x, ws in cl.items():
        n = sum(1 for w in ws if INT.fullmatch(w[4]))
        if n > best:
            best, wx = n, x
    weights = []
    for x, ws in cl.items():
        if x < 0 and abs(x - wx) <= 12:
            weights += [(w[1], int(w[4])) for w in ws if INT.fullmatch(w[4])]
    weights.sort()

    # header clusters -> service, matched to the value cluster just right of it
    headers = {}
    for x, ws in cl.items():
        txt = " ".join(w[4] for w in sorted(ws, key=lambda w: w[1]))
        txt = txt.replace("®", "").replace("  ", " ")
        for label, key in SERVICES:
            if txt.startswith(label):
                headers[-x if x < 0 else x] = key
                break

    value_cols = {x: sorted((w[1], float(w[4].replace(",", ""))) for w in ws if NUM.fullmatch(w[4]))
                  for x, ws in cl.items()}
    value_cols = {x: v for x, v in value_cols.items() if len(v) > 5}

    assigned = {}
    for hx, key in sorted(headers.items()):
        cands = [x for x in value_cols if 0 < x - hx <= 48 and x not in assigned.values()]
        if cands:
            assigned[key] = min(cands)
    return weights, {k: value_cols[x] for k, x in assigned.items()}, cl


def match(weights, col, tol=3.0):
    out = {}
    for y, v in col:
        best = min(weights, key=lambda p: abs(p[0] - y))
        if abs(best[0] - y) <= tol:
            out[best[1]] = v
    return out


zones = {}
for z, pages in sorted(ZONE_PAGES.items()):
    svc = collections.defaultdict(dict)
    for pno in pages:
        weights, cols, _ = parse_page(pno)
        for key, col in cols.items():
            svc[key].update(match(weights, col))
    zones[z] = {k: dict(sorted(v.items())) for k, v in svc.items()}

# Country -> zone, from the "For shipments to:" bullet list on each zone page
country_zone = {}
for z, pages in ZONE_PAGES.items():
    for pno in pages:
        t = d[pno].get_text()
        m = re.search(r"For shipments to:(.*?)(?:Shipments in all other|Based on the|$)", t, re.S)
        if not m:
            continue
        for line in m.group(1).split("\n"):
            s = line.strip().lstrip("•").strip()
            if s and not s.startswith(("Shipments", "Use these", "*", "†")) and len(s) > 1:
                if re.match(r"^[A-Z]", s) and not s.endswith(":"):
                    country_zone.setdefault(s, z)

json.dump({"zones": zones, "countryZones": country_zone}, open("fedex.json", "w"), indent=1)

print("zones:", sorted(zones))
for z in sorted(zones):
    print(" ", z, {k: (len(v), min(v) if v else None, max(v) if v else None) for k, v in zones[z].items()})
print("countries:", len(country_zone))
print(sorted(country_zone.items())[:12])
