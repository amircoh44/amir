"""Cart management for the authenticated buyer."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models import Cart, CartItem, Product, User
from app.schemas.order import CartItemIn
from app.services import pricing

router = APIRouter(prefix="/api/cart", tags=["cart"])


async def _get_or_create_cart(db: AsyncSession, user: User) -> Cart:
    result = await db.execute(select(Cart).where(Cart.user_id == user.id))
    cart = result.scalar_one_or_none()
    if cart is None:
        cart = Cart(user_id=user.id)
        db.add(cart)
        await db.flush()
    return cart


def _serialize(cart: Cart) -> dict:
    items = []
    subtotal = 0
    for item in cart.items:
        p: Product = item.product
        line = pricing.price_line(p.base_price_cents, p.price_tiers, item.quantity)
        subtotal += line.line_total_cents
        items.append(
            {
                "product_id": p.id,
                "name": p.name,
                "unit_label": p.unit_label,
                "quantity": item.quantity,
                "unit_price_cents": line.unit_price_cents,
                "list_unit_price_cents": line.list_unit_price_cents,
                "line_total_cents": line.line_total_cents,
                "savings_cents": line.savings_cents,
            }
        )
    return {"items": items, "subtotal_cents": subtotal}


@router.get("")
async def view_cart(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    return _serialize(await _get_or_create_cart(db, user))


@router.post("/items")
async def add_item(
    payload: CartItemIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    product = await db.get(Product, payload.product_id)
    if product is None or not product.is_active:
        raise HTTPException(404, "Product not found")

    cart = await _get_or_create_cart(db, user)
    existing = next((i for i in cart.items if i.product_id == product.id), None)
    if existing:
        existing.quantity += payload.quantity
    else:
        cart.items.append(CartItem(product_id=product.id, quantity=payload.quantity))
    await db.flush()
    return _serialize(cart)


@router.put("/items/{product_id}")
async def set_item_quantity(
    product_id: int,
    payload: CartItemIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    cart = await _get_or_create_cart(db, user)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item is None:
        raise HTTPException(404, "Item not in cart")
    item.quantity = payload.quantity
    await db.flush()
    return _serialize(cart)


@router.delete("/items/{product_id}")
async def remove_item(
    product_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    cart = await _get_or_create_cart(db, user)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if item:
        await db.delete(item)
        await db.flush()
        await db.refresh(cart)
    return _serialize(cart)
