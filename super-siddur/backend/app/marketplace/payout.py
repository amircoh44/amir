"""Pricing / payout engine — pure, deterministic, fully configurable.

This is the heart of the marketplace: given a gross pledge and a set of rates,
it produces a transparent breakdown. Fees are deducted *first* (payment
processor, then app-store), then the platform cut is taken from the net, then
the remainder is distributed among the reciters. No money moves here — this is
arithmetic only, so it is trivially testable and rabbinically reviewable.

All rates live in PayoutConfig (admin-editable); nothing is hard-coded into the
flows. The platform cut defaults to 20% and is hard-capped at 50%.
"""
from __future__ import annotations

from dataclasses import dataclass

PLATFORM_CUT_HARD_MAX = 0.50  # the platform cut can never exceed this, whatever the config says

PAYOUT_MODES = ("tzedaka", "credit", "cash")  # destination of the distributable amount


@dataclass(frozen=True)
class Rates:
    """Immutable snapshot of the configurable rates used for one calculation."""
    processor_fee_pct: float = 0.029      # payment processor percentage (e.g. Stripe 2.9%)
    processor_fee_flat_cents: int = 30    # payment processor flat fee per charge
    appstore_fee_pct: float = 0.30        # app-store cut when the charge flows through IAP (~15–30%)
    platform_cut_pct: float = 0.20        # platform's share of the net (default 20%)
    platform_cut_max_pct: float = 0.50    # admin-set ceiling on the platform cut
    payout_mode: str = "tzedaka"          # where the distributable goes by default


def _r(x: float) -> int:
    return int(round(x))


def effective_platform_cut(rates: Rates) -> float:
    """The platform cut actually applied — clamped to [0, configured max, hard max]."""
    cap = min(rates.platform_cut_max_pct, PLATFORM_CUT_HARD_MAX)
    return max(0.0, min(rates.platform_cut_pct, cap))


def compute_payout(
    gross_cents: int,
    rates: Rates,
    *,
    via_app_store: bool = False,
    recipients: int = 1,
    payout_mode: str | None = None,
) -> dict:
    """Break a gross pledge down into fees, platform cut, and per-reciter payout.

    Order (transparent, fees first):
        gross
          − processor fee (pct·gross + flat)
          − app-store fee  (pct·gross, only if charged through IAP)
          = net
          − platform cut   (cut_pct·net, cut_pct clamped ≤ max)
          = distributable  → split equally among `recipients`

    The returned parts always sum back to gross:
        processor + appstore + platform_cut + distributable == gross
        distributable == per_recipient·recipients + remainder
    """
    gross = max(0, int(gross_cents))
    processor = _r(gross * rates.processor_fee_pct) + (rates.processor_fee_flat_cents if gross > 0 else 0)
    appstore = _r(gross * rates.appstore_fee_pct) if via_app_store else 0
    # never let fees exceed the gross
    fees = min(processor + appstore, gross)
    if processor + appstore > gross:
        # proportionally clamp (rare; tiny pledges) so net is never negative
        processor = min(processor, gross)
        appstore = max(0, gross - processor)
    net = max(0, gross - processor - appstore)

    cut_pct = effective_platform_cut(rates)
    platform_cut = _r(net * cut_pct)
    distributable = max(0, net - platform_cut)

    n = max(0, int(recipients))
    per_recipient = distributable // n if n > 0 else 0
    remainder = distributable - per_recipient * n

    mode = payout_mode or rates.payout_mode
    if mode not in PAYOUT_MODES:
        mode = "tzedaka"

    return {
        "gross_cents": gross,
        "processor_fee_cents": processor,
        "appstore_fee_cents": appstore,
        "net_cents": net,
        "platform_cut_pct": round(cut_pct, 4),
        "platform_cut_cents": platform_cut,
        "distributable_cents": distributable,
        "recipients": n,
        "per_recipient_cents": per_recipient,
        "remainder_cents": remainder,         # routed per config (default: to the tzedaka pool)
        "payout_mode": mode,
        "fee_order": ["processor", "appstore", "platform"],
    }
