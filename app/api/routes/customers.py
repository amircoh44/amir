"""Public 'our customers' showcase — powers the Three.js globe.

Only returns businesses that are **approved** and have **opted in**
(``show_on_map``) with coordinates set. Fields are deliberately limited to
public, non-sensitive business info.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User, VerificationStatus

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("/map")
async def customers_on_map(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(
        select(User).where(
            User.show_on_map.is_(True),
            User.verification_status == VerificationStatus.approved,
            User.latitude.is_not(None),
            User.longitude.is_not(None),
        )
    )
    return [
        {
            "id": u.id,
            "business_name": u.business_name or "Verified partner",
            "website": u.website,
            "info": u.public_info,
            "city": u.city,
            "state": u.state,
            "latitude": float(u.latitude),
            "longitude": float(u.longitude),
        }
        for u in result.scalars()
    ]
