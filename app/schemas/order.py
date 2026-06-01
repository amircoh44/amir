from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus, PaymentStatus


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: int | None
    product_name: str
    unit_label: str
    quantity: int
    unit_price_cents: int
    line_total_cents: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal_cents: int
    discount_cents: int
    total_cents: int
    currency: str
    tracking_number: str | None
    created_at: datetime
    items: list[OrderItemOut] = Field(default_factory=list)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: str | None = None


class CheckoutResponse(BaseModel):
    order_number: str
    checkout_url: str | None = None  # None when Stripe is not configured
