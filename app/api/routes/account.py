"""Customer account: profile, settings, referral stats, API keys."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import generate_api_key, hash_password
from app.models import ApiKey, Referral, ReferralStatus, User

router = APIRouter(prefix="/api/account", tags=["account"])


class ProfileUpdate(BaseModel):
    business_name: str | None = Field(default=None, max_length=255)
    contact_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    state: str | None = Field(default=None, min_length=2, max_length=2)
    tax_id: str | None = Field(default=None, max_length=64)
    license_number: str | None = Field(default=None, max_length=128)


@router.get("/profile")
async def get_profile(user: User = Depends(get_current_user)) -> dict:
    return {
        "email": user.email,
        "business_name": user.business_name,
        "contact_name": user.contact_name,
        "phone": user.phone,
        "state": user.state,
        "tax_id": user.tax_id,
        "license_number": user.license_number,
        "verification_status": user.verification_status.value,
        "referral_code": user.referral_code,
    }


@router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    data = payload.model_dump(exclude_unset=True)
    if "state" in data and data["state"]:
        data["state"] = data["state"].upper()
    for field, value in data.items():
        setattr(user, field, value)
    await db.flush()
    return {"ok": True}


@router.get("/referrals")
async def my_referrals(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    result = await db.execute(
        select(
            Referral.status,
            func.count(Referral.id),
            func.coalesce(func.sum(Referral.commission_cents), 0),
        )
        .where(Referral.referrer_id == user.id)
        .group_by(Referral.status)
    )
    by_status = {
        status_.value: {"count": count, "commission_cents": int(commission)}
        for status_, count, commission in result.all()
    }
    earned = sum(
        v["commission_cents"]
        for k, v in by_status.items()
        if k in (ReferralStatus.qualified.value, ReferralStatus.paid_out.value)
    )
    return {
        "referral_code": user.referral_code,
        "share_url": f"/register?ref={user.referral_code}",
        "by_status": by_status,
        "earned_commission_cents": earned,
    }


# --- Partner API keys --------------------------------------------------------
class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


@router.get("/api-keys")
async def list_api_keys(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[dict]:
    result = await db.execute(select(ApiKey).where(ApiKey.user_id == user.id))
    return [
        {
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix,
            "revoked": k.revoked,
            "last_used_at": k.last_used_at,
        }
        for k in result.scalars()
    ]


@router.post("/api-keys", status_code=201)
async def create_api_key(
    payload: ApiKeyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    raw = generate_api_key()
    key = ApiKey(
        user_id=user.id,
        name=payload.name,
        key_hash=hash_password(raw),
        prefix=raw[:8],
    )
    db.add(key)
    await db.flush()
    # The plaintext key is returned exactly once.
    return {"id": key.id, "name": key.name, "api_key": raw, "prefix": key.prefix}


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    key = await db.get(ApiKey, key_id)
    if key and key.user_id == user.id:
        key.revoked = True
    return {"ok": True}
