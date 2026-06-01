"""Public, API-key-authenticated API for the client's partners to integrate.

Rate-limited and read-mostly. Partners authenticate with ``X-API-Key``.
"""

# No ``from __future__ import annotations``: these handlers are wrapped by the
# slowapi limiter, which would break FastAPI's string-annotation resolution.
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_api_key
from app.core.ratelimit import limiter
from app.models import Product, User
from app.schemas.product import ProductOut

router = APIRouter(prefix="/api/v1", tags=["public-api"])


@router.get("/ping")
@limiter.limit(settings.ratelimit_public_api)
async def ping(request: Request, partner: User = Depends(require_api_key)) -> dict:
    return {"ok": True, "partner_id": partner.id}


@router.get("/products", response_model=list[ProductOut])
@limiter.limit(settings.ratelimit_public_api)
async def public_products(
    request: Request,
    partner: User = Depends(require_api_key),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
) -> list[Product]:
    result = await db.execute(
        select(Product)
        .where(Product.is_active.is_(True))
        .order_by(Product.name)
        .limit(min(limit, 200))
        .offset(offset)
    )
    return list(result.scalars().all())


@router.get("/products/{slug}", response_model=ProductOut)
@limiter.limit(settings.ratelimit_public_api)
async def public_product(
    request: Request,
    slug: str,
    partner: User = Depends(require_api_key),
    db: AsyncSession = Depends(get_db),
) -> Product:
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if product is None or not product.is_active:
        raise HTTPException(404, "Product not found")
    return product
