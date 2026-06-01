"""SQLAlchemy models.

Importing the model modules here ensures every table is registered on
``Base.metadata`` before Alembic autogenerate or ``create_all`` run.
"""

from app.models.base import Base
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import PriceTier, Product, ProductType
from app.models.quote import Quote, QuoteStatus
from app.models.referral import Referral, ReferralStatus
from app.models.user import ApiKey, User, UserRole, VerificationStatus

__all__ = [
    "Base",
    "User",
    "UserRole",
    "VerificationStatus",
    "ApiKey",
    "Product",
    "ProductType",
    "PriceTier",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
    "OrderStatus",
    "PaymentStatus",
    "Quote",
    "QuoteStatus",
    "Referral",
    "ReferralStatus",
]
