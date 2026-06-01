"""Public product catalog: browse, filter, sort, and product detail."""

from __future__ import annotations

from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Product, ProductType
from app.schemas.product import ProductOut

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


class SortBy(str, Enum):
    name = "name"
    price = "price"
    thc = "thc"
    cbd = "cbd"
    newest = "newest"


@router.get("/products", response_model=list[ProductOut])
async def list_products(
    db: AsyncSession = Depends(get_db),
    product_type: ProductType | None = None,
    min_thc: float | None = Query(default=None, ge=0, le=100),
    max_thc: float | None = Query(default=None, ge=0, le=100),
    min_cbd: float | None = Query(default=None, ge=0, le=100),
    in_stock_only: bool = False,
    search: str | None = None,
    sort: SortBy = SortBy.newest,
    limit: int = Query(default=48, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[Product]:
    stmt = select(Product).where(Product.is_active.is_(True))

    if product_type is not None:
        stmt = stmt.where(Product.product_type == product_type)
    if min_thc is not None:
        stmt = stmt.where(Product.thc_percent >= min_thc)
    if max_thc is not None:
        stmt = stmt.where(Product.thc_percent <= max_thc)
    if min_cbd is not None:
        stmt = stmt.where(Product.cbd_percent >= min_cbd)
    if in_stock_only:
        stmt = stmt.where(Product.stock_qty > 0)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(Product.name.ilike(like) | Product.strain.ilike(like))

    sort_map = {
        SortBy.name: Product.name.asc(),
        SortBy.price: Product.base_price_cents.asc(),
        SortBy.thc: Product.thc_percent.desc(),
        SortBy.cbd: Product.cbd_percent.desc(),
        SortBy.newest: Product.created_at.desc(),
    }
    stmt = stmt.order_by(sort_map[sort]).limit(limit).offset(offset)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, db: AsyncSession = Depends(get_db)) -> Product:
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    if product is None or not product.is_active:
        raise HTTPException(404, "Product not found")
    return product
