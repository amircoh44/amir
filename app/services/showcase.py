"""Apply profile/showcase field updates with automatic geocoding.

Shared by the customer account endpoint and the admin curation endpoint so the
"address -> lat/lon" behavior is identical in both places.
"""

from __future__ import annotations

from app.models import User
from app.services.geocoding import geocode_parts

_LOCATION_FIELDS = {"street_address", "city", "state"}


async def apply_profile_update(user: User, data: dict) -> None:
    """Set the provided fields on ``user``; geocode when the address changed.

    If the caller supplies ``latitude``/``longitude`` explicitly, those win and
    no geocoding happens. Otherwise, when any address part changed, we resolve
    coordinates from the (updated) street/city/state so the globe stays accurate.
    """
    if data.get("state"):
        data["state"] = data["state"].upper()

    for field, value in data.items():
        setattr(user, field, value)

    explicit_coords = "latitude" in data or "longitude" in data
    location_changed = bool(_LOCATION_FIELDS & data.keys())
    if not explicit_coords and location_changed:
        coords = await geocode_parts(user.street_address, user.city, user.state)
        if coords:
            user.latitude, user.longitude = coords
