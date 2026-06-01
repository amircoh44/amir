"""Products, cannabinoid attributes, and wholesale price tiers."""

from __future__ import annotations

import enum

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ProductType(str, enum.Enum):
    flower = "flower"
    pre_roll = "pre_roll"
    concentrate = "concentrate"
    edible = "edible"
    vape = "vape"
    tincture = "tincture"
    topical = "topical"
    isolate = "isolate"
    biomass = "biomass"


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    product_type: Mapped[ProductType] = mapped_column(
        Enum(ProductType, name="product_type"), index=True
    )

    # --- Cannabinoid attributes (filterable) ---
    thc_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)   # e.g. 22.50
    cbd_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    # Stored ratio string for display ("20:1"); computed conveniently below.
    strain: Mapped[str | None] = mapped_column(String(120), default=None)

    # --- Sales unit + base pricing ---
    unit_label: Mapped[str] = mapped_column(String(32), default="lb")  # lb, kg, unit, case
    base_price_cents: Mapped[int] = mapped_column(Integer)  # per-unit list price
    min_order_qty: Mapped[int] = mapped_column(Integer, default=1)

    # --- Inventory ---
    stock_qty: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- Media (3D / images) ---
    image_url: Mapped[str | None] = mapped_column(String(500), default=None)
    model_url: Mapped[str | None] = mapped_column(String(500), default=None)  # .glb/.gltf

    price_tiers = relationship(
        "PriceTier",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="PriceTier.min_qty",
        lazy="selectin",
    )

    @property
    def cbd_thc_ratio(self) -> str:
        thc = float(self.thc_percent or 0)
        cbd = float(self.cbd_percent or 0)
        if thc == 0 and cbd == 0:
            return "n/a"
        if thc == 0:
            return f"{cbd:g}:0"
        return f"{cbd / thc:.1f}:1" if cbd else "0:1"

    @property
    def in_stock(self) -> bool:
        return self.is_active and self.stock_qty > 0


class PriceTier(Base):
    """Volume break: at/above ``min_qty`` units, charge ``unit_price_cents``.

    Tiers are evaluated per product; the highest ``min_qty`` not exceeding the
    ordered quantity wins (see ``services.pricing``).
    """

    __tablename__ = "price_tiers"
    __table_args__ = (
        UniqueConstraint("product_id", "min_qty", name="uq_product_tier_minqty"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    min_qty: Mapped[int] = mapped_column(Integer)
    unit_price_cents: Mapped[int] = mapped_column(Integer)

    product = relationship("Product", back_populates="price_tiers")
