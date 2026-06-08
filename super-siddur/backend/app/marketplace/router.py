"""Marketplace API — money-free phase.

Membership (Pro), a jobs board of prayer requests, accept/assign, completion
tracking, transparent payout quotes, and premium broadcasts. No real money
moves: pledges are recorded as intents via the NullPaymentProvider, and the
full payout breakdown is stored for audit. Admins configure all rates.
"""
from __future__ import annotations

import datetime as dt
import random

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Admin
from ..security import hash_password, require, verify_password
from .auth import (create_market_token, current_user, get_user_by_email, is_pro,
                   require_pro)
from .models import (Assignment, Broadcast, MarketUser, Notification,
                     PayoutConfig, Pledge, PrayerRequest)
from .payments import get_payment_provider
from .payout import PLATFORM_CUT_HARD_MAX, Rates, compute_payout
from .schemas import (AcceptIn, BroadcastIn, CompleteIn, ConfigIn, LoginIn,
                      PrefsIn, QuoteIn, RegisterIn, RequestIn)

router = APIRouter(prefix="/api/market", tags=["marketplace"])


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


# ---------- config ----------
def get_config(db: Session) -> PayoutConfig:
    cfg = db.get(PayoutConfig, 1)
    if cfg is None:
        cfg = PayoutConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def rates_from_config(cfg: PayoutConfig) -> Rates:
    return Rates(
        processor_fee_pct=cfg.processor_fee_pct,
        processor_fee_flat_cents=cfg.processor_fee_flat_cents,
        appstore_fee_pct=cfg.appstore_fee_pct,
        platform_cut_pct=cfg.platform_cut_pct,
        platform_cut_max_pct=cfg.platform_cut_max_pct,
        payout_mode=cfg.payout_mode,
    )


def _prefs_match(req: PrayerRequest, prefs: dict) -> bool:
    """A request matches a reciter when its scope is in their wanted scopes
    (an empty/absent list means 'alert me to everything')."""
    scopes = (prefs or {}).get("job_scopes") or []
    return (not scopes) or (req.scope_kind in scopes)


def _enqueue_alerts(db: Session, req: PrayerRequest) -> None:
    """Create in-app prayer-alerts for opted-in reciters whose preferences match
    this new request (the poster is never alerted to their own request)."""
    name = (req.names[0].get("name") if req.names else "") or "a name"
    users = db.scalars(select(MarketUser).where(
        MarketUser.id != req.poster_id, MarketUser.active.is_(True))).all()
    for u in users:
        p = u.prefs or {}
        if not p.get("notify") or not _prefs_match(req, p):
            continue
        db.add(Notification(user_id=u.id, kind="job_match", request_id=req.id,
                            title=f"New request to daven for {name}",
                            body=req.title or f"{req.scope_kind} · {name}"))
    db.commit()


def _user_out(u: MarketUser) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "membership": u.membership,
            "membership_until": u.membership_until, "credit_cents": u.credit_cents,
            "kyc_status": u.kyc_status, "is_pro": is_pro(u)}


def _request_out(db: Session, r: PrayerRequest) -> dict:
    rows = db.scalars(select(Assignment).where(Assignment.request_id == r.id)).all()
    return {"id": r.id, "poster_id": r.poster_id, "title": r.title, "names": r.names,
            "scope_kind": r.scope_kind, "scope_detail": r.scope_detail,
            "reciter_mode": r.reciter_mode, "expected_reciters": r.expected_reciters,
            "assignment_mode": r.assignment_mode, "payout_split": r.payout_split,
            "gross_cents": r.gross_cents, "unit_price_cents": r.unit_price_cents,
            "payout_mode": r.payout_mode, "status": r.status,
            "accepted_count": len(rows),
            "completed_count": sum(1 for a in rows if a.status == "completed"),
            "deadline": r.deadline, "created_at": r.created_at}


# ---------- auth ----------
@router.post("/auth/register")
def register(body: RegisterIn, db: Session = Depends(get_db)) -> dict:
    email = body.email.lower()
    if get_user_by_email(db, email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    u = MarketUser(email=email, name=body.name or email.split("@")[0],
                   password_hash=hash_password(body.password))
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"access_token": create_market_token(u), "token_type": "bearer"}


@router.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)) -> dict:
    u = get_user_by_email(db, body.email.lower())
    if not u or not verify_password(body.password, u.password_hash) or not u.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return {"access_token": create_market_token(u), "token_type": "bearer"}


@router.get("/me")
def me(user: MarketUser = Depends(current_user)) -> dict:
    return _user_out(user)


@router.put("/me/prefs")
def update_prefs(body: PrefsIn, user: MarketUser = Depends(current_user),
                 db: Session = Depends(get_db)) -> dict:
    """Reciter alert preferences: which scope kinds to be alerted about, opt-in."""
    p = dict(user.prefs or {})
    if body.job_scopes is not None:
        p["job_scopes"] = body.job_scopes
    if body.notify is not None:
        p["notify"] = bool(body.notify)
    user.prefs = p
    db.commit()
    return {"ok": True, "prefs": p}


@router.get("/notifications")
def my_notifications(unread_only: bool = False, user: MarketUser = Depends(current_user),
                     db: Session = Depends(get_db)) -> list:
    q = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        q = q.where(Notification.read.is_(False))
    rows = db.scalars(q.order_by(Notification.created_at.desc()).limit(100)).all()
    return [{"id": n.id, "kind": n.kind, "request_id": n.request_id, "title": n.title,
             "body": n.body, "read": n.read, "created_at": n.created_at} for n in rows]


@router.post("/notifications/{nid}/read")
def mark_notification_read(nid: int, user: MarketUser = Depends(current_user),
                           db: Session = Depends(get_db)) -> dict:
    n = db.get(Notification, nid)
    if not n or n.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    n.read = True
    db.commit()
    return {"ok": True}


# ---------- public config & quote ----------
@router.get("/config")
def public_config(db: Session = Depends(get_db)) -> dict:
    c = get_config(db)
    return {"pro_price_cents": c.pro_price_cents, "pro_plus_price_cents": c.pro_plus_price_cents,
            "broadcast_price_cents": c.broadcast_price_cents, "currency": c.currency,
            "min_pledge_cents": c.min_pledge_cents, "suggested_presets_cents": c.suggested_presets_cents,
            "payout_mode": c.payout_mode, "tzedaka_targets": c.tzedaka_targets,
            "platform_cut_pct": c.platform_cut_pct, "platform_cut_max_pct": c.platform_cut_max_pct}


@router.post("/quote")
def quote(body: QuoteIn, db: Session = Depends(get_db)) -> dict:
    cfg = get_config(db)
    return compute_payout(body.gross_cents, rates_from_config(cfg),
                          via_app_store=body.via_app_store,
                          recipients=max(1, body.recipients),
                          payout_mode=body.payout_mode)


# ---------- membership ----------
@router.post("/membership/subscribe")
def subscribe(tier: str = Body("pro", embed=True), user: MarketUser = Depends(current_user),
              db: Session = Depends(get_db)) -> dict:
    if tier not in ("pro", "pro_plus"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown tier")
    cfg = get_config(db)
    price = cfg.pro_plus_price_cents if tier == "pro_plus" else cfg.pro_price_cents
    # Phase 1: record the subscription intent (no charge) and activate so flows are usable.
    res = get_payment_provider().create_subscription(user.provider_customer_ref or user.email, price, "month")
    db.add(Pledge(payer_id=user.id, kind="membership", amount_cents=price,
                  provider=get_payment_provider().name, provider_ref=res["provider_ref"],
                  status="intent", live=res.get("live", False)))
    user.membership = tier
    user.membership_until = _now() + dt.timedelta(days=30)
    db.commit()
    return {"ok": True, "membership": user.membership, "until": user.membership_until,
            "charged": False, "note": "Phase 1: membership simulated (no charge). Real billing arrives with Stripe."}


# ---------- requests (jobs board) ----------
@router.post("/requests")
def create_request(body: RequestIn, user: MarketUser = Depends(require_pro),
                   db: Session = Depends(get_db)) -> dict:
    cfg = get_config(db)
    if body.payout_split not in ("per_reciter", "pool"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "payout_split must be per_reciter or pool")
    if body.reciter_mode not in ("single", "group"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "reciter_mode must be single or group")
    if body.assignment_mode not in ("free", "random"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "assignment_mode must be free or random")
    expected = 1 if body.reciter_mode == "single" else max(1, body.expected_reciters)
    # derive gross from unit price for per-reciter pricing
    gross = body.gross_cents
    if body.payout_split == "per_reciter":
        gross = max(body.gross_cents, body.unit_price_cents * expected)
    if gross < cfg.min_pledge_cents:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Minimum pledge is {cfg.min_pledge_cents} cents")

    r = PrayerRequest(
        poster_id=user.id, title=body.title, names=[n.model_dump() for n in body.names],
        scope_kind=body.scope_kind, scope_detail=body.scope_detail,
        reciter_mode=body.reciter_mode, expected_reciters=expected,
        assignment_mode=body.assignment_mode, payout_split=body.payout_split,
        gross_cents=gross, unit_price_cents=body.unit_price_cents,
        via_app_store=body.via_app_store,
        payout_mode=body.payout_mode or cfg.payout_mode, tzedaka_target=body.tzedaka_target,
        deadline=body.deadline, status="open")
    db.add(r)
    db.commit()
    db.refresh(r)
    # record the poster's pledge intent with a transparent breakdown
    breakdown = compute_payout(gross, rates_from_config(cfg), via_app_store=r.via_app_store,
                               recipients=expected, payout_mode=r.payout_mode)
    res = get_payment_provider().create_pledge(gross, cfg.currency, user.email, {"request_id": r.id})
    db.add(Pledge(payer_id=user.id, request_id=r.id, kind="request", amount_cents=gross,
                  breakdown=breakdown, provider=get_payment_provider().name,
                  provider_ref=res["provider_ref"], status="intent", live=res.get("live", False)))
    db.commit()
    _enqueue_alerts(db, r)   # prayer-alerts to matching, opted-in reciters
    out = _request_out(db, r)
    out["pledge_breakdown"] = breakdown
    return out


@router.get("/requests")
def list_requests(scope_kind: str | None = None, status_filter: str = "open",
                  limit: int = 50, db: Session = Depends(get_db)) -> list:
    q = select(PrayerRequest).order_by(PrayerRequest.created_at.desc())
    if status_filter and status_filter != "all":
        q = q.where(PrayerRequest.status == status_filter)
    if scope_kind:
        q = q.where(PrayerRequest.scope_kind == scope_kind)
    rows = db.scalars(q.limit(min(200, max(1, limit)))).all()
    return [_request_out(db, r) for r in rows]


@router.get("/requests/matches")
def my_matches(user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> list:
    """Open requests that match the caller's alert preferences (jobs for you)."""
    rows = db.scalars(select(PrayerRequest).where(PrayerRequest.status == "open")
                      .order_by(PrayerRequest.created_at.desc()).limit(100)).all()
    p = user.prefs or {}
    return [_request_out(db, r) for r in rows if r.poster_id != user.id and _prefs_match(r, p)]


@router.get("/requests/{rid}")
def get_request(rid: int, db: Session = Depends(get_db)) -> dict:
    r = db.get(PrayerRequest, rid)
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    return _request_out(db, r)


def _scope_units(r: PrayerRequest) -> list:
    """The assignable units of a request (chapters, letters, verses)."""
    d = r.scope_detail or {}
    if r.scope_kind == "tehillim_all":
        return list(range(1, 151))
    if r.scope_kind == "chapters":
        return list(d.get("chapters", []))
    if r.scope_kind == "letters":
        return list(d.get("letters", []))
    if r.scope_kind == "verses":
        return list(d.get("verses", []))
    return []  # sequence / custom = a single whole-portion unit


@router.post("/requests/{rid}/accept")
def accept_request(rid: int, body: AcceptIn, user: MarketUser = Depends(require_pro),
                   db: Session = Depends(get_db)) -> dict:
    r = db.get(PrayerRequest, rid)
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if r.status not in ("open", "in_progress"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Request is not open")
    existing = db.scalars(select(Assignment).where(Assignment.request_id == rid)).all()
    if any(a.reciter_id == user.id and a.status != "abandoned" for a in existing):
        raise HTTPException(status.HTTP_409_CONFLICT, "You already accepted this request")
    if r.reciter_mode == "single" and any(a.status != "abandoned" for a in existing):
        raise HTTPException(status.HTTP_409_CONFLICT, "This request is for a single reciter and is taken")

    portion = body.portion or {}
    if r.assignment_mode == "random":
        units = _scope_units(r)
        taken = {u for a in existing for u in (a.portion or {}).get("units", [])}
        free = [u for u in units if u not in taken]
        portion = {"units": [random.choice(free)]} if free else {"units": []}

    a = Assignment(request_id=rid, reciter_id=user.id, portion=portion, status="accepted")
    if r.status == "open":
        r.status = "in_progress"
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "request_id": rid, "portion": a.portion, "status": a.status,
            "accepted_at": a.accepted_at}


@router.post("/assignments/{aid}/complete")
def complete_assignment(aid: int, body: CompleteIn, user: MarketUser = Depends(current_user),
                        db: Session = Depends(get_db)) -> dict:
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    if a.status == "completed":
        return {"id": a.id, "status": a.status, "completed_at": a.completed_at}
    a.status = "completed"
    a.note = body.note
    a.completed_at = _now()
    # if every accepted assignment is done, mark the request completed
    r = db.get(PrayerRequest, a.request_id)
    if r:
        rows = db.scalars(select(Assignment).where(Assignment.request_id == r.id)).all()
        active = [x for x in rows if x.status != "abandoned"]
        if active and all(x.status == "completed" for x in active) and len(active) >= r.expected_reciters:
            r.status = "completed"
    db.commit()
    return {"id": a.id, "status": a.status, "completed_at": a.completed_at}


@router.get("/requests/{rid}/completions")
def request_completions(rid: int, user: MarketUser = Depends(current_user),
                        db: Session = Depends(get_db)) -> list:
    r = db.get(PrayerRequest, rid)
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if r.poster_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the poster can see fulfilment")
    rows = db.scalars(select(Assignment).where(Assignment.request_id == rid)).all()
    out = []
    for a in rows:
        ru = db.get(MarketUser, a.reciter_id)
        out.append({"id": a.id, "request_id": rid, "reciter_id": a.reciter_id,
                    "reciter_name": ru.name if ru else "", "portion": a.portion,
                    "status": a.status, "note": a.note, "accepted_at": a.accepted_at,
                    "completed_at": a.completed_at})
    return out


# ---------- premium broadcast ----------
@router.post("/broadcasts")
def create_broadcast(body: BroadcastIn, user: MarketUser = Depends(require_pro),
                     db: Session = Depends(get_db)) -> dict:
    cfg = get_config(db)
    price = cfg.broadcast_price_cents
    b = Broadcast(sponsor_id=user.id, names=[n.model_dump() for n in body.names],
                  message=body.message, scope_kind=body.scope_kind, scope_detail=body.scope_detail,
                  price_cents=price, start_at=_now(),
                  end_at=_now() + dt.timedelta(days=max(1, body.days)), status="active")
    db.add(b)
    db.commit()
    db.refresh(b)
    res = get_payment_provider().create_pledge(price, cfg.currency, user.email, {"broadcast_id": b.id})
    db.add(Pledge(payer_id=user.id, broadcast_id=b.id, kind="broadcast", amount_cents=price,
                  provider=get_payment_provider().name, provider_ref=res["provider_ref"],
                  status="intent", live=res.get("live", False)))
    db.commit()
    return {"id": b.id, "status": b.status, "names": b.names, "start_at": b.start_at,
            "end_at": b.end_at, "price_cents": b.price_cents, "charged": False}


@router.get("/broadcasts/active")
def active_broadcasts(db: Session = Depends(get_db)) -> list:
    now = _now()
    rows = db.scalars(select(Broadcast).where(Broadcast.status == "active")).all()
    out = []
    for b in rows:
        end = b.end_at
        if end is not None and end.tzinfo is None:
            end = end.replace(tzinfo=dt.timezone.utc)
        if end is None or end >= now:
            out.append({"id": b.id, "names": b.names, "message": b.message,
                        "scope_kind": b.scope_kind, "scope_detail": b.scope_detail,
                        "start_at": b.start_at, "end_at": b.end_at})
    return out


# ---------- admin config ----------
@router.get("/admin/config")
def admin_get_config(admin: Admin = Depends(require("market.admin")), db: Session = Depends(get_db)) -> dict:
    c = get_config(db)
    return {k: getattr(c, k) for k in (
        "pro_price_cents", "pro_plus_price_cents", "broadcast_price_cents",
        "processor_fee_pct", "processor_fee_flat_cents", "appstore_fee_pct",
        "platform_cut_pct", "platform_cut_max_pct", "payout_mode", "min_pledge_cents",
        "suggested_presets_cents", "tzedaka_targets", "currency")}


@router.put("/admin/config")
def admin_put_config(body: ConfigIn, admin: Admin = Depends(require("market.admin")),
                     db: Session = Depends(get_db)) -> dict:
    c = get_config(db)
    data = body.model_dump(exclude_none=True)
    # guardrails: clamp the platform cut to the hard maximum, keep percentages sane
    if "platform_cut_max_pct" in data:
        data["platform_cut_max_pct"] = min(max(0.0, data["platform_cut_max_pct"]), PLATFORM_CUT_HARD_MAX)
    if "platform_cut_pct" in data:
        ceiling = data.get("platform_cut_max_pct", c.platform_cut_max_pct)
        data["platform_cut_pct"] = min(max(0.0, data["platform_cut_pct"]), min(ceiling, PLATFORM_CUT_HARD_MAX))
    if "payout_mode" in data and data["payout_mode"] not in ("tzedaka", "credit", "cash"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "payout_mode must be tzedaka, credit, or cash")
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    return {"ok": True}
