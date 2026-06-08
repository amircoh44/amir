"""Market end-user accounts: register / login / current-user dependency.

Reuses the core app's stdlib crypto (PBKDF2 password hashing + HS256 JWT) so
there are no new dependencies. Market tokens carry kind="market" so they can
never be confused with admin tokens.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..security import _b64, _b64d  # reuse base64url helpers
from .models import MarketUser

market_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/market/auth/login", auto_error=False)


def create_market_token(user: MarketUser) -> str:
    s = get_settings()
    now = int(dt.datetime.now(dt.timezone.utc).timestamp())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(user.id), "email": user.email, "kind": "market",
               "iat": now, "exp": now + s.jwt_ttl_hours * 3600}
    signing_input = _b64(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(s.jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return signing_input + "." + _b64(sig)


def _decode_market_token(token: str) -> dict | None:
    s = get_settings()
    try:
        signing_input, sig_b64 = token.rsplit(".", 1)
        expected = hmac.new(s.jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64d(sig_b64), expected):
            return None
        payload = json.loads(_b64d(signing_input.split(".", 1)[1]))
        if payload.get("kind") != "market":
            return None
        if int(payload.get("exp", 0)) < int(dt.datetime.now(dt.timezone.utc).timestamp()):
            return None
        return payload
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def get_user_by_email(db: Session, email: str) -> MarketUser | None:
    return db.scalar(select(MarketUser).where(MarketUser.email == email.lower()))


def current_user(token: str | None = Depends(market_oauth2), db: Session = Depends(get_db)) -> MarketUser:
    exc = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                        headers={"WWW-Authenticate": "Bearer"})
    if not token:
        raise exc
    data = _decode_market_token(token)
    if not data:
        raise exc
    try:
        user = db.get(MarketUser, int(data["sub"]))
    except (KeyError, ValueError):
        raise exc
    if not user or not user.active:
        raise exc
    return user


def is_pro(user: MarketUser) -> bool:
    if user.membership not in ("pro", "pro_plus"):
        return False
    if user.membership_until is None:
        return True
    until = user.membership_until
    if until.tzinfo is None:
        until = until.replace(tzinfo=dt.timezone.utc)
    return until >= dt.datetime.now(dt.timezone.utc)


def require_pro(user: MarketUser = Depends(current_user)) -> MarketUser:
    if not is_pro(user):
        # 402 Payment Required — the client should surface the Pro upsell.
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Pro membership required")
    return user
