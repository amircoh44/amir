"""User accounts, roles, business verification, and partner API keys."""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    customer = "customer"   # B2B buyer
    admin = "admin"         # owner/operator


class VerificationStatus(str, enum.Enum):
    """Business-verification gating for compliance (see docs/COMPLIANCE.md)."""

    pending = "pending"     # signed up, cannot purchase yet
    approved = "approved"   # verified business, may purchase
    rejected = "rejected"
    suspended = "suspended"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)

    # Null for OAuth-only accounts (no password fallback set).
    hashed_password: Mapped[str | None] = mapped_column(String(255), default=None)
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, default=None)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.customer
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # --- Business profile (B2B) ---
    business_name: Mapped[str | None] = mapped_column(String(255), default=None)
    contact_name: Mapped[str | None] = mapped_column(String(255), default=None)
    phone: Mapped[str | None] = mapped_column(String(40), default=None)
    tax_id: Mapped[str | None] = mapped_column(String(64), default=None)  # EIN / reseller cert
    license_number: Mapped[str | None] = mapped_column(String(128), default=None)
    state: Mapped[str | None] = mapped_column(String(2), default=None)  # ISO-2 for restrictions

    # --- Public "our customers" showcase (opt-in, rendered on the globe) ---
    website: Mapped[str | None] = mapped_column(String(255), default=None)
    public_info: Mapped[str | None] = mapped_column(Text, default=None)
    street_address: Mapped[str | None] = mapped_column(String(255), default=None)
    city: Mapped[str | None] = mapped_column(String(120), default=None)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)
    show_on_map: Mapped[bool] = mapped_column(Boolean, default=False)

    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus, name="verification_status"),
        default=VerificationStatus.pending,
    )
    verification_notes: Mapped[str | None] = mapped_column(Text, default=None)

    # --- Referral linkage ---
    referral_code: Mapped[str | None] = mapped_column(String(32), unique=True, default=None)
    referred_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), default=None
    )

    orders = relationship("Order", back_populates="user", lazy="selectin")
    cart = relationship("Cart", back_populates="user", uselist=False)
    api_keys = relationship("ApiKey", back_populates="user", lazy="selectin")

    @property
    def can_purchase(self) -> bool:
        return self.is_active and self.verification_status == VerificationStatus.approved


class ApiKey(Base, TimestampMixin):
    """Hashed API keys for partner integrations against the public API."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    # Store only a hash of the key; the plaintext is shown once at creation.
    key_hash: Mapped[str] = mapped_column(String(255), index=True)
    prefix: Mapped[str] = mapped_column(String(12))  # for display, e.g. "gbk_AbC1"
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="api_keys")
