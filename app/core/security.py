"""Password hashing and JWT helpers.

Passwords use Argon2 (with bcrypt accepted for verification so existing hashes
keep working). Sessions are stateless JWTs signed with ``SECRET_KEY``.
"""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")


# --- Passwords ---------------------------------------------------------------
def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def password_needs_rehash(hashed: str) -> bool:
    return pwd_context.needs_update(hashed)


# --- JWT ---------------------------------------------------------------------
def _create_token(subject: str, ttl: timedelta, token_type: str, **claims: Any) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + ttl,
        "jti": secrets.token_hex(8),
        **claims,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, **claims: Any) -> str:
    return _create_token(
        subject, timedelta(minutes=settings.access_token_ttl_minutes), "access", **claims
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject, timedelta(days=settings.refresh_token_ttl_days), "refresh"
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises ``jwt.PyJWTError`` on any problem."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


# --- API keys (public API) ---------------------------------------------------
def generate_api_key() -> str:
    """A readable, prefixed, high-entropy key for partner API integrations."""
    return "gbk_" + secrets.token_urlsafe(32)
