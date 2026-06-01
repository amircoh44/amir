"""Checkout: turn the cart into a pending order and start Stripe Checkout."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_verified
from app.models import Cart, CartItem, User
from app.schemas.order import CheckoutResponse
from app.services import stripe_service
from app.services.orders import create_order_from_cart

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


@router.post("", response_model=CheckoutResponse)
async def start_checkout(
    user: User = Depends(require_verified),  # compliance gate: verified buyers only
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    order = await create_order_from_cart(db, user)

    if not settings.stripe_enabled:
        # Dev/offline path: order is created but no hosted payment page exists.
        return CheckoutResponse(order_number=order.order_number, checkout_url=None)

    line_items = [
        stripe_service.build_line_item(i.product_name, i.unit_price_cents, i.quantity)
        for i in order.items
    ]
    session = stripe_service.create_checkout_session(
        order_number=order.order_number,
        line_items=line_items,
        customer_email=user.email,
        success_url=f"{settings.base_url}/checkout/success?order={order.order_number}",
        cancel_url=f"{settings.base_url}/checkout/cancel?order={order.order_number}",
    )
    order.stripe_session_id = session.id

    # Clear the cart once the order is captured.
    cart = (
        await db.execute(select(Cart).where(Cart.user_id == user.id))
    ).scalar_one_or_none()
    if cart:
        await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))

    return CheckoutResponse(order_number=order.order_number, checkout_url=session.url)
