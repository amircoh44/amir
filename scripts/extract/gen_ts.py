"""Emit the TypeScript data modules for the shipping calculator."""
import json, os, re

OUT = "src/shipping/data"
os.makedirs(OUT, exist_ok=True)

master = json.load(open("master.json"))
dhl = json.load(open("dhl.json"))
ups = json.load(open("ups.json"))
usps = json.load(open("usps.json"))
fedex = json.load(open("fedex.json"))

HEADER = """// AUTO-GENERATED from published carrier tariffs. Do not edit by hand.
// Sources:
//   DHL Express Service & Rate Guide 2026 (United States) — export rates, zones A-N
//   UPS Rate and Service Guide 2026, U.S. 48 Daily Rates — Worldwide Express/Saver/Expedited
//   USPS Notice 123 Price List, effective July 12, 2026 — international retail prices
//   FedEx Standard List Rates, effective January 5, 2026 (updated June 1, 2026)
"""

# --------------------------------------------------------------------------
# Region / currency / tax reference data (curated).
# --------------------------------------------------------------------------
REGION = {
    "CA": "North America", "MX": "North America", "GL": "North America", "PM": "North America",
    "BM": "Caribbean", "BS": "Caribbean", "BB": "Caribbean", "AI": "Caribbean", "AG": "Caribbean",
    "AW": "Caribbean", "KY": "Caribbean", "CU": "Caribbean", "CW": "Caribbean", "DM": "Caribbean",
    "DO": "Caribbean", "GD": "Caribbean", "GP": "Caribbean", "HT": "Caribbean", "JM": "Caribbean",
    "MQ": "Caribbean", "MS": "Caribbean", "PR": "Caribbean", "BL": "Caribbean", "KN": "Caribbean",
    "LC": "Caribbean", "SX": "Caribbean", "VC": "Caribbean", "TT": "Caribbean", "TC": "Caribbean",
    "VG": "Caribbean", "BQ": "Caribbean",
    "BZ": "Central America", "CR": "Central America", "SV": "Central America",
    "GT": "Central America", "HN": "Central America", "NI": "Central America", "PA": "Central America",
    "AR": "South America", "BO": "South America", "BR": "South America", "CL": "South America",
    "CO": "South America", "EC": "South America", "FK": "South America", "GF": "South America",
    "GY": "South America", "PY": "South America", "PE": "South America", "SR": "South America",
    "UY": "South America", "VE": "South America",
    "AT": "Western Europe", "BE": "Western Europe", "FR": "Western Europe", "DE": "Western Europe",
    "IE": "Western Europe", "LI": "Western Europe", "LU": "Western Europe", "MC": "Western Europe",
    "NL": "Western Europe", "CH": "Western Europe", "GB": "Western Europe", "AD": "Western Europe",
    "GG": "Western Europe", "JE": "Western Europe", "IM": "Western Europe", "GI": "Western Europe",
    "DK": "Northern Europe", "EE": "Northern Europe", "FI": "Northern Europe", "IS": "Northern Europe",
    "LV": "Northern Europe", "LT": "Northern Europe", "NO": "Northern Europe", "SE": "Northern Europe",
    "FO": "Northern Europe", "AX": "Northern Europe",
    "AL": "Southern Europe", "BA": "Southern Europe", "HR": "Southern Europe", "CY": "Southern Europe",
    "GR": "Southern Europe", "IT": "Southern Europe", "MT": "Southern Europe", "ME": "Southern Europe",
    "MK": "Southern Europe", "PT": "Southern Europe", "SM": "Southern Europe", "RS": "Southern Europe",
    "SI": "Southern Europe", "ES": "Southern Europe", "VA": "Southern Europe", "XK": "Southern Europe",
    "IC": "Southern Europe",
    "BY": "Eastern Europe", "BG": "Eastern Europe", "CZ": "Eastern Europe", "HU": "Eastern Europe",
    "MD": "Eastern Europe", "PL": "Eastern Europe", "RO": "Eastern Europe", "RU": "Eastern Europe",
    "SK": "Eastern Europe", "UA": "Eastern Europe",
    "AM": "Middle East", "AZ": "Middle East", "BH": "Middle East", "GE": "Middle East",
    "IR": "Middle East", "IQ": "Middle East", "IL": "Middle East", "JO": "Middle East",
    "KW": "Middle East", "LB": "Middle East", "OM": "Middle East", "QA": "Middle East",
    "SA": "Middle East", "SY": "Middle East", "TR": "Middle East", "AE": "Middle East",
    "YE": "Middle East", "PS": "Middle East",
    "CN": "East Asia", "HK": "East Asia", "JP": "East Asia", "KP": "East Asia", "KR": "East Asia",
    "MO": "East Asia", "MN": "East Asia", "TW": "East Asia",
    "BN": "Southeast Asia", "KH": "Southeast Asia", "ID": "Southeast Asia", "LA": "Southeast Asia",
    "MY": "Southeast Asia", "MM": "Southeast Asia", "PH": "Southeast Asia", "SG": "Southeast Asia",
    "TH": "Southeast Asia", "TL": "Southeast Asia", "VN": "Southeast Asia",
    "AF": "South Asia", "BD": "South Asia", "BT": "South Asia", "IN": "South Asia",
    "MV": "South Asia", "NP": "South Asia", "PK": "South Asia", "LK": "South Asia",
    "KZ": "Central Asia", "KG": "Central Asia", "TJ": "Central Asia", "TM": "Central Asia",
    "UZ": "Central Asia",
    "AU": "Oceania", "CK": "Oceania", "FJ": "Oceania", "PF": "Oceania", "KI": "Oceania",
    "NC": "Oceania", "NZ": "Oceania", "NU": "Oceania", "NR": "Oceania", "PG": "Oceania",
    "WS": "Oceania", "SB": "Oceania", "TO": "Oceania", "TV": "Oceania", "VU": "Oceania",
    "WF": "Oceania", "PN": "Oceania", "AS": "Oceania", "NF": "Oceania",
    "DZ": "North Africa", "EG": "North Africa", "LY": "North Africa", "MA": "North Africa",
    "SD": "North Africa", "TN": "North Africa",
    "AO": "Sub-Saharan Africa", "BJ": "Sub-Saharan Africa", "BW": "Sub-Saharan Africa",
    "BF": "Sub-Saharan Africa", "BI": "Sub-Saharan Africa", "CM": "Sub-Saharan Africa",
    "CV": "Sub-Saharan Africa", "CF": "Sub-Saharan Africa", "TD": "Sub-Saharan Africa",
    "KM": "Sub-Saharan Africa", "CG": "Sub-Saharan Africa", "CD": "Sub-Saharan Africa",
    "CI": "Sub-Saharan Africa", "DJ": "Sub-Saharan Africa", "GQ": "Sub-Saharan Africa",
    "ER": "Sub-Saharan Africa", "SZ": "Sub-Saharan Africa", "ET": "Sub-Saharan Africa",
    "GA": "Sub-Saharan Africa", "GM": "Sub-Saharan Africa", "GH": "Sub-Saharan Africa",
    "GN": "Sub-Saharan Africa", "GW": "Sub-Saharan Africa", "KE": "Sub-Saharan Africa",
    "LS": "Sub-Saharan Africa", "LR": "Sub-Saharan Africa", "MG": "Sub-Saharan Africa",
    "MW": "Sub-Saharan Africa", "ML": "Sub-Saharan Africa", "MR": "Sub-Saharan Africa",
    "MU": "Sub-Saharan Africa", "YT": "Sub-Saharan Africa", "MZ": "Sub-Saharan Africa",
    "NA": "Sub-Saharan Africa", "NE": "Sub-Saharan Africa", "NG": "Sub-Saharan Africa",
    "RE": "Sub-Saharan Africa", "RW": "Sub-Saharan Africa", "SH": "Sub-Saharan Africa",
    "ST": "Sub-Saharan Africa", "SN": "Sub-Saharan Africa", "SC": "Sub-Saharan Africa",
    "SL": "Sub-Saharan Africa", "SO": "Sub-Saharan Africa", "ZA": "Sub-Saharan Africa",
    "SS": "Sub-Saharan Africa", "TZ": "Sub-Saharan Africa", "TG": "Sub-Saharan Africa",
    "UG": "Sub-Saharan Africa", "ZM": "Sub-Saharan Africa", "ZW": "Sub-Saharan Africa",
    "AC": "Sub-Saharan Africa", "TA": "Sub-Saharan Africa",
}

# Standard VAT / GST / sales-tax rate applied to imports (%), curated.
VAT = {
    "AT": 20, "BE": 21, "BG": 20, "HR": 25, "CY": 19, "CZ": 21, "DK": 25, "EE": 22,
    "FI": 25.5, "FR": 20, "DE": 19, "GR": 24, "HU": 27, "IE": 23, "IT": 22, "LV": 21,
    "LT": 21, "LU": 17, "MT": 18, "NL": 21, "PL": 23, "PT": 23, "RO": 21, "SK": 23,
    "SI": 22, "ES": 21, "SE": 25, "GB": 20, "NO": 25, "CH": 8.1, "IS": 24, "LI": 8.1,
    "AL": 20, "BA": 17, "RS": 20, "ME": 21, "MK": 18, "XK": 18, "MD": 20, "UA": 20,
    "BY": 20, "RU": 20, "TR": 20, "IL": 18, "AE": 5, "SA": 15, "BH": 10, "OM": 5,
    "QA": 0, "KW": 0, "JO": 16, "LB": 11, "EG": 14, "MA": 20, "TN": 19, "DZ": 19,
    "ZA": 15, "KE": 16, "NG": 7.5, "GH": 15, "TZ": 18, "UG": 18, "ZM": 16, "ZW": 15,
    "BW": 14, "NA": 15, "MU": 15, "SN": 18, "CI": 18, "CM": 19.25, "ET": 15,
    "AU": 10, "NZ": 15, "JP": 10, "KR": 10, "CN": 13, "TW": 5, "SG": 9, "MY": 10,
    "TH": 7, "VN": 10, "PH": 12, "ID": 11, "IN": 18, "PK": 18, "BD": 15, "LK": 18,
    "NP": 13, "KH": 10, "LA": 10, "MM": 5, "MN": 10, "KZ": 12, "UZ": 12, "GE": 18,
    "AM": 20, "AZ": 18, "CA": 5, "MX": 16, "BR": 17, "AR": 21, "CL": 19, "CO": 19,
    "PE": 18, "EC": 15, "UY": 22, "PY": 10, "BO": 13, "VE": 16, "CR": 13, "PA": 7,
    "GT": 12, "HN": 15, "SV": 13, "NI": 15, "DO": 18, "JM": 15, "TT": 12.5, "BB": 17.5,
    "BS": 10, "BZ": 12.5, "SR": 10, "GY": 14, "FJ": 15, "PG": 10, "HK": 0, "MO": 0,
}

# Duty de minimis, in USD (goods value below which no import duty is assessed).
DUTY_DM = {
    "CA": 15, "MX": 1000, "GB": 175, "NO": 33, "CH": 0, "AU": 660, "NZ": 590,
    "JP": 66, "KR": 150, "CN": 0, "HK": 0, "MO": 0, "SG": 300, "MY": 115, "TH": 45,
    "VN": 40, "PH": 175, "ID": 3, "IN": 0, "PK": 0, "BD": 8, "LK": 0, "TW": 60,
    "IL": 500, "AE": 270, "SA": 265, "TR": 0, "RU": 215, "BR": 0, "AR": 400,
    "CL": 30, "CO": 200, "PE": 200, "EC": 10, "ZA": 0, "EG": 0, "NG": 0, "KE": 0,
    "MA": 0, "DO": 200, "CR": 50, "PA": 100, "GT": 0, "JM": 50, "TT": 0,
}
EU = {"AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
      "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"}
for iso in EU:
    DUTY_DM[iso] = 160  # EUR 150 duty relief, expressed in USD

# Tax (VAT/GST) de minimis in USD — value below which import VAT is not assessed.
TAX_DM = {
    "CA": 15, "MX": 50, "AU": 660, "NZ": 590, "JP": 66, "KR": 150, "SG": 0,
    "MY": 115, "TH": 45, "PH": 175, "TW": 60, "IL": 75, "NO": 33, "CH": 0,
    "GB": 0, "RU": 215, "AE": 270, "SA": 0,
}
for iso in EU:
    TAX_DM[iso] = 0  # import VAT applies from the first cent (IOSS)

# Typical all-in duty rate on general merchandise (%), used when the user does not
# supply an HS-specific rate.
DUTY_RATE = {
    "CA": 6, "MX": 15, "BR": 60, "AR": 35, "IN": 25, "CN": 8, "RU": 15, "ZA": 20,
    "NG": 20, "EG": 25, "TR": 12, "AU": 5, "NZ": 5, "JP": 4, "KR": 8, "GB": 4,
    "CH": 2, "NO": 4, "SG": 0, "HK": 0, "AE": 5, "SA": 5, "IL": 6, "CL": 6, "CO": 10,
    "PE": 6, "EC": 15, "VN": 15, "TH": 15, "ID": 12, "PH": 10, "MY": 10, "PK": 20,
    "BD": 25, "LK": 15,
}
for iso in EU:
    DUTY_RATE[iso] = 4

# Baseline door-to-door transit days by region, per service tier.
TRANSIT = {
    # region: (express, expedited/economy, postal)
    "North America": (1, 3, 7), "Caribbean": (2, 4, 12), "Central America": (2, 4, 12),
    "South America": (3, 5, 14), "Western Europe": (2, 4, 9), "Northern Europe": (2, 4, 10),
    "Southern Europe": (2, 4, 11), "Eastern Europe": (3, 5, 13), "Middle East": (3, 5, 14),
    "East Asia": (3, 5, 12), "Southeast Asia": (3, 5, 14), "South Asia": (3, 6, 16),
    "Central Asia": (4, 7, 20), "Oceania": (3, 6, 13), "North Africa": (4, 6, 18),
    "Sub-Saharan Africa": (4, 7, 21),
}

# Destinations with no reliable commercial parcel service from the U.S.
EMBARGOED = {"KP", "CU", "IR", "SY", "RU", "BY", "AF", "SO", "SS", "LY", "YE"}


def ts_num(x):
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return s if s else "0"


def emit(path, body):
    with open(os.path.join(OUT, path), "w") as f:
        f.write(HEADER + "\n" + body)
    print("wrote", path, os.path.getsize(os.path.join(OUT, path)) // 1024, "KB")


# --------------------------------------------------------------------------
# countries.ts
# --------------------------------------------------------------------------
region_order = list(dict.fromkeys(TRANSIT.keys()))
rows = []
for iso, rec in sorted(master.items(), key=lambda kv: kv[1]["name"]):
    if iso in ("US",):
        continue
    region = REGION.get(iso)
    if not region:
        continue
    # Skip anything no carrier will price.
    if not (rec.get("dhl") or rec.get("fedex") or rec.get("ups") or rec.get("usps")):
        continue
    u = rec.get("ups", {})
    us = rec.get("usps", {})

    def g(v):
        return "null" if not v or v == "n/a" else v

    parts = [
        f'iso:"{iso}"',
        f'name:{json.dumps(rec["name"])}',
        f'region:{json.dumps(region)}',
    ]
    if rec.get("dhl"):
        parts.append(f'dhl:"{rec["dhl"]}"')
    if u.get("express"):
        parts.append(f'upsExpress:"{u["express"]}"')
    if u.get("saver"):
        parts.append(f'upsSaver:"{u["saver"]}"')
    if u.get("expeditedWest"):
        parts.append(f'upsExpedited:"{u["expeditedWest"]}"')
    if rec.get("fedex"):
        parts.append(f'fedex:"{rec["fedex"]}"')
    if us.get("pmi") and us["pmi"] != "n/a":
        parts.append(f'uspsPmi:{us["pmi"]},uspsPmiMaxLb:{us["pmiMaxLb"]}')
    if us.get("pmei") and us["pmei"] != "n/a":
        parts.append(f'uspsPmei:{us["pmei"]},uspsPmeiMaxLb:{us["pmeiMaxLb"]}')
    if us.get("fcpis") and us["fcpis"] != "n/a":
        parts.append(f'uspsFcpis:{us["fcpis"]}')
    if us.get("pmiFlat") and us["pmiFlat"] != "n/a":
        parts.append(f'uspsPmiFlat:{us["pmiFlat"]}')
    if us.get("pmeiFlat") and us["pmeiFlat"] != "n/a":
        parts.append(f'uspsPmeiFlat:{us["pmeiFlat"]}')
    if iso in VAT:
        parts.append(f"vat:{VAT[iso]}")
    if iso in DUTY_RATE:
        parts.append(f"duty:{DUTY_RATE[iso]}")
    if iso in DUTY_DM:
        parts.append(f"dutyDeMinimis:{DUTY_DM[iso]}")
    if iso in TAX_DM:
        parts.append(f"taxDeMinimis:{TAX_DM[iso]}")
    if iso in EMBARGOED:
        parts.append("restricted:true")
    rows.append("  {" + ",".join(parts) + "},")

body = f"""import type {{ Country }} from '../types'

/** Baseline door-to-door transit days by region: [express, economy, postal]. */
export const TRANSIT_DAYS: Record<string, [number, number, number]> = {json.dumps({k: list(v) for k, v in TRANSIT.items()}, indent=2)}

export const COUNTRIES: Country[] = [
{chr(10).join(rows)}
]

export const COUNTRY_BY_ISO: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.iso, c]),
)

export const REGIONS: string[] = {json.dumps(region_order)}
"""
emit("countries.ts", body)

# --------------------------------------------------------------------------
# dhl.ts
# --------------------------------------------------------------------------
weights = sorted(float(w) for w in dhl["rates"])
zones = list("ABCDEFGHIJKLMN")
cols = {z: [dhl["rates"][f"{w:.1f}" if f"{w:.1f}" in dhl["rates"] else str(w)][z] for w in weights] for z in zones}
body = f"""/** DHL Express Worldwide, U.S. export, non-documents. Weight steps in lb. */
export const DHL_WEIGHTS: number[] = [{','.join(ts_num(w) for w in weights)}]

export const DHL_ZONES = {json.dumps(zones).replace('"', "'")} as const
export type DhlZone = (typeof DHL_ZONES)[number]

/** Rate per zone, index-aligned to DHL_WEIGHTS. */
export const DHL_RATES: Record<DhlZone, number[]> = {{
{chr(10).join(f"  {z}: [{','.join(ts_num(v) for v in cols[z])}]," for z in zones)}
}}

/** Envelope rate (<= 0.625 lb, documents only). */
export const DHL_ENVELOPE: Record<DhlZone, number> = {{{','.join(f"{z}:{ts_num(dhl['envelope'][z])}" for z in zones)}}}

/** Per-lb multiplier bands above 150 lb. */
export const DHL_MULTIPLIERS: {{ fromLb: number; toLb: number; perLb: Record<DhlZone, number> }}[] = [
{chr(10).join("  { fromLb: %s, toLb: %s, perLb: {%s} }," % (ts_num(m['fromLb']), ts_num(m['toLb']), ','.join(f"{z}:{ts_num(m['perLb'][z])}" for z in zones)) for m in dhl['multipliers'])}
]
"""
emit("dhl.ts", body)

# --------------------------------------------------------------------------
# ups.ts
# --------------------------------------------------------------------------
blocks = []
for key, name in (("EXPRESS", "express"), ("SAVER", "saver"), ("EXPEDITED", "expedited")):
    svc = ups["services"][name]
    zs = svc["zones"]
    wts = sorted(int(k) for k in svc["rates"] if k.isdigit())
    cols = {z: [svc["rates"][str(w)][z] for w in wts] for z in zs}
    b = [f"export const UPS_{key}_ZONES: string[] = {json.dumps(zs)}",
         f"export const UPS_{key}_WEIGHTS: number[] = [{','.join(str(w) for w in wts)}]",
         f"export const UPS_{key}_RATES: Record<string, number[]> = {{"]
    for z in zs:
        b.append(f"  '{z}': [{','.join(ts_num(v) for v in cols[z])}],")
    b.append("}")
    if svc.get("perLbOver150"):
        pl = ",".join(f"'{z}':{ts_num(svc['perLbOver150'][z])}" for z in zs)
        mn = ",".join(f"'{z}':{ts_num(svc['minimumOver150'][z])}" for z in zs)
        b.append(f"export const UPS_{key}_PER_LB: Record<string, number> = {{{pl}}}")
        b.append(f"export const UPS_{key}_MIN_OVER_150: Record<string, number> = {{{mn}}}")
    blocks.append("\n".join(b))

emit("ups.ts", "/** UPS 2026 Daily list rates, U.S. 48 export. */\n\n" + "\n\n".join(blocks) + "\n")

# --------------------------------------------------------------------------
# usps.ts
# --------------------------------------------------------------------------
pmi_w = sorted(float(w) for w in usps["pmi"])
pmei_w = sorted(float(w) for w in usps["pmei"])
groups = [str(g) for g in range(1, 21)]


def usps_table(tbl, wts, name):
    def row(w):
        return tbl.get(str(w)) or tbl.get(f"{w:.1f}") or {}
    # 0 means "not offered at this weight for this price group"
    cols = {g: [row(w).get(g) or 0 for w in wts] for g in groups}
    lines = [f"export const {name}_WEIGHTS: number[] = [{','.join(ts_num(w) for w in wts)}]",
             f"export const {name}_RATES: Record<string, number[]> = {{"]
    for g in groups:
        lines.append(f"  '{g}': [{','.join(ts_num(v) for v in cols[g])}],")
    lines.append("}")
    return "\n".join(lines)


fc_bands = ["1-8", "9-16", "17-32", "33-48", "49-64"]
fc = ["export const FCPIS_BANDS_OZ: number[] = [8,16,32,48,64]",
      "export const FCPIS_RATES: Record<string, number[]> = {"]
for g in groups:
    fc.append(f"  '{g}': [{','.join(ts_num(usps['fcpis'][b][g]) for b in fc_bands)}],")
fc.append("}")

flat = usps["flat"]
flat_lines = ["export const USPS_FLAT_RATE: Record<string, { maxLb: number; prices: number[] }> = {"]
FLAT_META = [
    ("pmiFlatRateEnvelope", "PMI Flat Rate Envelope", 4),
    ("pmiSmallFlatRateBox", "PMI Small Flat Rate Box", 4),
    ("pmiLargeVideoFlatRateBox", "PMI Large Video Flat Rate Box", 4),
    ("pmiMediumFlatRateBox", "PMI Medium Flat Rate Box", 20),
    ("pmiLargeFlatRateBox", "PMI Large Flat Rate Box", 20),
    ("pmeiFlatRateEnvelope", "PMEI Flat Rate Envelope", 4),
]
for key, _label, maxlb in FLAT_META:
    flat_lines.append(f"  {key}: {{ maxLb: {maxlb}, prices: [{','.join(ts_num(v) for v in flat[key])}] }},")
flat_lines.append("}")

emit("usps.ts", "/** USPS Notice 123 international retail prices, effective July 12, 2026. */\n\n"
     + usps_table(usps["pmi"], pmi_w, "PMI") + "\n\n"
     + usps_table(usps["pmei"], pmei_w, "PMEI") + "\n\n"
     + "\n".join(fc) + "\n\n"
     + "\n".join(flat_lines) + "\n"
     + "\n/** Flat-rate prices are indexed by flat-rate price group 1-8. */\n")

# --------------------------------------------------------------------------
# fedex.ts
# --------------------------------------------------------------------------
fz = [z for z in sorted(fedex["zones"]) if z != "PR"]
svc_keys = ["priority", "priorityExpress", "economy"]
weights_fx = sorted({int(w) for z in fz for k in svc_keys for w in fedex["zones"][z].get(k, {})})
lines = [f"export const FEDEX_ZONES: string[] = {json.dumps(fz)}",
         f"export const FEDEX_WEIGHTS: number[] = [{','.join(str(w) for w in weights_fx)}]",
         "export const FEDEX_RATES: Record<string, Record<string, number[]>> = {"]
for k in svc_keys:
    lines.append(f"  {k}: {{")
    for z in fz:
        tbl = fedex["zones"][z].get(k, {})
        vals = [tbl.get(str(w)) for w in weights_fx]
        if all(v is None for v in vals):
            continue
        lines.append(f"    '{z}': [{','.join(ts_num(v) if v is not None else '0' for v in vals)}],")
    lines.append("  },")
lines.append("}")
emit("fedex.ts", "/** FedEx Standard List Rates 2026, U.S. export, zones A-O. */\n\n" + "\n".join(lines) + "\n")
print("\ndone")
