"""Payment provider abstraction.

The whole marketplace is built money-free behind this interface. Phase 1 ships
the NullPaymentProvider, which records *intents* and returns synthetic refs —
NO real money moves. Phase 2 drops in a StripeConnectProvider implementing the
same methods (charges, escrow-style holds, Connect payouts, KYC onboarding,
1099 tax reporting, subscriptions) without touching the domain or the engine.
"""
from __future__ import annotations

import uuid
from typing import Protocol, runtime_checkable


@runtime_checkable
class PaymentProvider(Protocol):
    """Contract a real processor (e.g. Stripe Connect) must satisfy."""
    name: str

    def create_pledge(self, amount_cents: int, currency: str, payer_ref: str, metadata: dict) -> dict: ...
    def capture(self, provider_ref: str) -> dict: ...
    def refund(self, provider_ref: str, amount_cents: int | None = None) -> dict: ...
    def payout(self, recipient_ref: str, amount_cents: int, metadata: dict) -> dict: ...
    def onboard_recipient(self, user_ref: str) -> dict: ...
    def create_subscription(self, customer_ref: str, price_cents: int, interval: str) -> dict: ...


class NullPaymentProvider:
    """Money-free provider. Records intents; moves no money. Used for phase 1
    and for tests. Every method returns a synthetic reference and a status that
    makes it explicit that nothing was charged."""
    name = "null"

    def _ref(self, kind: str) -> str:
        return f"{kind}_{uuid.uuid4().hex[:16]}"

    def create_pledge(self, amount_cents: int, currency: str, payer_ref: str, metadata: dict) -> dict:
        return {"provider_ref": self._ref("pledge"), "status": "intent", "live": False,
                "amount_cents": int(amount_cents), "currency": currency}

    def capture(self, provider_ref: str) -> dict:
        return {"provider_ref": provider_ref, "status": "captured", "live": False}

    def refund(self, provider_ref: str, amount_cents: int | None = None) -> dict:
        return {"provider_ref": provider_ref, "status": "refunded", "live": False,
                "amount_cents": amount_cents}

    def payout(self, recipient_ref: str, amount_cents: int, metadata: dict) -> dict:
        return {"provider_ref": self._ref("payout"), "status": "recorded", "live": False,
                "recipient_ref": recipient_ref, "amount_cents": int(amount_cents)}

    def onboard_recipient(self, user_ref: str) -> dict:
        # Real impl returns a Stripe Connect onboarding URL + KYC status.
        return {"recipient_ref": user_ref, "kyc_status": "not_required", "onboarding_url": None, "live": False}

    def create_subscription(self, customer_ref: str, price_cents: int, interval: str) -> dict:
        return {"provider_ref": self._ref("sub"), "status": "intent", "live": False,
                "price_cents": int(price_cents), "interval": interval}


# The active provider. Phase 2 swaps this for StripeConnectProvider(get_settings()).
_provider: PaymentProvider = NullPaymentProvider()


def get_payment_provider() -> PaymentProvider:
    return _provider
