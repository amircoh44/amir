"""Owner-operated admin backend: inventory, orders, customers, analytics."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.utils import unique_slug
from app.models import (
    Order,
    PriceTier,
    Product,
    Quote,
    QuoteStatus,
    User,
    VerificationStatus,
)
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.schemas.quote import QuoteOut, QuoteRespond
from app.services import analytics
from app.services.email import send_quote_response, send_shipping_update
from app.services.showcase import apply_profile_update
from app.services.uploads import save_upload

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# --- Media uploads -----------------------------------------------------------
@router.post("/uploads", status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    kind: str = Query(default="image", pattern="^(image|model)$"),
) -> dict:
    """Store a product image or 3D model; returns the public URL to save on a product."""
    url = await save_upload(file, kind)
    return {"url": url, "kind": kind}


# --- Inventory ---------------------------------------------------------------
@router.get("/products", response_model=list[ProductOut])
async def admin_list_products(db: AsyncSession = Depends(get_db)) -> list[Product]:
    """All products including inactive ones (admin view)."""
    result = await db.execute(select(Product).order_by(Product.created_at.desc()))
    return list(result.scalars().all())


@router.get("/products/{product_id}", response_model=ProductOut)
async def admin_get_product(product_id: int, db: AsyncSession = Depends(get_db)) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "Product not found")
    return product


@router.post("/products", response_model=ProductOut, status_code=201)
async def create_product(payload: ProductCreate, db: AsyncSession = Depends(get_db)) -> Product:
    product = Product(
        slug=unique_slug(payload.name),
        **payload.model_dump(exclude={"price_tiers"}),
    )
    for tier in payload.price_tiers:
        product.price_tiers.append(
            PriceTier(min_qty=tier.min_qty, unit_price_cents=tier.unit_price_cents)
        )
    db.add(product)
    await db.flush()
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: int, payload: ProductUpdate, db: AsyncSession = Depends(get_db)
) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "Product not found")
    data = payload.model_dump(exclude_unset=True)
    tiers = data.pop("price_tiers", None)
    for field, value in data.items():
        setattr(product, field, value)
    if tiers is not None:
        product.price_tiers.clear()
        for tier in tiers:
            product.price_tiers.append(
                PriceTier(min_qty=tier["min_qty"], unit_price_cents=tier["unit_price_cents"])
            )
    await db.flush()
    return product


@router.delete("/products/{product_id}")
async def deactivate_product(product_id: int, db: AsyncSession = Depends(get_db)) -> dict:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "Product not found")
    product.is_active = False  # soft-delete preserves order history
    return {"ok": True}


# --- Orders ------------------------------------------------------------------
@router.get("/orders", response_model=list[OrderOut])
async def all_orders(db: AsyncSession = Depends(get_db)) -> list[Order]:
    result = await db.execute(select(Order).order_by(Order.created_at.desc()).limit(500))
    return list(result.scalars().all())


@router.put("/orders/{order_number}/status", response_model=OrderOut)
async def update_order_status(
    order_number: str, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db)
) -> Order:
    result = await db.execute(select(Order).where(Order.order_number == order_number))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(404, "Order not found")
    order.status = payload.status
    if payload.tracking_number:
        order.tracking_number = payload.tracking_number
        if order.user:
            send_shipping_update(order.user.email, order.order_number, payload.tracking_number)
    return order


# --- Customers ---------------------------------------------------------------
class VerificationUpdate(BaseModel):
    status: VerificationStatus
    notes: str | None = None


class ShowcaseUpdate(BaseModel):
    """Admin curation of who appears on the public customer globe."""

    show_on_map: bool | None = None
    business_name: str | None = None
    website: str | None = None
    public_info: str | None = None
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    latitude: float | None = None
    longitude: float | None = None


@router.get("/customers")
async def list_customers(db: AsyncSession = Depends(get_db)) -> list[dict]:
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(500))
    return [
        {
            "id": u.id,
            "email": u.email,
            "business_name": u.business_name,
            "state": u.state,
            "city": u.city,
            "website": u.website,
            "verification_status": u.verification_status.value,
            "role": u.role.value,
            "is_active": u.is_active,
            "show_on_map": u.show_on_map,
            "latitude": u.latitude,
            "longitude": u.longitude,
        }
        for u in result.scalars()
    ]


@router.put("/customers/{user_id}/verification")
async def set_verification(
    user_id: int, payload: VerificationUpdate, db: AsyncSession = Depends(get_db)
) -> dict:
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Customer not found")
    user.verification_status = payload.status
    user.verification_notes = payload.notes
    return {"ok": True, "verification_status": user.verification_status.value}


@router.put("/customers/{user_id}/showcase")
async def set_showcase(
    user_id: int, payload: ShowcaseUpdate, db: AsyncSession = Depends(get_db)
) -> dict:
    """Curate a customer's globe presence; geocodes the address on save."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Customer not found")
    await apply_profile_update(user, payload.model_dump(exclude_unset=True))
    return {
        "ok": True,
        "show_on_map": user.show_on_map,
        "latitude": user.latitude,
        "longitude": user.longitude,
    }


# --- Quotes ------------------------------------------------------------------
@router.get("/quotes", response_model=list[QuoteOut])
async def admin_quotes(db: AsyncSession = Depends(get_db)) -> list[Quote]:
    result = await db.execute(select(Quote).order_by(Quote.created_at.desc()))
    return list(result.scalars().all())


@router.put("/quotes/{quote_ref}/respond", response_model=QuoteOut)
async def respond_quote(
    quote_ref: str, payload: QuoteRespond, db: AsyncSession = Depends(get_db)
) -> Quote:
    result = await db.execute(select(Quote).where(Quote.reference == quote_ref))
    quote = result.scalar_one_or_none()
    if quote is None:
        raise HTTPException(404, "Quote not found")
    quote.quoted_unit_price_cents = payload.quoted_unit_price_cents
    quote.admin_response = payload.admin_response
    quote.status = payload.status or QuoteStatus.responded
    if quote.user:
        total = f"${payload.quoted_unit_price_cents * quote.requested_quantity / 100:,.2f}"
        send_quote_response(
            quote.user.email, quote.reference, total, payload.admin_response or ""
        )
    return quote


# --- Analytics ---------------------------------------------------------------
@router.get("/analytics")
async def analytics_dashboard(days: int = 30, db: AsyncSession = Depends(get_db)) -> dict:
    return {
        "revenue": await analytics.revenue_summary(db, days),
        "top_products": await analytics.top_products(db),
        "top_customers": await analytics.top_customers(db),
    }
