"""Authentication: email/password fallback, Google OAuth, password reset."""

# NOTE: deliberately no ``from __future__ import annotations`` here. The slowapi
# ``@limiter.limit`` decorator wraps handlers, and FastAPI resolves string
# annotations against the wrapper's module globals (slowapi), where our request
# models are undefined. Keeping annotations as real objects avoids that.
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.ratelimit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
)
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services import auth as auth_service
from app.services.email import send_password_reset

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(response: Response, user: User) -> TokenResponse:
    access = create_access_token(str(user.id), role=user.role.value)
    refresh = create_refresh_token(str(user.id))
    # HttpOnly session cookie powers the server-rendered browser flows.
    response.set_cookie(
        "session",
        access,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        max_age=settings.access_token_ttl_minutes * 60,
    )
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit(settings.ratelimit_auth)
async def register(
    request: Request,
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await auth_service.register_user(
        db,
        email=payload.email,
        password=payload.password,
        business_name=payload.business_name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        state=payload.state,
        referral_code=payload.referral_code,
    )
    return _issue_tokens(response, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.ratelimit_auth)
async def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    user = await auth_service.authenticate(db, payload.email, payload.password)
    return _issue_tokens(response, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    body = await request.json()
    token = body.get("refresh_token", "")
    try:
        payload = decode_token(token)
        if payload.get("type") != "refresh":
            raise ValueError("wrong token type")
        user = await db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token") from exc
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown user")
    return _issue_tokens(response, user)


@router.post("/logout")
async def logout(response: Response) -> dict:
    response.delete_cookie("session")
    return {"ok": True}


# --- Google OAuth ------------------------------------------------------------
@router.get("/google/login")
async def google_login(request: Request):
    if not settings.google_oauth_enabled:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google OAuth not configured")
    return await auth_service.oauth.google.authorize_redirect(
        request, settings.google_redirect_uri
    )


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    if not settings.google_oauth_enabled:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "Google OAuth not configured")
    token = await auth_service.oauth.google.authorize_access_token(request)
    info = token.get("userinfo") or {}
    email = info.get("email")
    sub = info.get("sub")
    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Google did not return an email")

    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if user is None:
        user = await auth_service.register_user(
            db,
            email=email,
            password=None,
            contact_name=info.get("name"),
            google_sub=sub,
        )
    elif user.google_sub is None:
        user.google_sub = sub

    redirect = RedirectResponse(url="/dashboard", status_code=302)
    _issue_tokens(redirect, user)
    return redirect


# --- Password reset ----------------------------------------------------------
@router.post("/password-reset")
@limiter.limit(settings.ratelimit_auth)
async def request_password_reset(
    request: Request, payload: PasswordResetRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    # Always return ok to avoid leaking which emails are registered.
    if user:
        token = create_access_token(str(user.id), purpose="pwreset")
        send_password_reset(user.email, f"{settings.base_url}/reset?token={token}")
    return {"ok": True}


@router.post("/password-reset/confirm")
async def confirm_password_reset(
    payload: PasswordResetConfirm, db: AsyncSession = Depends(get_db)
) -> dict:
    try:
        claims = decode_token(payload.token)
        if claims.get("purpose") != "pwreset":
            raise ValueError("wrong purpose")
        user = await db.get(User, int(claims["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token") from exc
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token")
    user.hashed_password = hash_password(payload.new_password)
    return {"ok": True}


@router.get("/me")
async def me(user: User = Depends(get_current_user)) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role.value,
        "business_name": user.business_name,
        "verification_status": user.verification_status.value,
        "can_purchase": user.can_purchase,
        "referral_code": user.referral_code,
    }
