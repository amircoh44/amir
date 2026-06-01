"""FastAPI application entrypoint and wiring."""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import (
    account,
    admin,
    auth,
    cart,
    catalog,
    checkout,
    customers,
    orders,
    public_api,
    quotes,
    webhooks,
)
from app.core.config import settings
from app.core.ratelimit import limiter
from app.web import routes as web_routes

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

# --- Rate limiting -----------------------------------------------------------
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def _ratelimit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})


# --- Sessions (required by Authlib OAuth state) ------------------------------
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    https_only=settings.is_production,
    same_site="lax",
)


# --- Security headers --------------------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# --- Static files ------------------------------------------------------------
STATIC_DIR = Path(__file__).resolve().parent / "static"
(STATIC_DIR / "uploads").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# --- Routers -----------------------------------------------------------------
app.include_router(auth.router)
app.include_router(catalog.router)
app.include_router(customers.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(account.router)
app.include_router(quotes.router)
app.include_router(admin.router)
app.include_router(public_api.router)
app.include_router(webhooks.router)
app.include_router(web_routes.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "environment": settings.environment}
