"""Small shared helpers."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime

from slugify import slugify as _slugify


def unique_slug(name: str) -> str:
    """Slug with a short random suffix to avoid collisions across products."""
    return f"{_slugify(name)[:140]}-{secrets.token_hex(3)}"


def reference(prefix: str) -> str:
    """Human-friendly reference like ``ORD-20260601-AB12CD``."""
    stamp = datetime.now(UTC).strftime("%Y%m%d")
    return f"{prefix}-{stamp}-{secrets.token_hex(3).upper()}"


def new_referral_code() -> str:
    return secrets.token_urlsafe(6)
