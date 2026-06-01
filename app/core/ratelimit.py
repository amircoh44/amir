"""Rate limiting via slowapi.

Uses Redis as the backing store when ``REDIS_URL`` is configured, otherwise
falls back to in-memory limits (fine for a single dev process, not for prod).
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _key_func(request) -> str:  # type: ignore[no-untyped-def]
    """Rate-limit by API key / authenticated user when present, else by IP."""
    api_key = request.headers.get("x-api-key")
    if api_key:
        return f"key:{api_key}"
    auth = request.headers.get("authorization", "")
    if auth:
        return f"auth:{auth}"
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_key_func,
    storage_uri=settings.redis_url or "memory://",
    default_limits=[],
)
