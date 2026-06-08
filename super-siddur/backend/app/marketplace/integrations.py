"""B3 — Cross-app sync (e.g. 613 Academy).

A user links their accounts through a server-to-server handshake (no user-visible
API keys) and grants explicit, scoped consent. Once consented, siddur activity
(e.g. davening Mincha) is forwarded to the partner automatically, signed with a
shared secret. The consent record names *exactly* what syncs; nothing flows
without an active grant, and revocation is one call.

Phase 1 uses NullPartnerClient (records deliveries, no network). A real client
posts to the partner API with an HMAC signature, swapped in without changes here.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from .auth import current_user
from .models import ActivityEvent, IntegrationConsent, MarketUser
from .partners import KNOWN_PARTNERS, get_partner_client
from .schemas import ActivityIn, ConsentIn

router = APIRouter(prefix="/api/market/integrations", tags=["integrations"])

# Human-readable disclosure for each scope, shown in the consent screen.
SCOPE_DESCRIPTIONS = {
    "service.completed": "When you finish a service (e.g. Mincha), that you completed it — and which one.",
    "tehillim.read": "When you read Tehillim, that you did — and which chapters.",
    "commitment.created": "When you commit to daven for a name, that you made the commitment.",
    "request.completed": "When you fulfil a 'Daven for a name' request, that you completed it.",
}


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _partner_or_404(partner: str) -> dict:
    meta = KNOWN_PARTNERS.get(partner)
    if not meta:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown partner")
    return meta


def _consent(db: Session, user_id: int, partner: str) -> IntegrationConsent | None:
    return db.scalar(select(IntegrationConsent).where(
        IntegrationConsent.user_id == user_id, IntegrationConsent.partner == partner))


@router.get("/partners")
def partners() -> dict:
    """What the siddur can sync with, and the scopes each may receive."""
    return {"partners": [
        {"key": k, "label": v["label"],
         "scopes": [{"key": s, "describes": SCOPE_DESCRIPTIONS.get(s, s)} for s in v["scopes"]]}
        for k, v in KNOWN_PARTNERS.items()]}


@router.get("/{partner}/consent")
def get_consent(partner: str, user: MarketUser = Depends(current_user),
                db: Session = Depends(get_db)) -> dict:
    meta = _partner_or_404(partner)
    c = _consent(db, user.id, partner)
    granted = bool(c and c.status == "granted")
    scopes = c.scopes if granted else []
    return {
        "partner": partner, "label": meta["label"], "linked": bool(c and c.external_id),
        "granted": granted, "external_id": (c.external_id if c else ""),
        "syncs": [{"key": s, "describes": SCOPE_DESCRIPTIONS.get(s, s)} for s in scopes],
        "available_scopes": [{"key": s, "describes": SCOPE_DESCRIPTIONS.get(s, s)} for s in meta["scopes"]],
        "note": "Nothing syncs unless you grant it here. You can revoke at any time.",
    }


@router.post("/{partner}/consent")
def grant_consent(partner: str, body: ConsentIn, user: MarketUser = Depends(current_user),
                  db: Session = Depends(get_db)) -> dict:
    """Grant/update scoped consent. `external_id` is the identity established by
    the server-to-server account link (no user-visible keys are exchanged)."""
    meta = _partner_or_404(partner)
    allowed = set(meta["scopes"])
    bad = [s for s in body.scopes if s not in allowed]
    if bad:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown scopes: {bad}")
    c = _consent(db, user.id, partner)
    if c is None:
        c = IntegrationConsent(user_id=user.id, partner=partner)
        db.add(c)
    c.scopes = list(dict.fromkeys(body.scopes))
    if body.external_id:
        c.external_id = body.external_id
    c.status = "granted"
    c.revoked_at = None
    db.commit()
    return {"ok": True, "partner": partner, "granted": True, "scopes": c.scopes}


@router.delete("/{partner}/consent")
def revoke_consent(partner: str, user: MarketUser = Depends(current_user),
                   db: Session = Depends(get_db)) -> dict:
    _partner_or_404(partner)
    c = _consent(db, user.id, partner)
    if c:
        c.status = "revoked"
        c.revoked_at = _now()
        c.scopes = []
        db.commit()
    return {"ok": True, "partner": partner, "granted": False}


@router.post("/activity")
def record_activity(body: ActivityIn, user: MarketUser = Depends(current_user),
                    db: Session = Depends(get_db)) -> dict:
    """Record a siddur activity and forward it to every consented partner whose
    granted scopes include this event type."""
    ev = ActivityEvent(user_id=user.id, type=body.type, payload=body.payload, deliveries=[])
    db.add(ev)
    db.flush()
    client = get_partner_client()
    deliveries = []
    consents = db.scalars(select(IntegrationConsent).where(
        IntegrationConsent.user_id == user.id, IntegrationConsent.status == "granted")).all()
    for c in consents:
        if body.type in (c.scopes or []) and c.external_id:
            res = client.deliver(c.partner, c.external_id, body.type, body.payload)
            deliveries.append({"partner": c.partner, "status": res.get("status"),
                               "ref": res.get("ref"), "live": res.get("live", False)})
    ev.deliveries = deliveries
    db.commit()
    return {"recorded": True, "type": body.type, "delivered_to": deliveries}
