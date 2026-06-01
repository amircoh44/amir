"""Application settings, loaded from environment / .env.

All configuration funnels through a single cached ``Settings`` instance so that
secrets stay in the environment (never in the repo) and the rest of the codebase
has one typed source of truth.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- App ---
    app_name: str = "GreenBulk Wholesale"
    environment: str = "development"
    debug: bool = True
    base_url: str = "http://localhost:8000"
    secret_key: str = "dev-only-insecure-secret-change-me"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://greenbulk:greenbulk@localhost:5432/greenbulk"
    redis_url: str | None = "redis://localhost:6379/0"

    # --- Auth ---
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 60
    refresh_token_ttl_days: int = 30

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # --- Stripe ---
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_currency: str = "usd"

    # --- SendGrid ---
    sendgrid_api_key: str = ""
    email_from: str = "orders@greenbulk.example"
    email_from_name: str = "GreenBulk Orders"

    # --- Rate limits ---
    ratelimit_auth: str = "10/minute"
    ratelimit_public_api: str = "120/minute"

    # --- Compliance ---
    require_business_verification: bool = True
    restricted_states: str = "ID,KS,NE"
    minimum_age: int = 21

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def sync_database_url(self) -> str:
        """Sync SQLAlchemy URL for Alembic / management scripts."""
        return self.database_url.replace("+asyncpg", "+psycopg2")

    @property
    def restricted_state_set(self) -> set[str]:
        return {s.strip().upper() for s in self.restricted_states.split(",") if s.strip()}

    @property
    def google_oauth_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def stripe_enabled(self) -> bool:
        return bool(self.stripe_secret_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
