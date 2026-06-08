# Server-rendered siddur (Flask) — front-end rewrite

A major architecture change: replacing the client-side JS PWA with a
**server-rendered Python (Flask) app** that has real, human-readable **slug
URLs**. This is the foundation plus the first complete vertical slice — the
siddur reading flow.

## Why / trade-off
The old front-end was an offline-first single-file JS PWA with in-app
(`state.view`) routing and no URLs. This rewrite gives proper URLs/slugs and
server rendering. The trade-off (chosen deliberately): **server rendering means
no offline-first** — each page is a request.

## Routes (slug URLs for prayers & services)
```
/                                     choose a nusach
/siddur/<nusach>                      services in that nusach
/siddur/<nusach>/<service>            prayers (sections) in that service
/siddur/<nusach>/<service>/<prayer>   one prayer, rendered server-side
```
e.g. `/siddur/ashkenaz/shacharit/modeh-ani`

## Pieces
- `slugs.py` — niqqud-aware Hebrew→ASCII transliteration → slug (e.g. מוֹדֶה אֲנִי → `modeh-ani`).
- `data.py` — loads the bundled prayer text (`public/js/textdata.js`, the same
  source the backend seeds from), builds a nusach→service→section index with a
  **unique slug per service and prayer**.
- `app.py` — Flask routes + 404 handling; `templates/` (Jinja2) + `static/siddur.css`.
- `tests/test_web.py` — route + slug coverage (Flask test client).

## Run
```
cd super-siddur
pip install -r web/requirements.txt
PYTHONPATH=. flask --app web.app run -p 5001      # dev
# prod: gunicorn 'web.wsgi:application'
```
The FastAPI backend continues to serve the JSON API (`/api/...`); in production a
reverse proxy routes `/api/*` to FastAPI and everything else to this Flask app.

## Migration status (this is the first slice)
**Done:** siddur reading (home → nusach → service → prayer) with slug URLs, RTL
rendering, breadcrumbs, prev/next, responsive CSS, tests.

**Next, same pattern:** Tehillim, zmanim, compass, settings; the curated
(non-imported) prayer set + nusach variations/conditions; Daven mode and the
interactive client features (these need a JS layer even server-rendered);
account/auth pages and the marketplace UI (consuming the existing FastAPI API).
