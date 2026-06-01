# Architecture

## Stack

- **FastAPI** (async) + **Uvicorn** workers under **Gunicorn**.
- **PostgreSQL** via **SQLAlchemy 2.0 async** (`asyncpg`), migrations with **Alembic**.
- **Jinja2** server-rendered pages; vanilla JS talks to the JSON API.
- **Three.js** (ES modules from CDN) for the hero burst + product 3D viewer.
- **Stripe** Checkout + signed webhooks. **SendGrid** for transactional email.
- **Redis** + **slowapi** for rate limiting.
- **Nginx** TLS termination + reverse proxy; **Let's Encrypt** certs.

The spec offered FastAPI *or* Django. We chose **FastAPI + SQLAlchemy + Alembic**
(the leaner path) and hand-rolled the admin as JSON endpoints + the auto-generated
OpenAPI docs at `/api/docs`, rather than pulling in Django for its admin.

## Layout

```
app/
  core/        config, db engine, security (argon2/JWT), deps, rate limit, utils
  models/      SQLAlchemy models (users, products+tiers, cart, orders, quotes, referrals)
  schemas/     Pydantic request/response models
  services/    business logic: pricing, orders, auth, stripe, email, analytics,
               uploads, geocoding, showcase (profile update + auto-geocode)
  api/routes/  JSON API: auth, catalog, customers (public map), cart, checkout,
               orders, account, quotes, admin (+ media uploads),
               public_api (X-API-Key), webhooks
  web/         server-rendered page routes (storefront, cart/checkout,
               customer globe + session-gated /admin)
  templates/   Jinja2 (dark/neon-green design system); templates/admin/ = backend UI
  static/      css (style + admin) + three.js hero/viewer/globe + app/admin/cart glue
alembic/       migration env
scripts/       init_db, seed, backup_db.sh
deploy/        nginx.conf, systemd unit
tests/         pricing unit tests + app smoke tests
```

## Request flows

**Checkout (trusted payment state):**
1. `POST /api/checkout` → `require_verified` gate → snapshot cart into a
   `pending` Order with tier pricing → create Stripe Checkout Session.
2. Buyer pays on Stripe's hosted page.
3. Stripe calls `POST /webhooks/stripe`. Signature is verified against
   `STRIPE_WEBHOOK_SECRET`. Only then is the order marked `paid`, stock
   decremented, referral qualified, and confirmation email sent.
   → The client is **never** trusted to report payment success.

**Wholesale pricing:** `services/pricing.py` is pure logic — the highest
`min_qty` tier not exceeding the ordered quantity sets the per-unit price;
otherwise the product's base list price applies. Unit-tested in `tests/`.

**Auth:** JWT access/refresh tokens. Browser flows use an HttpOnly `session`
cookie; API clients use `Authorization: Bearer`. Google OAuth via Authlib is the
primary sign-in with email/password (argon2) fallback. Partner integrations use
hashed `X-API-Key` keys.

## Money

All amounts are integer **cents** (`*_cents`) to avoid float drift; formatted
to currency only at the display edge.

## Scaling notes

- `InstancedMesh` renders the hero's hundreds of copies in one draw call.
- DB relationships use `selectin` loading to avoid N+1 across async sessions.
- Rate limits key on API key / auth / IP and are backed by Redis in prod.
