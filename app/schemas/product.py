from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.product import ProductType


class PriceTierIn(BaseModel):
    min_qty: int = Field(gt=0)
    unit_price_cents: int = Field(ge=0)


class PriceTierOut(PriceTierIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    description: str | None = None
    product_type: ProductType
    thc_percent: float = Field(ge=0, le=100, default=0)
    cbd_percent: float = Field(ge=0, le=100, default=0)
    strain: str | None = None
    unit_label: str = "lb"
    base_price_cents: int = Field(ge=0)
    min_order_qty: int = Field(ge=1, default=1)
    stock_qty: int = Field(ge=0, default=0)
    is_active: bool = True
    image_url: str | None = None
    model_url: str | None = None


class ProductCreate(ProductBase):
    price_tiers: list[PriceTierIn] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    product_type: ProductType | None = None
    thc_percent: float | None = Field(default=None, ge=0, le=100)
    cbd_percent: float | None = Field(default=None, ge=0, le=100)
    strain: str | None = None
    unit_label: str | None = None
    base_price_cents: int | None = Field(default=None, ge=0)
    min_order_qty: int | None = Field(default=None, ge=1)
    stock_qty: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    image_url: str | None = None
    model_url: str | None = None
    price_tiers: list[PriceTierIn] | None = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    cbd_thc_ratio: str
    in_stock: bool
    price_tiers: list[PriceTierOut] = Field(default_factory=list)
