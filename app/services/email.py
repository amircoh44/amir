"""Transactional email via SendGrid.

When ``SENDGRID_API_KEY`` is unset (development), emails are logged to the
console instead of sent, so the app runs end-to-end with no external account.
"""

from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger("greenbulk.email")


def send_email(to: str, subject: str, html: str, text: str | None = None) -> bool:
    """Send one transactional email. Returns True on success (or dev no-op)."""
    if not settings.sendgrid_api_key:
        logger.info("[email:dev] To=%s | Subject=%s\n%s", to, subject, text or html)
        return True

    # Imported lazily so the dependency isn't required in dev.
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Content, Email, Mail, To

    message = Mail(
        from_email=Email(settings.email_from, settings.email_from_name),
        to_emails=To(to),
        subject=subject,
        html_content=Content("text/html", html),
    )
    if text:
        message.add_content(Content("text/plain", text))
    try:
        resp = SendGridAPIClient(settings.sendgrid_api_key).send(message)
        return 200 <= resp.status_code < 300
    except Exception:  # noqa: BLE001 — never let email failure break a request
        logger.exception("SendGrid send failed for %s", to)
        return False


# --- Templated helpers -------------------------------------------------------
def send_order_confirmation(to: str, order_number: str, total_cents: int) -> bool:
    total = f"${total_cents / 100:,.2f}"
    return send_email(
        to,
        f"Order {order_number} confirmed",
        f"<h2>Thanks for your order</h2><p>Order <b>{order_number}</b> total: {total}.</p>",
        text=f"Order {order_number} confirmed. Total: {total}.",
    )


def send_shipping_update(to: str, order_number: str, tracking: str) -> bool:
    return send_email(
        to,
        f"Order {order_number} shipped",
        f"<p>Your order <b>{order_number}</b> has shipped. Tracking: {tracking}</p>",
        text=f"Order {order_number} shipped. Tracking: {tracking}",
    )


def send_password_reset(to: str, reset_url: str) -> bool:
    return send_email(
        to,
        "Reset your GreenBulk password",
        f'<p>Reset your password: <a href="{reset_url}">{reset_url}</a></p>',
        text=f"Reset your password: {reset_url}",
    )


def send_quote_response(to: str, reference: str, quoted_total: str, message: str) -> bool:
    return send_email(
        to,
        f"Quote {reference} — response",
        f"<p>We've responded to quote <b>{reference}</b>: {quoted_total}</p><p>{message}</p>",
        text=f"Quote {reference}: {quoted_total}\n{message}",
    )
