"""Login & security — Google one-tap + optional 2FA (TOTP).

Login only unlocks the personal zone; it never gates posting or paying. Google
sign-in maps a verified Google identity to a market account (creating it if
new). 2FA is fully optional, off by default; when enabled, both password and
Google logins return a short-lived challenge that must be completed with a TOTP
code.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from .auth import (create_market_token, create_mfa_challenge, current_user,
                   decode_mfa_challenge, gen_totp_secret, get_user_by_email,
                   otpauth_uri, verify_google_id_token, verify_totp)
from .models import MarketUser
from .schemas import CodeIn, GoogleIn, TwoFAIn

router = APIRouter(prefix="/api/market", tags=["auth-security"])


def _login_result(user: MarketUser) -> dict:
    """Either an access token, or a 2FA challenge if the user enabled it."""
    if user.mfa_enabled and user.totp_secret:
        return {"mfa_required": True, "challenge": create_mfa_challenge(user)}
    return {"access_token": create_market_token(user), "token_type": "bearer"}


@router.post("/auth/google")
def google_login(body: GoogleIn, db: Session = Depends(get_db)) -> dict:
    claims = verify_google_id_token(body.id_token)
    if not claims or not claims.get("email"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google token")
    email = str(claims["email"]).lower()
    user = get_user_by_email(db, email)
    if not user:
        user = MarketUser(email=email, name=(claims.get("name") or email.split("@")[0]),
                          password_hash="", google_sub=str(claims.get("sub", "")))
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.google_sub and claims.get("sub"):
        user.google_sub = str(claims["sub"])
        db.commit()
    return _login_result(user)


@router.post("/auth/2fa")
def complete_2fa(body: TwoFAIn, db: Session = Depends(get_db)) -> dict:
    data = decode_mfa_challenge(body.challenge)
    if not data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Challenge expired — sign in again")
    try:
        user = db.get(MarketUser, int(data["sub"]))
    except (KeyError, ValueError):
        user = None
    if not user or not user.mfa_enabled:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid code")
    return {"access_token": create_market_token(user), "token_type": "bearer"}


@router.post("/me/2fa/setup")
def mfa_setup(user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Begin enabling 2FA: returns a secret + otpauth URI for the authenticator
    app. Not active until confirmed with a code at /me/2fa/enable."""
    secret = gen_totp_secret()
    user.totp_pending = secret
    db.commit()
    return {"secret": secret, "otpauth_uri": otpauth_uri(secret, user.email),
            "note": "Scan in your authenticator, then confirm a code to enable."}


@router.post("/me/2fa/enable")
def mfa_enable(body: CodeIn, user: MarketUser = Depends(current_user),
               db: Session = Depends(get_db)) -> dict:
    if not user.totp_pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Run setup first")
    if not verify_totp(user.totp_pending, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code")
    user.totp_secret = user.totp_pending
    user.totp_pending = ""
    user.mfa_enabled = True
    db.commit()
    return {"ok": True, "mfa_enabled": True}


@router.post("/me/2fa/disable")
def mfa_disable(body: CodeIn, user: MarketUser = Depends(current_user),
                db: Session = Depends(get_db)) -> dict:
    if not user.mfa_enabled:
        return {"ok": True, "mfa_enabled": False}
    if not verify_totp(user.totp_secret, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid code")
    user.mfa_enabled = False
    user.totp_secret = ""
    db.commit()
    return {"ok": True, "mfa_enabled": False}
