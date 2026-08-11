# amir

Two apps in one Vite + React + TypeScript workspace. The launcher button in the
bottom-right corner switches between them.

## Denver → the world (default)

An international shipping, packaging and landed-cost calculator for parcels
leaving Denver, Colorado.

- **4 carriers, 11 services** — USPS (First-Class Package International,
  Priority Mail International, PMI Flat Rate, Priority Mail Express
  International), UPS (Worldwide Expedited, Saver, Express), FedEx
  (International Economy, Priority, Priority Express) and DHL Express Worldwide.
- **229 destinations**, each mapped to its real rating zone or price group for
  every carrier that serves it.
- **Real published rates.** Base rates come from the carriers' own 2026 tariff
  PDFs — the full DHL zone A-N table for 1-150 lb plus per-pound bands above it,
  UPS daily list rates for all 17 export zones, the USPS Notice 123
  international price tables, and FedEx list rates for export zones A-O.
  Nothing is interpolated or invented. See
  [`scripts/extract/README.md`](scripts/extract/README.md).
- **Packaging is priced as part of the decision.** The calculator fits your
  goods into every container it knows about — poly mailers, bubble mailers,
  corrugated boxes and the free USPS flat-rate containers — and costs each one
  including tape, label, void fill and bubble wrap. Because the container drives
  dimensional weight, the box you pick often moves the total more than the
  carrier you pick.
- **Dimensional weight** at the published 139 in³/lb divisor, and the UPS
  additional-handling rules for soft packs over 18″ × 14″ × 6″, oversize and
  overweight pieces.
- **Duty and import VAT** per destination, with de-minimis thresholds, a
  DDP/DAP switch and an overridable duty rate.
- **Worldwide view** — the cheapest way to reach every destination for one
  parcel spec, sortable and exportable to CSV.

Every number in a cost breakdown is labelled: untagged lines come from a
published tariff, lines tagged `est` are modelled estimates (packaging prices,
transit days, duty rates and a few accessorials the carriers don't publish in
their rate files).

## Audio-reactive image visualizer

Upload images and an audio track; the images pulse, rotate and shift with the
frequency bands of the music.

## Scripts

```sh
npm run dev      # dev server
npm run build    # type-check and production build
npm run lint     # eslint
npm run verify   # spot-check the rate tables against the printed carrier pages
```

`npm run verify` re-checks about 40 assertions — individual rate cells against
the page they were transcribed from, zone assignments, dimensional-weight
behaviour, duty/VAT arithmetic, and that every servable destination produces at
least one quote.
