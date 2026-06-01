"""Stripe webhooks — the *only* trusted source of payment state."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Order, PaymentStatus
from app.services import stripe_service
from app.services.email import send_order_confirmation
from app.services.orders import mark_order_paid

logger = logging.getLogger("greenbulk.webhooks")
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
) -> dict:
    payload = await request.body()
    try:
        event = stripe_service.verify_webhook(payload, stripe_signature)
    except Exception as exc:  # noqa: BLE001 — bad signature / malformed payload
        logger.warning("Rejected Stripe webhook: %s", exc)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid signature") from exc

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        order_number = (obj.get("metadata") or {}).get("order_number") or obj.get(
            "client_reference_id"
        )
        await _settle(db, order_number, payment_intent=obj.get("payment_intent"))
    elif event_type == "payment_intent.succeeded":
        order_number = (obj.get("metadata") or {}).get("order_number")
        await _settle(db, order_number, payment_intent=obj.get("id"))
    else:
        logger.debug("Unhandled Stripe event: %s", event_type)

    return {"received": True}


async def _settle(db: AsyncSession, order_number: str | None, payment_intent: str | None) -> None:
    if not order_number:
        return
    result = await db.execute(select(Order).where(Order.order_number == order_number))
    order = result.scalar_one_or_none()
    if order is None or order.payment_status == PaymentStatus.paid:
        return  # unknown order or already settled (idempotent)
    order.stripe_payment_intent = payment_intent
    await mark_order_paid(db, order)
    if order.user:
        send_order_confirmation(order.user.email, order.order_number, order.total_cents)
