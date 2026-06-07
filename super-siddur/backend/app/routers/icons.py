"""Icon CMS: upload a PNG/SVG to override a built-in icon or add a custom one."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Admin, Icon
from ..schemas import IconOut
from ..security import require

router = APIRouter(prefix="/api/icons", tags=["icons"])

_EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg"}
_KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,48}$")
_MAX_BYTES = 2_000_000


def _to_out(ic: Icon) -> IconOut:
    return IconOut(key=ic.key, label=ic.label, kind=ic.kind, content_type=ic.content_type,
                   has_svg=bool(ic.svg), url=f"/api/icons/{ic.key}/raw")


@router.get("", response_model=list[IconOut])
def list_icons(db: Session = Depends(get_db)) -> list[IconOut]:
    return [_to_out(i) for i in db.scalars(select(Icon)).all()]


@router.get("/{key}/raw")
def raw_icon(key: str, db: Session = Depends(get_db)) -> Response:
    ic = db.scalar(select(Icon).where(Icon.key == key))
    if not ic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "icon not found")
    if ic.svg:
        return Response(ic.svg, media_type="image/svg+xml",
                        headers={"Cache-Control": "no-cache"})
    path = get_settings().icons_dir / ic.filename
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "icon file missing")
    return Response(path.read_bytes(), media_type=ic.content_type,
                    headers={"Cache-Control": "no-cache"})


@router.post("", response_model=IconOut)
async def upload_icon(
    key: str = Form(...),
    label: str = Form(""),
    kind: str = Form("custom"),          # "override" (replaces a built-in key) or "custom"
    svg: str = Form(""),                 # inline SVG (alternative to a file)
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    admin: Admin = Depends(require("icons.edit")),
) -> IconOut:
    key = key.strip().lower()
    if not _KEY_RE.match(key):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "key must be lowercase a-z0-9_- (max 49)")
    s = get_settings()
    ic = db.scalar(select(Icon).where(Icon.key == key)) or Icon(key=key)
    ic.label = label or key
    ic.kind = "override" if kind == "override" else "custom"

    if svg.strip():
        ic.svg = svg
        ic.content_type = "image/svg+xml"
        ic.filename = ""
    elif file is not None:
        data = await file.read()
        if len(data) > _MAX_BYTES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "image too large (max ~2 MB)")
        ct = file.content_type or "image/png"
        ext = _EXT.get(ct)
        if not ext:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "unsupported type (png/jpg/webp/svg)")
        if ext == "svg":
            ic.svg = data.decode("utf-8", "ignore")
            ic.content_type = "image/svg+xml"
            ic.filename = ""
        else:
            ic.svg = ""
            ic.content_type = ct
            ic.filename = f"{key}.{ext}"
            (s.icons_dir / ic.filename).write_bytes(data)
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "provide a file or inline svg")

    if ic.id is None:
        db.add(ic)
    db.commit()
    return _to_out(ic)


@router.delete("/{key}")
def delete_icon(key: str, db: Session = Depends(get_db),
                admin: Admin = Depends(require("icons.edit"))) -> dict:
    ic = db.scalar(select(Icon).where(Icon.key == key))
    if not ic:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "icon not found")
    if ic.filename:
        (get_settings().icons_dir / ic.filename).unlink(missing_ok=True)
    db.delete(ic)
    db.commit()
    return {"ok": True}
