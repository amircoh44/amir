"""Application configuration (env-driven). Keep all tunables here."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent          # .../backend
PROJECT_DIR = BACKEND_DIR.parent                              # .../super-siddur
PUBLIC_DIR = PROJECT_DIR / "public"                           # static frontend


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SIDDUR_", env_file=".env", extra="ignore")

    # Where mutable data lives (sqlite db, uploaded icons).
    data_dir: Path = PROJECT_DIR / "data"

    # Fast default: file-backed SQLite (WAL). Swap to Postgres etc. via SIDDUR_DATABASE_URL.
    database_url: str = ""  # resolved in db.py from data_dir if empty

    # Auth.
    jwt_secret: str = "change-me-in-production"
    jwt_alg: str = "HS256"
    jwt_ttl_hours: int = 24 * 14

    # Seeded super admins (full permissions). Comma-separated to override.
    superadmin_emails: str = "amir@graphicatz.com,shalomlebowitz@gmail.com"
    superadmin_password: str = "change-me"  # initial password for seeded super admins

    # CORS origins (the app is same-origin in production; open for local dev).
    cors_origins: str = "*"

    # Partner sync (B3): shared secret for server-to-server signing. Absent in
    # phase 1 → NullPartnerClient records deliveries without any network call.
    academy613_secret: str = ""

    # Google one-tap login. Verifies ID tokens via Google's tokeninfo endpoint.
    # google_dev_mode decodes tokens WITHOUT verifying (local/dev/test only).
    google_client_id: str = ""
    google_dev_mode: bool = False

    @property
    def icons_dir(self) -> Path:
        return self.data_dir / "icons"

    @property
    def audio_dir(self) -> Path:
        return self.data_dir / "job_audio"

    @property
    def superadmin_list(self) -> list[str]:
        return [e.strip().lower() for e in self.superadmin_emails.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    s = get_settings_uncached()
    return s


def get_settings_uncached() -> Settings:
    s = Settings()
    s.data_dir.mkdir(parents=True, exist_ok=True)
    s.icons_dir.mkdir(parents=True, exist_ok=True)
    return s
