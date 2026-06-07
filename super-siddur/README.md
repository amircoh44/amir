# The Super Siddur

A self-contained prayer-companion PWA — siddur (Ashkenaz / Sefard / Edot HaMizrach / Ari),
Tehillim, a real astronomical zmanim engine, a Hebrew-calendar engine, "daven with me"
mode, a Kotel compass, search, and an in-app **admin panel** for editing the prayer text,
annotations, and the opening splash screen.

This was refactored from a single 1.7 MB HTML file into a maintainable, deployable app so
it can keep evolving. **Behaviour is byte-for-byte identical to the original** — the split
is verified by exact reassembly + per-module syntax checks + a jsdom runtime boot.

## Project layout

```
super-siddur/
├─ public/                  # static frontend (no build step — plain HTML/CSS/JS)
│  ├─ index.html            # app shell
│  ├─ manifest.webmanifest  # PWA manifest
│  ├─ sw.js                 # service worker (offline app shell)
│  ├─ css/app.css
│  ├─ icons/
│  └─ js/
│     ├─ textdata.js        # decoded per-nusach siddur text (generated data blob)
│     ├─ 00-engine.js       # Hebrew calendar, astronomical zmanim, gematria, cities
│     ├─ 10-data.js         # data model, services, prayers, Tehillim, state + storage
│     ├─ 20-logic.js        # occasional/seasonal prayers, categories, ordering
│     ├─ 30-views.js        # onboarding, router, all views, print/booklet
│     ├─ 40-admin.js        # Settings/admin panel + prayer editor
│     └─ 50-import.js       # buildImported(), text index, posture detection, bootstrap
├─ server/                  # Node/Express server + admin content API
│  ├─ server.js
│  └─ package.json
├─ data/                    # runtime: content.json (server-persisted edits) + backups
├─ Dockerfile
├─ docker-compose.yml
├─ nginx.conf               # reverse proxy + TLS (sample)
└─ deploy/super-siddur.service   # systemd unit (non-Docker)
```

### Why the JS is split into numbered files
They are **classic scripts loaded in order** and share one global scope, so the split is
purely organisational — no bundler, no imports to maintain. Edit any module and reload.
Keep the numeric load order in `index.html` (`textdata.js` must load before `50-import.js`).

To re-derive `content.json` after editing `textdata.js`, delete `data/content.json` and
restart the server (it re-seeds from the bundle).

## Run locally

```bash
cd server && npm install
cd .. && ADMIN_TOKEN=dev-secret PORT=8080 node server/server.js
# open http://localhost:8080
```

Without `ADMIN_TOKEN` set, the app still runs fully; only server-side admin **saves** are
disabled (the in-app admin panel falls back to per-device localStorage).

## Deploy to a VPS

### Option A — Docker (recommended)

```bash
# on the server, in the super-siddur/ directory:
echo "ADMIN_TOKEN=$(openssl rand -hex 24)" > .env
docker compose up -d --build
```

The container listens on `127.0.0.1:8080`; admin edits persist in the `siddur-data`
volume. Put nginx in front for TLS:

```bash
sudo cp nginx.conf /etc/nginx/sites-available/super-siddur
sudo ln -s /etc/nginx/sites-available/super-siddur /etc/nginx/sites-enabled/
# edit server_name, then:
sudo certbot --nginx -d siddur.example.com
sudo nginx -t && sudo systemctl reload nginx
```

### Option B — systemd + Node (no Docker)

```bash
sudo mkdir -p /opt/super-siddur && sudo cp -r . /opt/super-siddur/
cd /opt/super-siddur/server && sudo npm install --omit=dev
sudo cp /opt/super-siddur/deploy/super-siddur.service /etc/systemd/system/
sudo sed -i "s/change-me/$(openssl rand -hex 24)/" /etc/systemd/system/super-siddur.service
sudo systemctl daemon-reload && sudo systemctl enable --now super-siddur
```

Then front it with the same `nginx.conf`.

## Admin panel (in-app, under Settings ⚙)

- **Content** — find/replace across nuschaot (live, with a match count), a
  missing-text report, and **Save to server** to publish edits for everyone.
- **Splash** — edit the opening-cover wordmark/subtitle/accent and upload a cover
  background image; each image upload shows the recommended pixel size for every
  layout. Also uploads an optional **Compass header image** that overrides the
  built-in Kotel line art. **Save for everyone** publishes via `/api/settings`.
- **Edit** (per-prayer editor) — Hebrew/translation/transliteration, posture cues,
  and **kavanot as their own reorderable blocks** (Foundation / Halachic /
  Kabbalistic), placeable anywhere in the block list. Legacy prayers whose kavanah
  was attached to a text block convert cleanly and keep working.
- **Display** — a user-facing **Opening cover** toggle to skip the splash on launch.

The **Compass** header is original, theme-driven SVG line art (`var(--accent)`,
no external image) with an engraved "ירושלים / JERUSALEM" wordmark.

## Admin API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/api/content` | — | Current siddur content (array of nusach docs) |
| `POST` | `/api/content` | `X-Admin-Token` | Replace content; a timestamped backup is kept |
| `GET`  | `/api/settings` | — | Site settings (splash branding) |
| `POST` | `/api/settings` | `X-Admin-Token` | Update settings |
| `GET`  | `/api/admin/status` | — | `{ enabled }` — whether server-side saves are configured |
| `GET`  | `/healthz` | — | Liveness probe |

The admin token is entered once in the app's **Settings → Content / Splash** panel
and stored in that browser's localStorage; it is sent with each save.

## Tests

```bash
cd test && npm install && npm test
```

Boots the app in jsdom and checks the content pipeline, admin/editor + splash
features, the Kotel line art, and the kavanot blocks. If the original single-file
HTML is available, point `SIDDUR_ORIG` at it to also assert behavioural parity.
```
