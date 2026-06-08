"""Partner sync abstraction (B3).

Activity is forwarded to consented partner apps (e.g. 613 Academy) server-to-
server, signed with a shared secret — there are NO user-visible API keys. Phase
1 ships NullPartnerClient (records deliveries, makes no network call). A real
Academy613Client implementing the same interface posts to the partner API with
an HMAC signature header, swapped in without touching the consent/activity flow.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from typing import Protocol, runtime_checkable

from ..config import get_settings


def sign_payload(secret: str, body: dict) -> str:
    """Detached HMAC-SHA256 signature partners verify on delivery."""
    raw = json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


@runtime_checkable
class PartnerClient(Protocol):
    name: str

    def deliver(self, partner: str, external_id: str, event_type: str, payload: dict) -> dict: ...


class NullPartnerClient:
    """Records deliveries without any network call (phase 1 / tests)."""
    name = "null"

    def deliver(self, partner: str, external_id: str, event_type: str, payload: dict) -> dict:
        secret = _partner_secret(partner)
        body = {"partner": partner, "external_id": external_id, "type": event_type, "payload": payload}
        return {"partner": partner, "status": "recorded", "live": False,
                "ref": f"dlv_{uuid.uuid4().hex[:16]}",
                "signed": bool(secret) and sign_payload(secret, body)[:12] or None}


def _partner_secret(partner: str) -> str:
    # Real secrets come from env (e.g. SIDDUR_ACADEMY613_SECRET). Absent in phase 1.
    s = get_settings()
    return getattr(s, f"{partner}_secret", "") or ""


_client: PartnerClient = NullPartnerClient()


def get_partner_client() -> PartnerClient:
    return _client


# Partners the platform knows how to sync with, and the scopes they may receive.
KNOWN_PARTNERS = {
    "academy613": {
        "label": "613 Academy",
        "scopes": ["service.completed", "tehillim.read", "commitment.created", "request.completed"],
    },
}
