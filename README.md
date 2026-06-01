# GreenBulk — Bulk THC/CBD B2B Wholesale Platform

A self-hosted, custom Python platform where **verified business customers**
browse a wholesale catalog, place bulk orders with tiered volume pricing,
request custom quotes, and manage their accounts. Premium dark / neon-green
aesthetic with a scroll-driven Three.js "particle burst into bulk" hero.

> **B2B only. 21+. Not retail.** Pricing, UX, and flows assume volume buyers and
> repeat accounts. See [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) before going live.

## Stack

FastAPI · PostgreSQL (SQLAlchemy 2.0 async + Alembic) · Jinja2 + Three.js ·
Stripe · SendGrid · Google OAuth (+ email/password fallback) · Redis rate
limiting · Nginx + Gunicorn/Uvicorn + Let's Encrypt. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Features

**Customer:** Google OAuth + email/password · account dashboard · order history
+ one-click reorder · catalog with THC%/CBD/type filtering · wholesale tier
pricing · quote requests · Stripe checkout · 3D product viewer.

**Admin** (`/api/admin/*`, OpenAPI UI at `/api/docs`): inventory + price tiers ·
order status/fulfillment · customer verification/approval · analytics
(revenue, top products, top customers) · quote responses.

**Platform:** public API (`X-API-Key`) for partner integrations · referral /
affiliate system · SendGrid transactional email (order confirmations, shipping,
password resets, quote responses).

## Quick start

### Docker (recommended)
```bash
cp .env.example .env            # then edit secrets
docker compose up --build -d
docker compose exec app python -m scripts.init_db   # create tables (dev)
docker compose exec app python -m scripts.seed      # demo admin + products
# → http://localhost:8000   ·   API docs → http://localhost:8000/api/docs
```

### Local
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # point DATABASE_URL at your Postgres
make initdb && make seed        # or: make migrate (Alembic) for prod
make dev                        # uvicorn --reload on :8000
```

Demo admin after seeding: `admin@greenbulk.example` / `admin-change-me-1234`
(change immediately).

## Migrations

```bash
make revision m="describe change"   # alembic autogenerate
make migrate                        # alembic upgrade head
```

## Configuration

All config is environment-driven via [`.env`](.env.example) — **secrets never
live in the repo**. The app runs end-to-end with no external accounts in dev:
Stripe-less checkout creates the order without a hosted payment page, and
emails are logged to the console when `SENDGRID_API_KEY` is unset. Fill in
Google/Stripe/SendGrid keys to enable those integrations.

Key flags: `REQUIRE_BUSINESS_VERIFICATION`, `RESTRICTED_STATES`, `MINIMUM_AGE`.

## Tests & lint

```bash
make test     # pricing unit tests + app smoke tests (no DB required)
make lint     # ruff
```

## Deploy (VPS)

1. Clone to `/opt/greenbulk`, create venv, `pip install -r requirements.txt`.
2. Set `/opt/greenbulk/.env` (production secrets, `ENVIRONMENT=production`).
3. `alembic upgrade head`.
4. `cp deploy/greenbulk.service /etc/systemd/system/ && systemctl enable --now greenbulk`.
5. Configure Nginx from `deploy/nginx.conf`; `certbot --nginx -d <domain>`.
6. Schedule `scripts/backup_db.sh` via cron for nightly DB backups.

⚠️ **Confirm Stripe permits your product category before launch** — see
[`docs/COMPLIANCE.md`](docs/COMPLIANCE.md).

## Assets

Product images and branding specs (exact sizes/formats) are in
[`docs/ASSETS.md`](docs/ASSETS.md). The hero works from a transparent PNG;
an optional low-poly `.glb` upgrades the 3D viewer.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design, flows, layout.
- [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — regulatory gating & launch checklist.
- [`docs/ASSETS.md`](docs/ASSETS.md) — asset requirements.
