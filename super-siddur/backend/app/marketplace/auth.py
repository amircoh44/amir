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


def optional_current_user(token: str | None = Depends(market_oauth2),
                          db: Session = Depends(get_db)) -> MarketUser | None:
    """Like current_user but returns None instead of 401 when unauthenticated —
    for endpoints open to anyone with a share link, that attribute when signed in."""
    if not token:
        return None
    data = _decode_market_token(token)
    if not data:
        return None
    try:
        user = db.get(MarketUser, int(data["sub"]))
    except (KeyError, ValueError):
        return None
    return user if (user and user.active) else None


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


# ===================== Google one-tap + optional 2FA (TOTP) =====================
import base64 as _b64mod
import hashlib as _hashlib
import hmac as _hmac
import os
import struct as _struct
import time as _time
import urllib.parse as _uparse
import urllib.request as _urequest


def verify_google_id_token(token: str) -> dict | None:
    """Return verified Google claims, or None. In dev mode the payload is decoded
    without signature verification (NEVER use in production). In production it is
    verified through Google's tokeninfo endpoint and checked against the configured
    client id."""
    s = get_settings()
    if not token:
        return None
    if s.google_dev_mode:
        try:
            return json.loads(_b64d(token.split(".")[1]))
        except (ValueError, IndexError, json.JSONDecodeError):
            return None
    try:
        url = "https://oauth2.googleapis.com/tokeninfo?" + _uparse.urlencode({"id_token": token})
        with _urequest.urlopen(url, timeout=8) as r:  # noqa: S310 (fixed https host)
            data = json.loads(r.read())
    except Exception:  # noqa: BLE001 (network/parse → treat as invalid)
        return None
    if s.google_client_id and data.get("aud") != s.google_client_id:
        return None
    if data.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        return None
    return data


# ---- TOTP (RFC 6238), stdlib only ----
def gen_totp_secret() -> str:
    return _b64mod.b32encode(os.urandom(20)).decode().rstrip("=")


def _totp_at(secret: str, t: float, step: int = 30, digits: int = 6) -> str:
    pad = "=" * ((8 - len(secret) % 8) % 8)
    key = _b64mod.b32decode(secret + pad)
    msg = _struct.pack(">Q", int(t // step))
    h = _hmac.new(key, msg, _hashlib.sha1).digest()
    o = h[-1] & 0x0F
    code = (_struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return str(code).zfill(digits)


def verify_totp(secret: str, code: str, window: int = 1) -> bool:
    if not secret or not code:
        return False
    code = str(code).strip()
    now = _time.time()
    return any(_totp_at(secret, now + w * 30) == code for w in range(-window, window + 1))


def otpauth_uri(secret: str, email: str, issuer: str = "Super Siddur") -> str:
    return (f"otpauth://totp/{_uparse.quote(issuer)}:{_uparse.quote(email)}"
            f"?secret={secret}&issuer={_uparse.quote(issuer)}&digits=6&period=30")


# ---- short-lived 2FA challenge token (kind="mfa") ----
def create_mfa_challenge(user: MarketUser) -> str:
    now = int(dt.datetime.now(dt.timezone.utc).timestamp())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(user.id), "kind": "mfa", "iat": now, "exp": now + 300}  # 5 minutes
    signing_input = _b64(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = _hmac.new(get_settings().jwt_secret.encode(), signing_input.encode(), _hashlib.sha256).digest()
    return signing_input + "." + _b64(sig)


def decode_mfa_challenge(token: str) -> dict | None:
    try:
        signing_input, sig_b64 = token.rsplit(".", 1)
        expected = _hmac.new(get_settings().jwt_secret.encode(), signing_input.encode(), _hashlib.sha256).digest()
        if not _hmac.compare_digest(_b64d(sig_b64), expected):
            return None
        payload = json.loads(_b64d(signing_input.split(".", 1)[1]))
        if payload.get("kind") != "mfa":
            return None
        if int(payload.get("exp", 0)) < int(dt.datetime.now(dt.timezone.utc).timestamp()):
            return None
        return payload
    except (ValueError, KeyError, json.JSONDecodeError):
        return None
