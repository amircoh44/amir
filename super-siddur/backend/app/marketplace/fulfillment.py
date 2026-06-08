"""Trust-based prayer-job fulfillment — queue + quiet integrity engine.

When a reciter accepts a job, the exact tefillos the poster chose (by button)
are queued in order. The reciter reads one, marks "I said it", the next appears
— boom, boom, boom — until done. We trust them: no recording, no proof.

The integrity engine is a quiet *timing* sanity check on the paid tefillah only.
The server stamps when each step is served and measures how long it took; if a
step is marked done impossibly fast (faster than the text could be read), the
queue gently pauses on that step and asks for a one-line confirmation, which
reactivates it. It never inspects content, audio, or anything outside the job.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from .auth import current_user
from .models import Assignment, JobStep, MarketUser, PayoutConfig, PrayerRequest
from .schemas import ConfirmIn

router = APIRouter(prefix="/api/market", tags=["fulfillment"])

FLAG_MESSAGE = "This went by quickly — tell us a little about your tefillah to confirm it."

# Named sets the poster can pick by button → Tehillim chapters (configurable later).
SEQUENCES = {
    "refuah": [20, 30, 38, 41, 59, 88, 103, 142],   # a common refuah (healing) set
}


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _config(db: Session) -> PayoutConfig:
    c = db.get(PayoutConfig, 1)
    if c is None:
        c = PayoutConfig(id=1)
        db.add(c)
        db.commit()
        db.refresh(c)
    return c


# ---------------- step generation ----------------
def _units_and_kind(req: PrayerRequest, portion: dict):
    """The ordered units a reciter must read, and their kind. Uses the assigned
    portion if any, else the whole request scope."""
    units = list((portion or {}).get("units") or [])
    if not units:
        d = req.scope_detail or {}
        if req.scope_kind == "tehillim_all":
            units = list(range(1, 151))
        elif req.scope_kind == "chapters":
            units = list(d.get("chapters", []))
        elif req.scope_kind == "letters":
            units = list(d.get("letters", []))
        elif req.scope_kind == "verses":
            units = list(d.get("verses", []))
        elif req.scope_kind == "sequence":
            units = list(SEQUENCES.get(d.get("sequence", ""), []))
    kind = {"chapters": "chapter", "tehillim_all": "chapter", "letters": "letter",
            "verses": "verse", "sequence": "chapter"}.get(req.scope_kind, "whole")
    return units, kind


def _label(kind: str, u) -> str:
    return {"chapter": f"Tehillim {u}", "verse": f"Verse {u}", "letter": f"Letter {u}"}.get(kind, str(u))


def generate_steps(db: Session, req: PrayerRequest, a: Assignment) -> int:
    """Queue the assignment's tefillos in order. `unit_words` (from the poster's
    client, which has the text) makes the integrity check precise per step."""
    units, kind = _units_and_kind(req, a.portion)
    uw = (req.scope_detail or {}).get("unit_words") or {}

    def words_for(key):
        w = uw.get(str(key))
        return int(w) if isinstance(w, (int, float)) else None

    steps = []
    if units:
        for i, u in enumerate(units):
            steps.append(JobStep(assignment_id=a.id, seq=i, unit_kind=kind, unit_ref=str(u),
                                 label=_label(kind, u), est_words=words_for(u)))
    else:
        steps.append(JobStep(assignment_id=a.id, seq=0, unit_kind="whole", unit_ref=req.scope_kind,
                             label=(req.title or req.scope_kind), est_words=words_for("whole")))
    db.add_all(steps)
    db.commit()
    return len(steps)


# ---------------- integrity engine (pure) ----------------
def min_seconds_for(step: JobStep, cfg: PayoutConfig) -> float:
    """Minimum plausible read time: words / max-words-per-second, never below the
    per-step floor. With no known length, only the floor applies (no false flags)."""
    floor = float(cfg.integrity_min_step_seconds or 0)
    mwps = float(cfg.integrity_max_words_per_sec or 0)
    if step.est_words and mwps > 0:
        return max(floor, step.est_words / mwps)
    return floor


def integrity_ok(step: JobStep, read_ms: int | None, cfg: PayoutConfig):
    """(ok, reason). Only the timing of the paid step is ever considered."""
    if not cfg.integrity_enabled or read_ms is None:
        return True, ""
    min_s = min_seconds_for(step, cfg)
    if read_ms / 1000.0 < min_s - 0.05:
        return False, f"This step went by in {read_ms / 1000.0:.1f}s (expected at least ~{min_s:.0f}s)."
    return True, ""


# ---------------- completion ----------------
def mark_assignment_complete(db: Session, a: Assignment) -> None:
    from .escrow import create_payout_for_assignment  # local import avoids any import cycle
    if a.status != "completed":
        a.status = "completed"
        a.completed_at = _now()
    r = db.get(PrayerRequest, a.request_id)
    if r:
        rows = db.scalars(select(Assignment).where(Assignment.request_id == r.id)).all()
        active = [x for x in rows if x.status != "abandoned"]
        if active and all(x.status == "completed" for x in active) and len(active) >= r.expected_reciters:
            r.status = "completed"
    db.commit()
    create_payout_for_assignment(db, a)   # payout goes into escrow, never instant


# ---------------- serialization / guards ----------------
def _step_out(s: JobStep) -> dict:
    return {"id": s.id, "seq": s.seq, "unit_kind": s.unit_kind, "unit_ref": s.unit_ref,
            "label": s.label, "status": s.status, "flag_reason": s.flag_reason}


def _own_assignment(db: Session, aid: int, user: MarketUser) -> Assignment:
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    return a


def _steps(db: Session, aid: int):
    return list(db.scalars(select(JobStep).where(JobStep.assignment_id == aid).order_by(JobStep.seq)).all())


def _activate_next(steps):
    nxt = next((s for s in steps if s.status == "pending"), None)
    if nxt:
        nxt.status = "active"
        nxt.served_at = _now()
    return nxt


# ---------------- endpoints ----------------
@router.get("/assignments/{aid}/queue")
def get_queue(aid: int, user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    a = _own_assignment(db, aid, user)
    steps = _steps(db, aid)
    cur = next((s for s in steps if s.status in ("active", "flagged")), None) \
        or next((s for s in steps if s.status == "pending"), None)
    return {"assignment_id": aid, "status": a.status, "total": len(steps),
            "done": sum(1 for s in steps if s.status == "done"),
            "current": (_step_out(cur) if cur else None),
            "steps": [_step_out(s) for s in steps]}


@router.post("/assignments/{aid}/start")
def start_queue(aid: int, user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    _own_assignment(db, aid, user)
    steps = _steps(db, aid)
    if not steps:
        raise HTTPException(status.HTTP_409_CONFLICT, "No steps to read")
    flagged = next((s for s in steps if s.status == "flagged"), None)
    if flagged:
        return {"flagged": True, "current": _step_out(flagged), "message": FLAG_MESSAGE}
    cur = next((s for s in steps if s.status == "active"), None)
    if not cur:
        cur = next((s for s in steps if s.status == "pending"), None)
        if cur:
            cur.status = "active"
            cur.served_at = _now()
            db.commit()
    return {"current": (_step_out(cur) if cur else None),
            "completed": all(s.status == "done" for s in steps)}


@router.post("/steps/{sid}/done")
def step_done(sid: int, user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    s = db.get(JobStep, sid)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Step not found")
    a = db.get(Assignment, s.assignment_id)
    if not a or a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your step")
    if s.status == "flagged":
        raise HTTPException(status.HTTP_409_CONFLICT, "Step is awaiting confirmation")
    if s.status != "active":
        raise HTTPException(status.HTTP_409_CONFLICT, "Step is not active — start the queue first")

    now = _now()
    served = s.served_at or now
    if served.tzinfo is None:                       # SQLite returns naive datetimes
        served = served.replace(tzinfo=dt.timezone.utc)
    s.read_ms = int((now - served).total_seconds() * 1000)
    cfg = _config(db)
    ok, reason = integrity_ok(s, s.read_ms, cfg)
    if not ok:
        s.status = "flagged"
        s.flag_reason = reason
        db.commit()
        return {"ok": False, "flagged": True, "step_id": s.id, "message": FLAG_MESSAGE, "reason": reason}

    s.status = "done"
    s.done_at = now
    steps = _steps(db, a.id)
    nxt = _activate_next(steps)
    completed = nxt is None and all(x.status == "done" for x in steps)
    if completed:
        mark_assignment_complete(db, a)
    db.commit()
    return {"ok": True, "flagged": False, "completed": completed, "next": (_step_out(nxt) if nxt else None)}


@router.post("/steps/{sid}/confirm")
def step_confirm(sid: int, body: ConfirmIn, user: MarketUser = Depends(current_user),
                 db: Session = Depends(get_db)) -> dict:
    s = db.get(JobStep, sid)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Step not found")
    a = db.get(Assignment, s.assignment_id)
    if not a or a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your step")
    if s.status != "flagged":
        raise HTTPException(status.HTTP_409_CONFLICT, "Step is not awaiting confirmation")
    if len((body.text or "").strip()) < 10:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Please share a few words about your tefillah to confirm.")
    s.status = "done"
    s.done_at = _now()
    s.confirmation = body.text.strip()
    steps = _steps(db, a.id)
    nxt = _activate_next(steps)
    completed = nxt is None and all(x.status == "done" for x in steps)
    if completed:
        mark_assignment_complete(db, a)
    db.commit()
    return {"ok": True, "completed": completed, "next": (_step_out(nxt) if nxt else None)}
