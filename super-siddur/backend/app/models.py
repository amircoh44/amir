"""ORM models. Each concern is a separate table."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="editor")  # superadmin | editor
    # Granular permissions for non-super admins (superadmin implies all).
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Content(Base):
    """Single-row store for the siddur text (the TEXTDATA array)."""
    __tablename__ = "content"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    docs: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Setting(Base):
    """Key/value site settings (e.g. splash branding)."""
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Icon(Base):
    """Custom / overriding icons. `key` overrides a built-in icon or names a new one.
    The image bytes live on disk (icons_dir/<key>.<ext>); this row holds metadata."""
    __tablename__ = "icons"
    __table_args__ = (UniqueConstraint("key", name="uq_icon_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(64), index=True)
    label: Mapped[str] = mapped_column(String(120), default="")
    kind: Mapped[str] = mapped_column(String(16), default="custom")  # override | custom
    filename: Mapped[str] = mapped_column(String(255))               # stored file name
    content_type: Mapped[str] = mapped_column(String(64), default="image/png")
    svg: Mapped[str] = mapped_column(Text, default="")              # inline SVG (if provided instead of a file)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
