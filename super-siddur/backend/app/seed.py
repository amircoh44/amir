"""First-run seeding: create tables, seed super admins, import bundled siddur text."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from .config import PUBLIC_DIR, get_settings
from .db import Base, SessionLocal, engine
from .models import Admin, Content
from .marketplace import models as _marketplace_models  # noqa: F401  (register tables for create_all)
from .marketplace.models import PayoutConfig
from .security import get_admin_by_email, hash_password


def _load_bundled_textdata() -> list:
    """Parse window.TEXTDATA=[...] from the frontend bundle into a Python list."""
    f = PUBLIC_DIR / "js" / "textdata.js"
    if not f.exists():
        return []
    src = f.read_text(encoding="utf-8")
    start, end = src.find("["), src.rfind("]")
    if start < 0 or end < 0:
        return []
    try:
        return json.loads(src[start:end + 1])
    except json.JSONDecodeError:
        return []


def seed() -> None:
    Base.metadata.create_all(engine)
    s = get_settings()
    db: Session = SessionLocal()
    try:
        # Super admins.
        for email in s.superadmin_list:
            if not get_admin_by_email(db, email):
                db.add(Admin(email=email, name=email.split("@")[0],
                             password_hash=hash_password(s.superadmin_password),
                             role="superadmin", permissions=[]))
        # Content (seed once from the bundle).
        if db.get(Content, 1) is None:
            db.add(Content(id=1, docs=_load_bundled_textdata()))
        # Marketplace payout config (defaults: 20% cut, tzedaka-routed).
        if db.get(PayoutConfig, 1) is None:
            db.add(PayoutConfig(id=1))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded database.")
