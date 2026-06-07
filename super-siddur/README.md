# The Super Siddur

A prayer-companion PWA — siddur (Ashkenaz / Sefard / Edot HaMizrach / Ari), Tehillim,
a real astronomical zmanim engine, a Hebrew-calendar engine, Hebcal-driven parasha,
"daven with me" mode, a Kotel compass, search, and an in-app **admin panel** with auth,
content editing, splash branding, and icon management.

Vanilla-JS frontend (no build step) + a **FastAPI** backend with **SQLite**. The frontend
was refactored from a single 1.7 MB HTML file into ordered modules — behaviour is
verified by exact reassembly + per-module syntax checks + a jsdom runtime boot.

## Project layout

```
super-siddur/
├─ public/                  # static PWA (plain HTML/CSS/JS, no bundler)
│  ├─ index.html
│  ├─ manifest.webmanifest  sw.js   css/   icons/
│  └─ js/
│     ├─ textdata.js        # decoded per-nusach siddur text (seed data)
│     ├─ 05-hebcal.js       # @hebcal/core UMD bundle (GPLv2) — parasha + holidays
│     ├─ 00-engine.js       # Hebrew calendar, astronomical zmanim, gematria, cities
│     ├─ 10-data.js         # data model, services, prayers, Tehillim, state + storage
│     ├─ 20-logic.js        # occasional/seasonal prayers, categories, ordering
│     ├─ 25-calendar.js     # hebcal glue: il flag, sunset rollover, parasha, holidays
│     ├─ 30-views.js        # onboarding, router, all views, Kotel line art, print
│     ├─ 40-admin.js        # Settings/admin panel shell + per-prayer editor
│     ├─ 50-import.js       # buildImported(), text index, posture detection, bootstrap
│     └─ 60-adminx.js       # auth, content/splash/icons/admins admin tabs, server sync
├─ backend/                 # FastAPI app (separated components)
│  ├─ app/
│  │  ├─ main.py            # app + static mount + startup seed
│  │  ├─ config.py db.py models.py schemas.py security.py seed.py
│  │  └─ routers/           # auth, content, settings, icons, admins
│  ├─ tests/test_api.py     # pytest (auth, permissions, content, settings, icons, admins)
│  └─ requirements.txt      # stdlib-only crypto; no native build deps
├─ data/                    # runtime: siddur.db (SQLite) + uploaded icons
├─ Dockerfile  docker-compose.yml  nginx.conf  deploy/super-siddur.service
└─ test/smoke.js            # jsdom frontend smoke test
```

## Run locally

```bash
cd backend
python3 -m pip install -r requirements.txt
SIDDUR_JWT_SECRET=dev SIDDUR_SUPERADMIN_PASSWORD=devpass1 \
  python3 -m uvicorn app.main:app --app-dir . --port 8080 --reload
# open http://localhost:8080   (API docs at /docs)
```

The DB is created and seeded on first boot (super admins + bundled siddur text).

### Tests
```bash
cd backend && python3 -m pytest -q          # backend API (10 checks)
cd test    && npm install && npm test        # frontend jsdom (49 checks)
```

## Admin panel (Settings ⚙ in the app)

Sign in (bottom of the Content/Splash/Icons/Admins tabs) with a super-admin account.
**Seeded super admins:** `amir@graphicatz.com` and `shalomlebowitz@gmail.com` (initial
password `SIDDUR_SUPERADMIN_PASSWORD`; change it after first login).

- **Content** — find/replace across nuschaot, missing-text report, Save-to-server.
- **Splash** — cover wordmark/subtitle/accent + cover & Compass image uploads (each with
  recommended pixel sizes). Published via the settings API.
- **Icons** — upload a PNG/SVG to **override any built-in icon** (`stand/sit/bow/sun/…`)
  or **add a custom icon**; overrides apply live across the app.
- **Admins** — super admins create editors with granular permissions
  (`content.edit`, `settings.edit`, `icons.edit`, `admins.manage`), or other super admins.
- **Edit** — per-prayer editor: text per nusach, posture cues, kavanot as reorderable
  blocks, and a per-block "Show where" (Everywhere / Diaspora only / Eretz Yisrael only).

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | email+password → JWT |
| `GET`  | `/api/auth/me` | bearer | current admin + permissions |
| `GET`/`POST` | `/api/content` | read public / write `content.edit` | siddur docs |
| `GET` `/api/settings`, `PUT /api/settings/{key}` | read public / write `settings.edit` | site settings (branding) |
| `GET` `/api/icons`, `GET /api/icons/{key}/raw`, `POST`/`DELETE` | read public / write `icons.edit` | icon CMS |
| `GET`/`POST`/`PATCH`/`DELETE` `/api/admins` | `superadmin` | manage admins |
| `GET` `/healthz` | — | liveness |

## Deploy to a VPS

### Docker (recommended)
```bash
cat > .env <<EOF
SIDDUR_JWT_SECRET=$(openssl rand -hex 24)
SIDDUR_SUPERADMIN_PASSWORD=$(openssl rand -hex 12)
EOF
docker compose up -d --build
```
Listens on `127.0.0.1:8080`; the SQLite DB + icons persist in the `siddur-data` volume.
Front it with `nginx.conf` (+ `certbot`) for TLS. Swap SQLite for Postgres any time with
`SIDDUR_DATABASE_URL=postgresql+psycopg://…`.

### systemd (no Docker)
See `deploy/super-siddur.service`.

## Configuration (env, `SIDDUR_` prefix)

`JWT_SECRET`, `SUPERADMIN_PASSWORD`, `SUPERADMIN_EMAILS`, `DATABASE_URL`, `DATA_DIR`,
`CORS_ORIGINS`.

> **License note:** `@hebcal/core` (`public/js/05-hebcal.js`) is **GPLv2** — its notice is
> preserved at the top of the file. It's loaded as a standalone script via its public API.
> To avoid shipping GPL code, swap it for the Hebcal REST API in `25-calendar.js`.
