"""Auth: password hashing (PBKDF2), JWT (HS256), and permission dependencies.

Uses only the Python standard library for crypto so the app has no native/Rust
build dependencies — portable and fast to install on any VPS.
"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import hmac
import json
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import Admin

# All permissions a non-super admin can be granted. Super admins implicitly have all.
ALL_PERMISSIONS = [
    "content.edit",    # edit nuschaot text / find-replace / save
    "settings.edit",   # splash branding & site settings
    "icons.edit",      # upload / override / add custom icons
    "admins.manage",   # create / edit / remove admins
]

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

_PBKDF2_ROUNDS = 200_000


# ---- password hashing (PBKDF2-HMAC-SHA256) ----
def hash_password(raw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", raw.encode(), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${dk.hex()}"


def verify_password(raw: str, stored: str) -> bool:
    try:
        algo, rounds, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", raw.encode(), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


# ---- JWT (HS256) ----
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def create_token(admin: Admin) -> str:
    s = get_settings()
    now = int(dt.datetime.now(dt.timezone.utc).timestamp())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(admin.id), "email": admin.email, "role": admin.role,
               "iat": now, "exp": now + s.jwt_ttl_hours * 3600}
    signing_input = _b64(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(s.jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return signing_input + "." + _b64(sig)


def decode_token(token: str) -> dict | None:
    s = get_settings()
    try:
        signing_input, sig_b64 = token.rsplit(".", 1)
        expected = hmac.new(s.jwt_secret.encode(), signing_input.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_b64d(sig_b64), expected):
            return None
        payload = json.loads(_b64d(signing_input.split(".", 1)[1]))
        if int(payload.get("exp", 0)) < int(dt.datetime.now(dt.timezone.utc).timestamp()):
            return None
        return payload
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


# ---- dependencies ----
def admin_permissions(admin: Admin) -> list[str]:
    return list(ALL_PERMISSIONS) if admin.role == "superadmin" else list(admin.permissions or [])


def current_admin(token: str | None = Depends(oauth2), db: Session = Depends(get_db)) -> Admin:
    cred_exc = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated",
                             headers={"WWW-Authenticate": "Bearer"})
    if not token:
        raise cred_exc
    data = decode_token(token)
    if not data:
        raise cred_exc
    try:
        admin = db.get(Admin, int(data["sub"]))
    except (KeyError, ValueError):
        raise cred_exc
    if not admin or not admin.active:
        raise cred_exc
    return admin


def require(permission: str):
    """Dependency factory: ensure the caller has a permission (super admins pass all)."""
    def _dep(admin: Admin = Depends(current_admin)) -> Admin:
        if admin.role != "superadmin" and permission not in (admin.permissions or []):
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Missing permission: {permission}")
        return admin
    return _dep


def require_superadmin(admin: Admin = Depends(current_admin)) -> Admin:
    if admin.role != "superadmin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin only")
    return admin


def get_admin_by_email(db: Session, email: str) -> Admin | None:
    return db.scalar(select(Admin).where(Admin.email == email.lower()))
