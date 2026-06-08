"""B2 — Community / share-to-inspire.

Opt-in public profiles (PRIVATE BY DEFAULT). The men's and women's public
spaces are fully separated by `section`. The model is deliberately built around
*commitments* — "I committed to daven for someone, join me" — and shareable
cards, NOT a leaderboard: there is no score, rank, or "who prayed most". Joiners
are counted only to show momentum ("N davening with you"), never as competition.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from .auth import current_user, optional_current_user
from .models import Commitment, CommitmentJoin, CommunityProfile, MarketUser
from .schemas import CommitmentIn, JoinIn, ProfileIn

router = APIRouter(prefix="/api/market/community", tags=["community"])

SECTIONS = ("men", "women", "unspecified")

# Inspiration-first copy surfaced to clients so the tone stays consistent.
TONE = ("Sharing here is an invitation — 'I'm davening for someone, join me' — "
        "not a contest. There are no scores or rankings.")


def _profile(db: Session, user_id: int) -> CommunityProfile:
    p = db.get(CommunityProfile, user_id)
    if p is None:
        p = CommunityProfile(user_id=user_id)   # public=False by default
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def _join_count(db: Session, cid: int) -> int:
    return len(db.scalars(select(CommitmentJoin).where(CommitmentJoin.commitment_id == cid)).all())


def _card(db: Session, c: Commitment, *, display_name: str = "") -> dict:
    return {"id": c.id, "share_token": c.share_token, "names": c.names, "message": c.message,
            "scope_kind": c.scope_kind, "scope_detail": c.scope_detail, "section": c.section,
            "visibility": c.visibility, "display_name": display_name,
            "joining": _join_count(db, c.id),   # momentum, framed as "davening with you" — not a rank
            "created_at": c.created_at}


# ---------- profile (private by default) ----------
@router.get("/profile")
def get_profile(user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    p = _profile(db, user.id)
    return {"public": p.public, "display_name": p.display_name, "section": p.section, "bio": p.bio,
            "note": "Your profile is private unless you turn on visibility."}


@router.put("/profile")
def update_profile(body: ProfileIn, user: MarketUser = Depends(current_user),
                   db: Session = Depends(get_db)) -> dict:
    p = _profile(db, user.id)
    if body.section is not None:
        if body.section not in SECTIONS:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "section must be men, women, or unspecified")
        p.section = body.section
    if body.public is not None:
        p.public = body.public
    if body.display_name is not None:
        p.display_name = body.display_name[:120]
    if body.bio is not None:
        p.bio = body.bio
    db.commit()
    return {"public": p.public, "display_name": p.display_name, "section": p.section, "bio": p.bio}


# ---------- commitments ----------
@router.post("/commitments")
def create_commitment(body: CommitmentIn, user: MarketUser = Depends(current_user),
                      db: Session = Depends(get_db)) -> dict:
    if body.visibility not in ("private", "unlisted", "public"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "visibility must be private, unlisted, or public")
    p = _profile(db, user.id)
    section = body.section or p.section
    if section not in SECTIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "section must be men, women, or unspecified")
    # A commitment can only appear in a public section feed if it has a real section.
    if body.visibility == "public" and section == "unspecified":
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            "Choose the men's or women's section before sharing publicly")
    c = Commitment(user_id=user.id, names=[n.model_dump() for n in body.names],
                   scope_kind=body.scope_kind, scope_detail=body.scope_detail,
                   message=body.message, section=section, visibility=body.visibility,
                   share_token=uuid.uuid4().hex)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {**_card(db, c, display_name=p.display_name),
            "share_path": f"/api/market/community/c/{c.share_token}"}


@router.get("/feed")
def feed(section: str, user: MarketUser = Depends(current_user), db: Session = Depends(get_db)) -> dict:
    """Public commitments for ONE section only. The men's and women's spaces are
    fully separated — a request must name the section and gets only that one."""
    if section not in ("men", "women"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "section must be men or women")
    rows = db.scalars(
        select(Commitment).where(Commitment.visibility == "public",
                                 Commitment.active.is_(True),
                                 Commitment.section == section)
        .order_by(Commitment.created_at.desc()).limit(100)).all()
    items = []
    for c in rows:
        op = db.get(CommunityProfile, c.user_id)
        items.append(_card(db, c, display_name=(op.display_name if op else "")))
    return {"section": section, "note": TONE, "items": items}


@router.get("/c/{token}")
def shared_card(token: str, db: Session = Depends(get_db)) -> dict:
    """A shareable card by token — public, no auth, so a friend can open the
    invite link and join in praying for the name. `private` cards are not shown."""
    c = db.scalar(select(Commitment).where(Commitment.share_token == token, Commitment.active.is_(True)))
    if not c or c.visibility == "private":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Card not found")
    op = db.get(CommunityProfile, c.user_id)
    return {**_card(db, c, display_name=(op.display_name if op else "")), "note": TONE}


@router.post("/c/{token}/join")
def join_commitment(token: str, body: JoinIn, db: Session = Depends(get_db),
                    user: MarketUser | None = Depends(optional_current_user)) -> dict:
    """Answer 'join me'. Open to anyone with the link; if signed in we attribute it."""
    c = db.scalar(select(Commitment).where(Commitment.share_token == token, Commitment.active.is_(True)))
    if not c or c.visibility == "private":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Card not found")
    db.add(CommitmentJoin(commitment_id=c.id, user_id=user.id if user else None,
                          display_name=(body.display_name or "")[:120]))
    db.commit()
    return {"ok": True, "joining": _join_count(db, c.id),
            "message": "Thank you for davening together."}
