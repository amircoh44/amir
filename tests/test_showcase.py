"""Tests for showcase profile updates + geocoding (no network calls)."""

from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.services import geocoding
from app.services.showcase import apply_profile_update


def _user():
    return SimpleNamespace(
        business_name=None, website=None, public_info=None,
        street_address=None, city=None, state=None,
        latitude=None, longitude=None, show_on_map=False,
    )


def test_compose_address_appends_default_country():
    addr = geocoding.compose_address(street="1 A St", city="Denver", state="CO")
    assert addr == "1 A St, Denver, CO, USA"
    # Empty parts are dropped.
    assert geocoding.compose_address(city="Austin", state="TX") == "Austin, TX, USA"


@pytest.mark.asyncio
async def test_geocode_disabled_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "geocoding_enabled", False)
    assert await geocoding.geocode("anywhere") is None


@pytest.mark.asyncio
async def test_explicit_coords_skip_geocoding(monkeypatch):
    # If geocoding were attempted, this would blow up — proving it's skipped.
    async def _boom(*a, **k):
        raise AssertionError("geocoding should not run when coords are explicit")

    monkeypatch.setattr(geocoding, "geocode_parts", _boom)
    monkeypatch.setattr("app.services.showcase.geocode_parts", _boom)

    user = _user()
    await apply_profile_update(
        user, {"city": "Reno", "state": "nv", "latitude": 39.5, "longitude": -119.8}
    )
    assert (user.latitude, user.longitude) == (39.5, -119.8)
    assert user.state == "NV"  # normalized to upper-case


@pytest.mark.asyncio
async def test_address_change_triggers_geocode(monkeypatch):
    called = {}

    async def fake_geocode(street, city, state):
        called["args"] = (street, city, state)
        return (30.27, -97.74)

    monkeypatch.setattr("app.services.showcase.geocode_parts", fake_geocode)

    user = _user()
    await apply_profile_update(user, {"city": "Austin", "state": "TX"})
    assert called["args"] == (None, "Austin", "TX")
    assert (user.latitude, user.longitude) == (30.27, -97.74)
