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


# Static frontend last so /api/* wins. html=True serves index.html at "/".
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
