"""Siddur content (the TEXTDATA array): public read, permissioned write."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Admin, Content
from ..security import require

router = APIRouter(prefix="/api/content", tags=["content"])


def _row(db: Session) -> Content:
    row = db.get(Content, 1)
    if row is None:
        row = Content(id=1, docs=[])
        db.add(row)
        db.commit()
    return row


@router.get("")
def get_content(response: Response, db: Session = Depends(get_db)) -> list:
    response.headers["Cache-Control"] = "no-cache"
    return _row(db).docs


@router.post("")
def put_content(docs: list[dict[str, Any]] = Body(...), db: Session = Depends(get_db),
                admin: Admin = Depends(require("content.edit"))) -> dict:
    if not isinstance(docs, list):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "expected a JSON array of docs")
    row = _row(db)
    row.docs = docs
    db.commit()
    return {"ok": True, "docs": len(docs)}
