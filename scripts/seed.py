"""Seed demo data: an admin, a verified buyer, and a few products with tiers.

Run after init_db.py / migrations:
    python -m scripts.seed
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.core.utils import new_referral_code, unique_slug
from app.models import (
    Cart,
    PriceTier,
    Product,
    ProductType,
    User,
    UserRole,
    VerificationStatus,
)

PRODUCTS = [
    {
        "name": "Sour Diesel — Premium Flower",
        "product_type": ProductType.flower,
        "thc_percent": 24.5, "cbd_percent": 0.3, "strain": "Sour Diesel",
        "unit_label": "lb", "base_price_cents": 120000, "min_order_qty": 5, "stock_qty": 800,
        "tiers": [(10, 110000), (50, 98000), (250, 88000), (1000, 79000)],
    },
    {
        "name": "Full-Spectrum CBD Biomass",
        "product_type": ProductType.biomass,
        "thc_percent": 0.3, "cbd_percent": 12.0, "strain": "Hemp",
        "unit_label": "lb", "base_price_cents": 4000, "min_order_qty": 100, "stock_qty": 50000,
        "tiers": [(500, 3500), (2000, 3000), (10000, 2400)],
    },
    {
        "name": "CBD Isolate 99% — Bulk Kilo",
        "product_type": ProductType.isolate,
        "thc_percent": 0.0, "cbd_percent": 99.0, "strain": None,
        "unit_label": "kg", "base_price_cents": 90000, "min_order_qty": 1, "stock_qty": 600,
        "tiers": [(5, 82000), (25, 74000), (100, 65000)],
    },
    {
        "name": "1:1 THC:CBD Tincture — Case",
        "product_type": ProductType.tincture,
        "thc_percent": 10.0, "cbd_percent": 10.0, "strain": None,
        "unit_label": "case", "base_price_cents": 24000, "min_order_qty": 2, "stock_qty": 1200,
        "tiers": [(10, 21000), (50, 18000)],
    },
]


async def _exists(db, model, **filters) -> bool:
    stmt = select(model)
    for field, value in filters.items():
        stmt = stmt.where(getattr(model, field) == value)
    return (await db.execute(stmt)).scalar_one_or_none() is not None


async def main() -> None:
    async with SessionLocal() as db:
        # Admin
        if not await _exists(db, User, email="admin@greenbulk.example"):
            admin = User(
                email="admin@greenbulk.example",
                hashed_password=hash_password("admin-change-me-1234"),
                role=UserRole.admin,
                verification_status=VerificationStatus.approved,
                business_name="GreenBulk HQ",
                referral_code=new_referral_code(),
            )
            db.add(admin)
            await db.flush()
            db.add(Cart(user_id=admin.id))

        # Verified buyer
        if not await _exists(db, User, email="buyer@example.com"):
            buyer = User(
                email="buyer@example.com",
                hashed_password=hash_password("buyer-change-me-1234"),
                role=UserRole.customer,
                verification_status=VerificationStatus.approved,
                business_name="Acme Dispensary LLC",
                contact_name="Pat Buyer",
                state="CA",
                referral_code=new_referral_code(),
            )
            db.add(buyer)
            await db.flush()
            db.add(Cart(user_id=buyer.id))

        # Products
        for spec in PRODUCTS:
            if await _exists(db, Product, name=spec["name"]):
                continue
            tiers = spec.pop("tiers")
            product = Product(slug=unique_slug(spec["name"]), **spec)
            for min_qty, price in tiers:
                product.price_tiers.append(PriceTier(min_qty=min_qty, unit_price_cents=price))
            db.add(product)

        await db.commit()
    print("✓ Seed complete. Admin: admin@greenbulk.example / admin-change-me-1234")


if __name__ == "__main__":
    asyncio.run(main())
