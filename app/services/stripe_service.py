"""Stripe Checkout session creation and webhook signature verification.

We never trust client-side payment state: order status is only advanced when a
signed webhook (``checkout.session.completed`` / ``payment_intent`` events) is
verified against ``STRIPE_WEBHOOK_SECRET``.
"""

from __future__ import annotations

import stripe

from app.core.config import settings

if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


class StripeNotConfigured(RuntimeError):
    pass


def create_checkout_session(
    *,
    order_number: str,
    line_items: list[dict],
    customer_email: str,
    success_url: str,
    cancel_url: str,
) -> stripe.checkout.Session:
    """Create a Checkout Session. ``line_items`` use Stripe's price_data shape."""
    if not settings.stripe_enabled:
        raise StripeNotConfigured("STRIPE_SECRET_KEY is not set")
    return stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        customer_email=customer_email,
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=order_number,
        metadata={"order_number": order_number},
        payment_intent_data={"metadata": {"order_number": order_number}},
    )


def build_line_item(name: str, unit_price_cents: int, quantity: int) -> dict:
    return {
        "price_data": {
            "currency": settings.stripe_currency,
            "product_data": {"name": name},
            "unit_amount": unit_price_cents,
        },
        "quantity": quantity,
    }


def verify_webhook(payload: bytes, signature: str) -> stripe.Event:
    """Verify a webhook signature and return the parsed event.

    Raises ``stripe.error.SignatureVerificationError`` if the signature is bad.
    """
    return stripe.Webhook.construct_event(
        payload, signature, settings.stripe_webhook_secret
    )
