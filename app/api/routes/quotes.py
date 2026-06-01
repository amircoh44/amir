"""Quote requests for custom / large bulk deals."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.utils import reference
from app.models import Quote, User
from app.schemas.quote import QuoteCreate, QuoteOut

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


@router.post("", response_model=QuoteOut, status_code=201)
async def request_quote(
    payload: QuoteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Quote:
    quote = Quote(
        reference=reference("QTE"),
        user_id=user.id,
        product_id=payload.product_id,
        product_description=payload.product_description,
        requested_quantity=payload.requested_quantity,
        target_unit_price_cents=payload.target_unit_price_cents,
        message=payload.message,
    )
    db.add(quote)
    await db.flush()
    return quote


@router.get("", response_model=list[QuoteOut])
async def my_quotes(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[Quote]:
    result = await db.execute(
        select(Quote).where(Quote.user_id == user.id).order_by(Quote.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{quote_ref}", response_model=QuoteOut)
async def quote_detail(
    quote_ref: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Quote:
    result = await db.execute(
        select(Quote).where(Quote.reference == quote_ref, Quote.user_id == user.id)
    )
    quote = result.scalar_one_or_none()
    if quote is None:
        raise HTTPException(404, "Quote not found")
    return quote
