"""Customer order history and reorder."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Cart, CartItem, Order, Product, User
from app.schemas.order import OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=list[OrderOut])
async def my_orders(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[Order]:
    result = await db.execute(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{order_number}", response_model=OrderOut)
async def order_detail(
    order_number: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Order:
    result = await db.execute(
        select(Order).where(
            Order.order_number == order_number, Order.user_id == user.id
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(404, "Order not found")
    return order


@router.post("/{order_number}/reorder")
async def reorder(
    order_number: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Repopulate the cart from a past order (skips items no longer available)."""
    result = await db.execute(
        select(Order).where(
            Order.order_number == order_number, Order.user_id == user.id
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(404, "Order not found")

    cart_res = await db.execute(select(Cart).where(Cart.user_id == user.id))
    cart = cart_res.scalar_one_or_none()
    if cart is None:
        cart = Cart(user_id=user.id)
        db.add(cart)
        await db.flush()

    added, skipped = 0, 0
    for item in order.items:
        if item.product_id is None:
            skipped += 1
            continue
        product = await db.get(Product, item.product_id)
        if product is None or not product.is_active:
            skipped += 1
            continue
        existing = next((i for i in cart.items if i.product_id == product.id), None)
        if existing:
            existing.quantity += item.quantity
        else:
            cart.items.append(CartItem(product_id=product.id, quantity=item.quantity))
        added += 1
    await db.flush()
    return {"added": added, "skipped": skipped}
