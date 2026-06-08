"""Optional voice features for a job — all opt-in and admin-enabled.

1. Reciter recording (optional, never required): the reciter MAY upload audio of
   themselves saying the tefillah. It is never a condition of payment or of
   accepting a job.
2. Request to hear it: on a large pledge the poster MAY ask for the recording —
   and the reciter is always free to decline. No one is forced to be recorded.
3. Personal message: the poster MAY attach a short personal audio to the job
   ("thinking of you, get well…"), delivered to whoever takes it; the reciter
   sees who sent it.

Audio bytes are stored on disk (audio_dir), like the icon uploads.
"""
from __future__ import annotations

import datetime as dt
import os
import uuid

from fastapi import (APIRouter, Depends, File, Form, HTTPException, UploadFile,
                     status)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from .auth import current_user
from .models import (Assignment, JobMessage, JobRecording, MarketUser,
                     PayoutConfig, PrayerRequest, RecordingRequest)

router = APIRouter(prefix="/api/market", tags=["jobaudio"])

MAX_BYTES = 20 * 1024 * 1024  # 20 MB cap per clip


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


def _save(upload: UploadFile, prefix: str):
    s = get_settings()
    s.audio_dir.mkdir(parents=True, exist_ok=True)
    data = upload.file.read()
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Audio too large")
    ext = os.path.splitext(upload.filename or "")[1].lower()
    if not ext or len(ext) > 6:
        ext = ".webm"
    name = f"{prefix}_{uuid.uuid4().hex}{ext}"
    (s.audio_dir / name).write_bytes(data)
    return name, len(data), (upload.content_type or "audio/webm")


def _path(name: str):
    return get_settings().audio_dir / name


def _unlink(name: str) -> None:
    try:
        _path(name).unlink(missing_ok=True)
    except OSError:
        pass


# ---------------- 1. reciter's optional recording ----------------
@router.post("/assignments/{aid}/recording")
def upload_recording(aid: int, file: UploadFile = File(...), shared: bool = Form(True),
                     user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    cfg = _config(db)
    if not cfg.allow_reciter_recording:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Recording is not enabled")
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    name, size, ct = _save(file, "rec")
    old = db.scalar(select(JobRecording).where(JobRecording.assignment_id == aid))
    if old:
        _unlink(old.filename)
        db.delete(old)
        db.flush()
    rec = JobRecording(assignment_id=aid, reciter_id=user.id, filename=name,
                       content_type=ct, size_bytes=size, shared=shared)
    db.add(rec)
    if shared:
        rr = db.scalar(select(RecordingRequest).where(
            RecordingRequest.assignment_id == aid, RecordingRequest.status == "requested"))
        if rr:
            rr.status = "fulfilled"
            rr.resolved_at = _now()
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "shared": rec.shared, "size_bytes": size, "note": "Optional — thank you."}


@router.delete("/assignments/{aid}/recording")
def delete_recording(aid: int, user: MarketUser = Depends(current_user),
                     db: Session = Depends(get_db)) -> dict:
    a = db.get(Assignment, aid)
    if not a or a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    rec = db.scalar(select(JobRecording).where(JobRecording.assignment_id == aid))
    if rec:
        _unlink(rec.filename)
        db.delete(rec)
        db.commit()
    return {"ok": True}


@router.get("/assignments/{aid}/recording")
def get_recording(aid: int, user: MarketUser = Depends(current_user),
                  db: Session = Depends(get_db)):
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    rec = db.scalar(select(JobRecording).where(JobRecording.assignment_id == aid))
    if not rec:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No recording")
    req = db.get(PrayerRequest, a.request_id)
    is_reciter = a.reciter_id == user.id
    is_poster = req and req.poster_id == user.id
    if not (is_reciter or (is_poster and rec.shared)):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted")
    p = _path(rec.filename)
    if not p.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing")
    return FileResponse(str(p), media_type=rec.content_type)


# ---------------- 2. poster requests to hear it ----------------
@router.post("/assignments/{aid}/recording-request")
def request_recording(aid: int, user: MarketUser = Depends(current_user),
                      db: Session = Depends(get_db)) -> dict:
    cfg = _config(db)
    if not cfg.allow_poster_request_recording:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requesting recordings is not enabled")
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    req = db.get(PrayerRequest, a.request_id)
    if not req or req.poster_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the poster may ask")
    if (req.gross_cents or 0) < cfg.recording_request_min_cents:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            f"Available on pledges of {cfg.recording_request_min_cents} cents or more")
    existing = db.scalar(select(RecordingRequest).where(
        RecordingRequest.assignment_id == aid, RecordingRequest.requester_id == user.id))
    if existing and existing.status == "requested":
        return {"id": existing.id, "status": existing.status}
    rr = RecordingRequest(assignment_id=aid, requester_id=user.id, status="requested")
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return {"id": rr.id, "status": rr.status, "note": "The reciter is always free to decline."}


@router.post("/assignments/{aid}/recording-request/decline")
def decline_recording(aid: int, user: MarketUser = Depends(current_user),
                      db: Session = Depends(get_db)) -> dict:
    a = db.get(Assignment, aid)
    if not a or a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    rr = db.scalar(select(RecordingRequest).where(
        RecordingRequest.assignment_id == aid, RecordingRequest.status == "requested"))
    if not rr:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No pending request")
    rr.status = "declined"
    rr.resolved_at = _now()
    db.commit()
    return {"ok": True, "status": "declined"}


@router.get("/assignments/{aid}/recording-request")
def get_recording_request(aid: int, user: MarketUser = Depends(current_user),
                          db: Session = Depends(get_db)) -> dict:
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    rr = db.scalar(select(RecordingRequest).where(RecordingRequest.assignment_id == aid)
                   .order_by(RecordingRequest.created_at.desc()))
    return {"status": (rr.status if rr else "none")}


# ---------------- 3. poster's personal audio message ----------------
@router.post("/requests/{rid}/message")
def upload_message(rid: int, file: UploadFile = File(...), user: MarketUser = Depends(current_user),
                   db: Session = Depends(get_db)) -> dict:
    req = db.get(PrayerRequest, rid)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if req.poster_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the poster may attach a message")
    name, size, ct = _save(file, "msg")
    old = db.scalar(select(JobMessage).where(JobMessage.request_id == rid))
    if old:
        _unlink(old.filename)
        db.delete(old)
        db.flush()
    m = JobMessage(request_id=rid, sender_id=user.id, sender_name=(user.name or user.email),
                   filename=name, content_type=ct, size_bytes=size)
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id, "size_bytes": size}


@router.get("/assignments/{aid}/message")
def get_message_meta(aid: int, user: MarketUser = Depends(current_user),
                     db: Session = Depends(get_db)) -> dict:
    a = db.get(Assignment, aid)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if a.reciter_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    m = db.scalar(select(JobMessage).where(JobMessage.request_id == a.request_id))
    if not m:
        return {"has_message": False}
    return {"has_message": True, "from": m.sender_name,
            "audio_url": f"/api/market/requests/{a.request_id}/message/audio"}


@router.get("/requests/{rid}/message/audio")
def get_message_audio(rid: int, user: MarketUser = Depends(current_user),
                      db: Session = Depends(get_db)):
    req = db.get(PrayerRequest, rid)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    m = db.scalar(select(JobMessage).where(JobMessage.request_id == rid))
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No message")
    is_poster = req.poster_id == user.id
    is_reciter = db.scalar(select(Assignment).where(
        Assignment.request_id == rid, Assignment.reciter_id == user.id)) is not None
    if not (is_poster or is_reciter):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted")
    p = _path(m.filename)
    if not p.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File missing")
    return FileResponse(str(p), media_type=m.content_type)
