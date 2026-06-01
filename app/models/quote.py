"""Quote requests for custom / large bulk deals outside standard tiers."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class QuoteStatus(str, enum.Enum):
    open = "open"            # submitted by customer
    responded = "responded"  # admin sent a quoted price
    accepted = "accepted"
    declined = "declined"
    expired = "expired"


class Quote(Base, TimestampMixin):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id"), default=None)

    product_description: Mapped[str] = mapped_column(Text)  # free text for custom asks
    requested_quantity: Mapped[int] = mapped_column(Integer)
    target_unit_price_cents: Mapped[int | None] = mapped_column(Integer, default=None)
    message: Mapped[str | None] = mapped_column(Text, default=None)

    status: Mapped[QuoteStatus] = mapped_column(
        Enum(QuoteStatus, name="quote_status"), default=QuoteStatus.open, index=True
    )
    # Admin response
    quoted_unit_price_cents: Mapped[int | None] = mapped_column(Integer, default=None)
    admin_response: Mapped[str | None] = mapped_column(Text, default=None)

    user = relationship("User", lazy="selectin")
    product = relationship("Product", lazy="selectin")
