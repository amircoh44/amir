# amir

A monorepo containing an international shipping calculator that runs on the web
and on mobile from one shared engine, plus the rate proxy that lets it talk to
live carrier APIs.

```
apps/web              Vite + React calculator
apps/mobile           Expo / React Native app (standalone install)
packages/shipping-core    engine, packaging model, 4 carriers' 2026 tariffs — no React, no DOM
packages/shipping-client  fetch client + React hooks, shared by both apps
services/rates-proxy      Cloudflare Worker holding the EasyPost key
scripts/extract           PDF → TypeScript pipeline that generates the rate tables
```

`packages/shipping-core` has zero dependencies and no platform APIs, so the
rating engine, the packaging model and all four carriers' rate tables compile
unchanged into both a browser bundle and a Hermes bundle.

## Denver → the world

An international shipping, packaging and landed-cost calculator for parcels
leaving Denver, Colorado.

- **4 carriers, 11 services** — USPS (First-Class Package International,
  Priority Mail International, PMI Flat Rate, Priority Mail Express
  International), UPS (Worldwide Expedited, Saver, Express), FedEx
  (International Economy, Priority, Priority Express) and DHL Express Worldwide.
- **229 destinations**, each mapped to its real rating zone or price group for
  every carrier that serves it.
- **Real published rates**, transcribed from the carriers' own 2026 tariff PDFs
  — the full DHL zone A-N table for 1-150 lb plus per-pound bands above it, UPS
  daily list rates for all 17 export zones, the USPS Notice 123 international
  price tables, and FedEx list rates for export zones A-O. Nothing is
  interpolated. See [`scripts/extract/README.md`](scripts/extract/README.md).
- **Packaging is priced as part of the decision.** The calculator fits your
  goods into every container it knows — poly mailers, bubble mailers, corrugated
  boxes and the free USPS flat-rate containers — and costs each including tape,
  label, void fill and bubble wrap. Because the container drives dimensional
  weight, the box often moves the total more than the carrier does.
- **Dimensional weight** at the published 139 in³/lb divisor, plus the UPS
  additional-handling rules for soft packs over 18″ × 14″ × 6″.
- **Duty and import VAT** per destination with de-minimis thresholds, a DDP/DAP
  switch and an overridable duty rate.
- **Worldwide view** — the cheapest route to every destination for one parcel
  spec, sortable and exportable to CSV.
- **Live rates** — your negotiated EasyPost pricing shown next to the published
  list rate for the same service, so the gap is visible.

Every cost line is labelled: untagged lines come from a published tariff, lines
tagged `est` are modelled estimates.

## Connecting a carrier API

Carrier and aggregator credentials **cannot live in the app**. A React Native
bundle can be unpacked and a browser bundle is plain text, so anything shipped
to a device is public. USPS and EasyPost also send no CORS headers, so a browser
`fetch` fails outright.

Everything therefore goes through `services/rates-proxy`:

```
apps/web ─┐
          ├─→ @amir/shipping-client ─→ rates-proxy (holds the key) ─→ EasyPost ─→ carriers
apps/mobile ─┘
```

### Setting it up

```sh
# 1. Configure the proxy
cd services/rates-proxy
cp .dev.vars.example .dev.vars       # put your EasyPost TEST key in it
npx wrangler kv namespace create RATES_KV   # optional: caching + rate limiting
npm run dev                          # http://localhost:8787

# 2. Point the web app at it
cp apps/web/.env.example apps/web/.env.local

# 3. Deploy, when ready
npx wrangler secret put EASYPOST_API_KEY
npx wrangler secret put CLIENT_TOKEN        # optional shared token
npm run proxy:deploy
```

The proxy enforces an origin allowlist, an optional bearer token, a per-IP rate
limit and strict input validation, and it caches quotes in KV for five minutes.
Note that an origin allowlist only stops browsers — `Origin` is trivially forged
outside one — so the rate limit and the token are the real protections on a
public endpoint.

Switching aggregators is a change inside `services/rates-proxy` only. It
normalises responses into the `LiveRate` shape declared in `shipping-core`, so
no client code knows EasyPost exists.

## Audio-reactive image visualizer

Upload images and an audio track; the images pulse, rotate and shift with the
frequency bands of the music. Reachable from the launcher in the corner.

## Scripts

```sh
npm install            # installs web + packages + proxy
npm run mobile:install # apps/mobile installs separately, see below

npm run dev            # web dev server
npm run build          # type-check and build the web app
npm run lint           # eslint
npm run typecheck      # web + proxy
npm run proxy:dev      # rate proxy on localhost:8787
npm run mobile         # expo start

npm run verify         # rate tables vs the printed carrier pages (40 checks)
npm run verify:proxy   # proxy auth, validation and key-leak checks (31 checks)
npm run verify:all     # both
```

`apps/mobile` is deliberately outside the npm workspaces. Expo pins its own
React and React Native versions, and hoisting those next to the web app's React
19 breaks Metro's module resolution. It resolves the shared packages straight
from source via `metro.config.js` (`extraNodeModules`) and `tsconfig.json`
(`paths`), so it needs no npm link to them.
