"""Unit tests for wholesale tier pricing (pure, no DB needed)."""

from dataclasses import dataclass

from app.services import pricing


@dataclass
class Tier:
    min_qty: int
    unit_price_cents: int


TIERS = [Tier(10, 11000), Tier(50, 9800), Tier(250, 8800), Tier(1000, 7900)]
BASE = 12000


def test_below_first_tier_uses_base_price():
    assert pricing.unit_price_for_quantity(BASE, TIERS, 5) == BASE


def test_exact_tier_boundary_applies_that_tier():
    assert pricing.unit_price_for_quantity(BASE, TIERS, 10) == 11000
    assert pricing.unit_price_for_quantity(BASE, TIERS, 250) == 8800


def test_highest_qualifying_tier_wins():
    assert pricing.unit_price_for_quantity(BASE, TIERS, 75) == 9800
    assert pricing.unit_price_for_quantity(BASE, TIERS, 5000) == 7900


def test_no_tiers_falls_back_to_base():
    assert pricing.unit_price_for_quantity(BASE, [], 9999) == BASE


def test_price_line_totals_and_savings():
    line = pricing.price_line(BASE, TIERS, 1000)
    assert line.unit_price_cents == 7900
    assert line.line_total_cents == 7900 * 1000
    # savings vs list price
    assert line.savings_cents == (BASE - 7900) * 1000
