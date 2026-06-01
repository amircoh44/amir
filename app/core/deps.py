"""Shared FastAPI dependencies: current user, role/verification gating, API keys."""

from __future__ import annotations

from datetime import UTC, datetime

import jwt
from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, pwd_context
from app.models import ApiKey, User, UserRole, VerificationStatus

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated",
    headers={"WWW-Authenticate": "Bearer"},
)


def _extract_token(authorization: str | None, session: str | None) -> str | None:
    """Accept a bearer header (API clients) or a session cookie (browser)."""
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:]
    return session


async def get_current_user_optional(
    authorization: str | None = Header(default=None),
    session: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    token = _extract_token(authorization, session)
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    return await db.get(User, user_id)


async def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXC
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return user


async def require_verified(user: User = Depends(get_current_user)) -> User:
    """Compliance gate: only approved business accounts may purchase."""
    if user.verification_status != VerificationStatus.approved:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Your business account is pending verification and cannot purchase yet.",
        )
    return user


async def require_api_key(
    x_api_key: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate a partner integration via ``X-API-Key`` against hashed keys."""
    if not x_api_key:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing X-API-Key")

    prefix = x_api_key[:8]
    result = await db.execute(
        select(ApiKey).where(ApiKey.prefix == prefix, ApiKey.revoked.is_(False))
    )
    for key in result.scalars():
        if pwd_context.verify(x_api_key, key.key_hash):
            key.last_used_at = datetime.now(UTC)
            return await db.get(User, key.user_id)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
