"""Referral / affiliate tracking for B2B partners."""

from __future__ import annotations

import enum

from sqlalchemy import Enum, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ReferralStatus(str, enum.Enum):
    pending = "pending"        # referred account created, not yet purchased
    qualified = "qualified"    # referred account placed a paid order
    paid_out = "paid_out"      # commission settled
    void = "void"


class Referral(Base, TimestampMixin):
    """Links a referring partner to a referred account + earned commission.

    A row is created when a new user signs up via a referral code. It becomes
    ``qualified`` once the referred account completes its first paid order.
    """

    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    referrer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    referred_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True
    )
    triggering_order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id"), default=None
    )

    status: Mapped[ReferralStatus] = mapped_column(
        Enum(ReferralStatus, name="referral_status"), default=ReferralStatus.pending
    )
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 4), default=0.05)  # 5%
    commission_cents: Mapped[int] = mapped_column(Integer, default=0)

    referrer = relationship("User", foreign_keys=[referrer_id], lazy="selectin")
    referred_user = relationship("User", foreign_keys=[referred_user_id], lazy="selectin")
