"""The Super Siddur — FastAPI application.

Serves the static PWA (../public) and the admin API (auth, content, settings,
icons, admins) backed by SQLite. Components live in separate modules under app/.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import PUBLIC_DIR, get_settings
from .routers import admins, auth, content, icons, settings as settings_router
from .marketplace.router import router as marketplace_router
from .marketplace.authx import router as authx_router
from .marketplace.community import router as community_router
from .marketplace.escrow import router as escrow_router
from .marketplace.fulfillment import router as fulfillment_router
from .marketplace.integrations import router as integrations_router
from .marketplace.jobaudio import router as jobaudio_router
from .seed import seed

app = FastAPI(title="The Super Siddur", version="2.0.0")

_cfg = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cfg.cors_origins.split(",")] if _cfg.cors_origins else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    seed()


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}


@app.get("/api/admin/status")
def admin_status() -> dict:
    # Always enabled with the Python backend (login-based, not a shared token).
    return {"enabled": True, "auth": "password"}


app.include_router(auth.router)
app.include_router(content.router)
app.include_router(settings_router.router)
app.include_router(icons.router)
app.include_router(admins.router)
app.include_router(marketplace_router)
app.include_router(authx_router)
app.include_router(community_router)
app.include_router(fulfillment_router)
app.include_router(escrow_router)
app.include_router(jobaudio_router)
app.include_router(integrations_router)


# Server-rendered Python front-end (Flask) — the front-end rewrite, mounted
# alongside the legacy static PWA during migration. Visit it at /web. Flip the
# root to this once it reaches feature parity.
import sys as _sys  # noqa: E402

from .config import PROJECT_DIR  # noqa: E402

if str(PROJECT_DIR) not in _sys.path:
    _sys.path.insert(0, str(PROJECT_DIR))
try:
    from starlette.middleware.wsgi import WSGIMiddleware  # noqa: E402
    from web.app import app as _flask_app  # noqa: E402

    app.mount("/web", WSGIMiddleware(_flask_app))
    print("[siddur] Flask front-end mounted at /web", flush=True)
except Exception as _e:  # noqa: BLE001  (front-end optional; never break the API)
    print(f"[siddur] Flask front-end NOT mounted: {_e!r}", flush=True)


# Static frontend last so /api/* and /web win. html=True serves index.html at "/".
app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="static")


# SPA-ish fallback for unknown non-API GETs.
@app.exception_handler(404)
async def _spa_fallback(request, exc):  # noqa: ANN001
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    index = PUBLIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return JSONResponse({"detail": "Not found"}, status_code=404)
