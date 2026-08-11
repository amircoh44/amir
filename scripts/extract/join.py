"""Join DHL / UPS / USPS / FedEx country tables onto one ISO-2 keyed master."""
import json, re, unicodedata, collections

ups = json.load(open("ups.json"))
dhl = json.load(open("dhl.json"))
usps = json.load(open("usps.json"))
fedex = json.load(open("fedex.json"))


def norm(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = s.lower()
    s = re.sub(r"\d+$", "", s)
    s = re.sub(r"\((.*?)\)", " ", s)
    s = s.replace("&", "and")
    s = re.sub(r"[^a-z ]", " ", s)
    s = re.sub(r"\b(the|rep|republic of|republic|islamic|peoples|people s|democratic|dem|island of|islands|island|of|and)\b", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ---- master from UPS (has ISO-2) ----
master = {}
ups_alt_names = {}
ISO_FIXUPS = {"KV": "XK"}  # UPS uses KV for Kosovo
for name, rec in ups["countryZones"].items():
    iso = ISO_FIXUPS.get(rec["iso"], rec["iso"])
    rec = {**rec, "iso": iso}
    prev = master.get(iso)
    # prefer the plain country name over regional variants ("Azores (Portugal)")
    if prev and ("(" in name or len(name) >= len(prev["name"])):
        ups_alt_names.setdefault(iso, []).append(name)
        continue
    if prev:
        ups_alt_names.setdefault(iso, []).append(prev["name"])
    master[iso] = {"iso": iso, "name": name, "ups": {k: v for k, v in rec.items() if k != "iso"}}

ALIASES = {
    # canonical-normalized -> ISO2
    "korea south": "KR", "korea": "KR", "korea d p r north": "KP", "korea north": "KP",
    "korea s": "KR", "china s": "CN", "china": "CN", "china s china": "CN",
    "hong kong sar china": "HK", "macau sar china": "MO", "macao": "MO", "macau": "MO",
    "taiwan": "TW", "vietnam": "VN", "viet nam": "VN", "burma myanmar": "MM", "burma": "MM",
    "myanmar": "MM", "russia": "RU", "russian federation": "RU", "turkiye": "TR", "turkey": "TR",
    "cote d ivoire": "CI", "cote ivoire ivory coast": "CI", "ivory coast": "CI",
    "congo democratic": "CD", "congo dem": "CD", "congo democratic republic": "CD",
    "congo": "CG", "congo republic": "CG",
    "cape verde": "CV", "cabo verde": "CV",
    "eswatini": "SZ", "swaziland": "SZ",
    "north macedonia": "MK", "macedonia": "MK",
    "czech": "CZ", "czechia": "CZ", "czech republic": "CZ",
    "slovak": "SK", "slovakia": "SK", "slovak republic": "SK",
    "netherlands": "NL", "holland": "NL",
    "united kingdom": "GB", "england united kingdom": "GB", "great britain": "GB",
    "scotland united kingdom": "GB", "wales united kingdom": "GB",
    "northern ireland united kingdom": "GB",
    "ireland": "IE", "ireland rep": "IE",
    "vatican city": "VA", "holy see": "VA",
    "st lucia": "LC", "saint lucia": "LC",
    "st kitts": "KN", "saint kitts nevis": "KN", "st kitts nevis": "KN", "nevis": "KN",
    "st vincent": "VC", "saint vincent grenadines": "VC", "st vincent grenadines": "VC",
    "st maarten": "SX", "sint maarten": "SX", "saint maarten": "SX",
    "st barthelemy": "BL", "saint barthelemy": "BL",
    "st eustatius": "BQ", "bonaire sint eustatius saba": "BQ", "bonaire": "BQ",
    "st pierre miquelon": "PM", "saint pierre miquelon": "PM",
    "saint helena": "SH", "st helena": "SH",
    "east timor": "TL", "timor leste": "TL", "timor leste d": "TL",
    "brunei darussalam": "BN", "brunei": "BN",
    "laos p d r": "LA", "laos": "LA", "lao": "LA",
    "syria": "SY", "syrian arab": "SY",
    "iran s": "IR", "iran": "IR",
    "moldova": "MD", "georgia": "GE", "kosovo": "XK", "kosovo s": "XK",
    "serbia": "RS", "montenegro": "ME", "bosnia": "BA", "bosnia herzegovina": "BA",
    "bosnia herzegovina bosnia": "BA",
    "guinea equatorial": "GQ", "equatorial guinea": "GQ",
    "guinea bissau": "GW", "guinea": "GN", "guinea rep": "GN",
    "papua new guinea": "PG",
    "guyana british": "GY", "guyana": "GY", "french guyana": "GF", "french guiana": "GF",
    "tahiti": "PF", "french polynesia": "PF",
    "wallis futuna": "WF", "wallis futuna islands": "WF",
    "virgin british": "VG", "british virgin": "VG", "virgin british virgin": "VG",
    "turks caicos": "TC", "turks caicos islands": "TC",
    "falkland": "FK", "falkland islands": "FK",
    "faroe": "FO", "faeroe denmark": "FO", "faroe islands": "FO",
    "canary spain": "IC", "canary": "IC", "canary islands": "IC",
    "azores portugal": "PT", "madeira portugal": "PT",
    "somaliland n somalia": "SO", "somaliland": "SO", "somalia": "SO",
    "south sudan": "SS", "sudan": "SD",
    "united arab emirates": "AE", "reunion": "RE", "mayotte": "YT",
    "cook": "CK", "cook islands": "CK", "niue": "NU",
    "nauru": "NR", "nauru rep": "NR", "tuvalu": "TV", "kiribati": "KI",
    "solomon": "SB", "solomon islands": "SB", "vanuatu": "VU", "samoa": "WS",
    "american samoa": "AS", "tonga": "TO", "fiji": "FJ",
    "new caledonia": "NC", "norfolk": "NF",
    "sao tome principe": "ST", "sao tome": "ST",
    "trinidad tobago": "TT", "antigua barbuda": "AG", "antigua": "AG",
    "gambia": "GM", "gambia rep": "GM",
    "yemen": "YE", "yemen rep": "YE",
    "pitcairn": "PN", "pitcairn island": "PN", "ascension": "AC",
    "tristan da cunha": "TA", "gibraltar": "GI", "greenland": "GL",
    "guernsey": "GG", "jersey": "JE", "isle man": "IM",
    "aland": "AX", "aland islands": "AX",
    "curacao": "CW", "aruba": "AW", "bermuda": "BM", "anguilla": "AI",
    "cayman": "KY", "cayman islands": "KY", "montserrat": "MS", "dominica": "DM",
    "grenada": "GD", "barbados": "BB", "bahamas": "BS", "belize": "BZ",
    "haiti": "HT", "jamaica": "JM", "cuba": "CU",
    "dominican": "DO", "dominican republic": "DO",
    "guadeloupe": "GP", "martinique": "MQ",
    "central african": "CF", "central african republic": "CF",
    "burkina faso": "BF", "faso": "BF",
    "comoros": "KM", "djibouti": "DJ", "eritrea": "ER", "lesotho": "LS",
    "seychelles": "SC", "mauritius": "MU", "maldives": "MV",
    "monaco": "MC", "san marino": "SM", "liechtenstein": "LI", "andorra": "AD",
    "malta": "MT", "cyprus": "CY", "iceland": "IS",
    "channel guernsey jersey": "GG", "channel": "GG",
}

by_norm = {}
for name, rec in ups["countryZones"].items():
    by_norm.setdefault(norm(name), rec["iso"])
for iso, rec in master.items():
    by_norm.setdefault(norm(rec["name"]), iso)
for k, v in ALIASES.items():
    by_norm.setdefault(k, v)

EXTRA = {  # present in other carriers but not in the UPS chart
    "XK": "Kosovo", "IC": "Canary Islands", "AC": "Ascension", "TA": "Tristan da Cunha",
    "BQ": "Bonaire, Sint Eustatius and Saba", "PN": "Pitcairn Islands", "BT": "Bhutan",
}
ALIASES["bhutan"] = "BT"
for iso, name in EXTRA.items():
    master.setdefault(iso, {"iso": iso, "name": name})

unmatched = collections.defaultdict(list)


def resolve(name, src):
    n = norm(name)
    for cand in (n, ALIASES.get(n, ""), by_norm.get(n, "")):
        if cand and len(cand) == 2 and cand.isupper():
            return cand
    if n in by_norm:
        return by_norm[n]
    # prefix / containment fallback
    hits = [iso for k, iso in by_norm.items() if k and (k.startswith(n + " ") or n.startswith(k + " ")) and len(n) > 3]
    if len(set(hits)) == 1:
        return hits[0]
    unmatched[src].append(name)
    return None


def ensure(iso, name):
    """Destinations UPS does not serve still need a master record."""
    if iso and iso not in master:
        master[iso] = {"iso": iso, "name": name}
    return iso in master


# ---- DHL ----
for name, zone in dhl["zones"].items():
    iso = resolve(name, "dhl")
    if iso and ensure(iso, name):
        master[iso]["dhl"] = zone

# ---- USPS ----
for row in usps["countries"]:
    iso = resolve(row["country"], "usps")
    if iso and ensure(iso, row["country"]):
        master[iso]["usps"] = {
            "pmi": row["pmiGroup"], "pmiMaxLb": row["pmiMaxLb"],
            "pmiFlat": row["pmiFlatGroup"],
            "pmei": row["pmeiGroup"], "pmeiMaxLb": row["pmeiMaxLb"],
            "pmeiFlat": row["pmeiFlatGroup"],
            "fcpis": row["fcpisGroup"],
        }

# ---- FedEx ----
SKIP = re.compile(r"^(April|Note|Based|Use|Shipments|For|Effective|\d)", re.I)
for name, zone in fedex["countryZones"].items():
    if SKIP.match(name) or len(name) < 3:
        continue
    iso = resolve(name, "fedex")
    if iso and ensure(iso, name):
        master[iso]["fedex"] = zone

json.dump(master, open("master.json", "w"), indent=1, sort_keys=True)

have = lambda k: sum(1 for v in master.values() if k in v)
print("master:", len(master), "| ups", have("ups"), "dhl", have("dhl"), "usps", have("usps"), "fedex", have("fedex"))
for src, names in unmatched.items():
    print(f"\nUNMATCHED {src} ({len(names)}):", sorted(set(names)))
