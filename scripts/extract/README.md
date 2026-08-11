# Rate table extraction

`src/shipping/data/*.ts` is generated from the carriers' own published tariff
PDFs. Nothing in there is hand-typed, so it can be regenerated whenever a
carrier reprices.

## 1. Fetch the source PDFs

Download these into a `pdf/` directory at the repo root (git-ignored):

| File | Source |
| --- | --- |
| `pdf/dhl-service-and-rate-guide-us.pdf` | <https://www.dhl.com/content/dam/dhl/global/dhl-express/documents/pdf/service-and-rate-guide-us-en.pdf> |
| `pdf/ups-daily.pdf` | <https://www.ups.com/us/en/support/shipping-support/shipping-costs-rates/daily-rates> → “U.S. 48, Alaska & Hawaii Daily Rates” |
| `pdf/usps.pdf` | <https://pe.usps.com/cpim/ftp/manuals/dmm300/Notice123.pdf> |
| `pdf/fedex.pdf` | <https://www.fedex.com/content/dam/fedex/us-united-states/services/FedEx_Standard_List_Rates_2026.pdf> |

## 2. Run the pipeline

```sh
pip install pymupdf
cd "$(git rev-parse --show-toplevel)"
python3 scripts/extract/parse_dhl.py     # -> dhl.json
python3 scripts/extract/parse_ups.py     # -> ups.json
python3 scripts/extract/parse_usps.py    # -> usps.json
python3 scripts/extract/parse_fedex.py   # -> fedex.json
python3 scripts/extract/join.py          # -> master.json  (ISO-2 keyed country join)
python3 scripts/extract/gen_ts.py        # -> src/shipping/data/*.ts
npm run verify                           # spot-checks the output against the printed pages
```

Each parser prints coverage counts and `join.py` prints any country name it
could not resolve to an ISO-2 code — add those to its `ALIASES` table.

## What each parser pulls

- **DHL** — pages 23-24 give the country → rating-zone map (A-N); pages 25-29
  give Express Worldwide export rates for 1-150 lb plus the per-pound
  multiplier bands above 150 lb. Surcharges and the 139 in³/lb dimensional
  divisor are on pages 15 and 20-22.
- **UPS** — pages 33-36 give the worldwide zone chart per service. Worldwide
  Express is on pages 110-112, Saver on 120-122 and Expedited on 126-128, each
  with a per-pound rate and minimum for shipments over 150 lb. Denver is a
  “west” origin, so the Expedited zone taken is the 60x code.
- **USPS** — pages 37-42 hold the retail international price tables (flat rate,
  Priority Mail International, Priority Mail Express International and
  First-Class Package International Service); pages 54-59 map every country to
  its price groups and per-country weight ceilings. A `-` in the printed table
  means the service is not offered at that weight, and is emitted as `0`.
- **FedEx** — pages 36-67 carry one zone per pair of pages; the “For shipments
  to:” bullet list on each pair yields the country → zone map, and the rate
  columns are matched to their service by header position. Numbers are
  right-aligned in the PDF, so columns are clustered on their right edge.

## Curated, not extracted

`gen_ts.py` also carries hand-maintained tables that no carrier publishes:
region assignments, VAT/GST rates, duty rates, de-minimis thresholds and
baseline transit days. These are estimates and the app labels them as such.
