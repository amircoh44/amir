"""Escrow — payouts are never instant.

When an assignment completes, the reciter's payout is created in escrow with a
`hold_until` a few days out, giving integrity time to settle. Clean jobs
auto-release after the hold; jobs that were flagged (even though resolved) need
an explicit admin release. Money-free: this models the *states*; real fund
movement arrives with the Stripe Connect provider.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Admin
from ..security import require
from .auth import current_user
from .models import (Assignment, JobStep, MarketUser, Payout, PayoutConfig,
                     Pledge, PrayerRequest)

router = APIRouter(prefix="/api/market", tags=["escrow"])


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _aware(d: dt.datetime | None) -> dt.datetime | None:
    if d is not None and d.tzinfo is None:
        return d.replace(tzinfo=dt.timezone.utc)
    return d


def _config(db: Session) -> PayoutConfig:
    c = db.get(PayoutConfig, 1)
    if c is None:
        c = PayoutConfig(id=1)
        db.add(c)
        db.commit()
        db.refresh(c)
    return c


def create_payout_for_assignment(db: Session, a: Assignment) -> Payout:
    """Create the reciter's escrow payout when their assignment completes."""
    existing = db.scalar(select(Payout).where(Payout.assignment_id == a.id))
    if existing:
        return existing
    cfg = _config(db)
    pledge = db.scalar(select(Pledge).where(Pledge.request_id == a.request_id, Pledge.kind == "request"))
    bd = (pledge.breakdown if pledge else {}) or {}
    amount = int(bd.get("per_recipient_cents") or 0)
    req = db.get(PrayerRequest, a.request_id) if a.request_id else None
    # was this job ever flagged? (a flagged step carries a confirmation once resolved)
    flagged = db.scalar(select(JobStep).where(JobStep.assignment_id == a.id, JobStep.confirmation != "")) is not None
    p = Payout(assignment_id=a.id, reciter_id=a.reciter_id, request_id=a.request_id,
               amount_cents=amount, payout_mode=(req.payout_mode if req else cfg.payout_mode),
               breakdown=bd, status="held", requires_review=flagged,
               hold_until=_now() + dt.timedelta(days=int(cfg.escrow_days or 0)))
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def release_due(db: Session) -> list[int]:
    """Auto-release clean payouts whose hold has elapsed. Flagged ones are left
    for admin review."""
    now = _now()
    held = db.scalars(select(Payout).where(Payout.status == "held",
                                           Payout.requires_review.is_(False))).all()
    released = []
    for p in held:
        hu = _aware(p.hold_until)
        if hu is None or hu <= now:
            p.status = "released"
            p.released_at = now
            released.append(p.id)
    db.commit()
    return released


def _payout_out(p: Payout) -> dict:
    return {"id": p.id, "assignment_id": p.assignment_id, "request_id": p.request_id,
            "amount_cents": p.amount_cents, "payout_mode": p.payout_mode, "status": p.status,
            "requires_review": p.requires_review, "hold_until": p.hold_until,
            "released_at": p.released_at, "live": p.live}


@router.get("/me/payouts")
def my_payouts(user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> list:
    rows = db.scalars(select(Payout).where(Payout.reciter_id == user.id)
                      .order_by(Payout.created_at.desc()).limit(200)).all()
    return [_payout_out(p) for p in rows]


@router.post("/admin/payouts/release-due")
def admin_release_due(admin: Admin = Depends(require("market.admin")),
                      db: Session = Depends(get_db)) -> dict:
    return {"released": release_due(db)}


@router.post("/admin/payouts/{pid}/release")
def admin_release(pid: int, admin: Admin = Depends(require("market.admin")),
                  db: Session = Depends(get_db)) -> dict:
    p = db.get(Payout, pid)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payout not found")
    if p.status not in ("held",):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Payout is {p.status}")
    p.status = "released"
    p.requires_review = False
    p.released_at = _now()
    db.commit()
    return {"ok": True, "status": p.status}


@router.post("/admin/payouts/{pid}/refund")
def admin_refund(pid: int, admin: Admin = Depends(require("market.admin")),
                 db: Session = Depends(get_db)) -> dict:
    p = db.get(Payout, pid)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Payout not found")
    if p.status == "released":
        raise HTTPException(status.HTTP_409_CONFLICT, "Already released")
    p.status = "refunded"
    db.commit()
    return {"ok": True, "status": p.status}
