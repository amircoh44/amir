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

# Demo partners shown on the public "our customers" globe.
SHOWCASE_CUSTOMERS = [
    {
        "email": "partner-denver@example.com",
        "business_name": "Mile High Wholesale Co.",
        "contact_name": "Jordan Pike",
        "state": "CO", "city": "Denver",
        "website": "milehighwholesale.example",
        "public_info": "Colorado's bulk flower and concentrate distributor since 2016.",
        "latitude": 39.7392, "longitude": -104.9903,
    },
    {
        "email": "partner-portland@example.com",
        "business_name": "Cascadia Botanicals",
        "contact_name": "Sam Rivers",
        "state": "OR", "city": "Portland",
        "website": "cascadiabotanicals.example",
        "public_info": "Pacific Northwest CBD wellness brand and retail chain.",
        "latitude": 45.5152, "longitude": -122.6784,
    },
    {
        "email": "partner-detroit@example.com",
        "business_name": "Great Lakes Green",
        "contact_name": "Riley Okafor",
        "state": "MI", "city": "Detroit",
        "website": "greatlakesgreen.example",
        "public_info": "Midwest wholesale supplier and white-label manufacturer.",
        "latitude": 42.3314, "longitude": -83.0458,
    },
    {
        "email": "partner-boston@example.com",
        "business_name": "Harbor & Hemp",
        "contact_name": "Casey Lin",
        "state": "MA", "city": "Boston",
        "website": "harborandhemp.example",
        "public_info": "New England dispensary network and tincture producer.",
        "latitude": 42.3601, "longitude": -71.0589,
    },
    {
        "email": "partner-austin@example.com",
        "business_name": "Lone Star Leaf",
        "contact_name": "Dana Cruz",
        "state": "TX", "city": "Austin",
        "website": "lonestarleaf.example",
        "public_info": "Texas hemp-derived products distributor.",
        "latitude": 30.2672, "longitude": -97.7431,
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

        # Verified buyer (also opted in to the public customer globe)
        if not await _exists(db, User, email="buyer@example.com"):
            buyer = User(
                email="buyer@example.com",
                hashed_password=hash_password("buyer-change-me-1234"),
                role=UserRole.customer,
                verification_status=VerificationStatus.approved,
                business_name="Acme Dispensary LLC",
                contact_name="Pat Buyer",
                state="CA",
                city="Los Angeles",
                website="acme-dispensary.example",
                public_info="Multi-location dispensary group serving Southern California.",
                latitude=34.0522,
                longitude=-118.2437,
                show_on_map=True,
                referral_code=new_referral_code(),
            )
            db.add(buyer)
            await db.flush()
            db.add(Cart(user_id=buyer.id))

        # Additional showcase customers for the globe.
        for c in SHOWCASE_CUSTOMERS:
            if await _exists(db, User, email=c["email"]):
                continue
            user = User(
                hashed_password=hash_password("partner-change-me-1234"),
                role=UserRole.customer,
                verification_status=VerificationStatus.approved,
                show_on_map=True,
                referral_code=new_referral_code(),
                **c,
            )
            db.add(user)
            await db.flush()
            db.add(Cart(user_id=user.id))

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
