"""Address -> (latitude, longitude) geocoding for the customer globe.

Uses OpenStreetMap's Nominatim by default (free, no API key). Be a good
citizen: identify via ``User-Agent`` and don't hammer it. Failures are
swallowed and return ``None`` so a geocoding hiccup never blocks a profile save.
"""

from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger("greenbulk.geocoding")


def compose_address(
    street: str | None = None,
    city: str | None = None,
    state: str | None = None,
    country: str | None = None,
) -> str:
    parts = [street, city, state, country or settings.default_country]
    return ", ".join(p.strip() for p in parts if p and p.strip())


async def geocode(query: str) -> tuple[float, float] | None:
    """Return ``(lat, lon)`` for a free-text address, or ``None`` if unresolved."""
    if not settings.geocoding_enabled or not query.strip():
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                settings.geocoder_url,
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": settings.geocoder_user_agent},
            )
            resp.raise_for_status()
            results = resp.json()
            if results:
                return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception:  # noqa: BLE001 — geocoding is best-effort, never fatal
        logger.warning("Geocoding failed for query %r", query, exc_info=True)
    return None


async def geocode_parts(
    street: str | None, city: str | None, state: str | None
) -> tuple[float, float] | None:
    return await geocode(compose_address(street, city, state))
