"""Order assembly from a cart, and post-payment side effects."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import reference
from app.models import (
    Cart,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    Product,
    Referral,
    ReferralStatus,
    User,
)
from app.services import pricing


async def create_order_from_cart(db: AsyncSession, user: User) -> Order:
    """Snapshot the user's cart into a pending order with tier pricing applied.

    Validates stock and minimum order quantities. Does NOT decrement stock —
    that happens on confirmed payment via the webhook.
    """
    result = await db.execute(select(Cart).where(Cart.user_id == user.id))
    cart = result.scalar_one_or_none()
    if cart is None or not cart.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cart is empty")

    order = Order(order_number=reference("ORD"), user_id=user.id, status=OrderStatus.pending)
    subtotal = 0

    for item in cart.items:
        product: Product = item.product
        if not product.is_active:
            raise HTTPException(status.HTTP_409_CONFLICT, f"{product.name} is unavailable")
        if item.quantity < product.min_order_qty:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"{product.name} has a minimum order of "
                f"{product.min_order_qty} {product.unit_label}",
            )
        if item.quantity > product.stock_qty:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Only {product.stock_qty} {product.unit_label} of {product.name} in stock",
            )

        line = pricing.price_line(product.base_price_cents, product.price_tiers, item.quantity)
        subtotal += line.line_total_cents
        order.items.append(
            OrderItem(
                product_id=product.id,
                product_name=product.name,
                unit_label=product.unit_label,
                quantity=item.quantity,
                unit_price_cents=line.unit_price_cents,
                line_total_cents=line.line_total_cents,
            )
        )

    order.subtotal_cents = subtotal
    order.total_cents = subtotal  # discounts (referral/promo) can adjust later
    db.add(order)
    await db.flush()
    return order


async def mark_order_paid(db: AsyncSession, order: Order) -> None:
    """Idempotently advance a paid order: decrement stock, qualify referral."""
    if order.payment_status == PaymentStatus.paid:
        return

    order.payment_status = PaymentStatus.paid
    order.status = OrderStatus.paid

    for item in order.items:
        if item.product_id is None:
            continue
        product = await db.get(Product, item.product_id)
        if product:
            product.stock_qty = max(0, product.stock_qty - item.quantity)

    await _qualify_referral(db, order)


async def _qualify_referral(db: AsyncSession, order: Order) -> None:
    """If this is the referred user's first paid order, qualify the referral."""
    result = await db.execute(
        select(Referral).where(
            Referral.referred_user_id == order.user_id,
            Referral.status == ReferralStatus.pending,
        )
    )
    ref = result.scalar_one_or_none()
    if ref is None:
        return
    ref.status = ReferralStatus.qualified
    ref.triggering_order_id = order.id
    ref.commission_cents = int(order.total_cents * float(ref.commission_rate))
