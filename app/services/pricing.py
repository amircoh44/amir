"""Wholesale tier pricing.

The unit price for a given quantity is the price of the *highest* tier whose
``min_qty`` does not exceed the ordered quantity. If no tier qualifies (or a
product has none), the product's base list price applies.

This is pure, side-effect-free logic so it is trivially unit-testable.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol


class _Tier(Protocol):
    min_qty: int
    unit_price_cents: int


@dataclass(frozen=True)
class PricedLine:
    quantity: int
    unit_price_cents: int
    line_total_cents: int
    list_unit_price_cents: int

    @property
    def savings_cents(self) -> int:
        return max(0, (self.list_unit_price_cents - self.unit_price_cents) * self.quantity)


def unit_price_for_quantity(
    base_price_cents: int, tiers: Iterable[_Tier], quantity: int
) -> int:
    """Return the effective per-unit price (in cents) for ``quantity`` units."""
    best = base_price_cents
    best_min = 0
    for tier in tiers:
        if quantity >= tier.min_qty and tier.min_qty >= best_min:
            best = tier.unit_price_cents
            best_min = tier.min_qty
    return best


def price_line(
    base_price_cents: int, tiers: Iterable[_Tier], quantity: int
) -> PricedLine:
    tiers = list(tiers)
    unit = unit_price_for_quantity(base_price_cents, tiers, quantity)
    return PricedLine(
        quantity=quantity,
        unit_price_cents=unit,
        line_total_cents=unit * quantity,
        list_unit_price_cents=base_price_cents,
    )
