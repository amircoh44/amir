"""Database engine/session wiring. SQLite (WAL) by default; any SQLAlchemy URL works."""
from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


def _resolve_url() -> str:
    s = get_settings()
    if s.database_url:
        return s.database_url
    return f"sqlite:///{(s.data_dir / 'siddur.db').as_posix()}"


_url = _resolve_url()
_is_sqlite = _url.startswith("sqlite")
engine = create_engine(
    _url,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    future=True,
)


# SQLite: enable WAL + sane sync for fast concurrent reads with a single writer.
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, class_=Session)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
