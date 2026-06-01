"""Account creation, login, and Google OAuth client setup."""

from __future__ import annotations

from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.core.utils import new_referral_code
from app.models import Cart, Referral, ReferralStatus, User

oauth = OAuth()
if settings.google_oauth_enabled:
    oauth.register(
        name="google",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )


async def _attach_referral(db: AsyncSession, new_user: User, referral_code: str | None) -> None:
    if not referral_code:
        return
    result = await db.execute(select(User).where(User.referral_code == referral_code))
    referrer = result.scalar_one_or_none()
    if referrer and referrer.id != new_user.id:
        new_user.referred_by_id = referrer.id
        db.add(
            Referral(
                referrer_id=referrer.id,
                referred_user_id=new_user.id,
                status=ReferralStatus.pending,
            )
        )


async def register_user(
    db: AsyncSession,
    *,
    email: str,
    password: str | None,
    business_name: str | None = None,
    contact_name: str | None = None,
    phone: str | None = None,
    state: str | None = None,
    google_sub: str | None = None,
    referral_code: str | None = None,
) -> User:
    existing = await db.execute(select(User).where(User.email == email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email exists")

    user = User(
        email=email.lower(),
        hashed_password=hash_password(password) if password else None,
        google_sub=google_sub,
        business_name=business_name,
        contact_name=contact_name,
        phone=phone,
        state=(state or "").upper() or None,
        referral_code=new_referral_code(),
    )
    db.add(user)
    await db.flush()  # assign user.id

    await _attach_referral(db, user, referral_code)
    db.add(Cart(user_id=user.id))
    await db.flush()
    return user


async def authenticate(db: AsyncSession, email: str, password: str) -> User:
    result = await db.execute(select(User).where(User.email == email.lower()))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")
    return user
