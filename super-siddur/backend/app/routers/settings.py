"""Site settings (splash branding, etc.): public read, permissioned write."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Admin, Setting
from ..schemas import SettingIn
from ..security import require

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
def get_settings_all(response: Response, db: Session = Depends(get_db)) -> dict:
    response.headers["Cache-Control"] = "no-cache"
    return {s.key: s.value for s in db.scalars(select(Setting)).all()}


@router.put("/{key}")
def put_setting(key: str, body: SettingIn, db: Session = Depends(get_db),
                admin: Admin = Depends(require("settings.edit"))) -> dict:
    row = db.get(Setting, key)
    if row is None:
        row = Setting(key=key, value=body.value)
        db.add(row)
    else:
        row.value = body.value
    db.commit()
    return {"ok": True, "key": key}
