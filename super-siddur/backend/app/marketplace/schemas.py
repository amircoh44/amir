"""Pydantic v2 request/response schemas for the marketplace API."""
from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, EmailStr, Field


# ---- auth ----
class RegisterIn(BaseModel):
    email: EmailStr
    name: str = ""
    password: str = Field(min_length=8)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str
    membership: str
    membership_until: dt.datetime | None = None
    credit_cents: int = 0
    kyc_status: str = "none"
    is_pro: bool = False


# ---- requests ----
class NameIn(BaseModel):
    name: str
    mother: str = ""           # ben/bat <mother> — traditional form for prayer
    note: str = ""


class RequestIn(BaseModel):
    title: str = ""
    names: list[NameIn] = Field(default_factory=list)
    scope_kind: str = "chapters"        # tehillim_all|chapters|letters|verses|sequence|custom
    scope_detail: dict = Field(default_factory=dict)
    reciter_mode: str = "group"         # single | group
    expected_reciters: int = 1
    assignment_mode: str = "free"       # free | random
    payout_split: str = "pool"          # per_reciter | pool
    gross_cents: int = 0
    unit_price_cents: int = 0
    via_app_store: bool = False
    payout_mode: str = "tzedaka"        # tzedaka | credit | cash
    tzedaka_target: str = ""
    deadline: dt.datetime | None = None
    poster_contact: dict = Field(default_factory=dict)   # {email,name} for anonymous (no-login) posting


class RequestOut(BaseModel):
    id: int
    poster_id: int
    title: str
    names: list
    scope_kind: str
    scope_detail: dict
    reciter_mode: str
    expected_reciters: int
    assignment_mode: str
    payout_split: str
    gross_cents: int
    unit_price_cents: int
    payout_mode: str
    status: str
    accepted_count: int = 0
    completed_count: int = 0
    deadline: dt.datetime | None = None
    created_at: dt.datetime


class AcceptIn(BaseModel):
    portion: dict = Field(default_factory=dict)   # ignored when assignment_mode == "random"


class CompleteIn(BaseModel):
    note: str = ""


class AssignmentOut(BaseModel):
    id: int
    request_id: int
    reciter_id: int
    reciter_name: str = ""
    portion: dict
    status: str
    note: str = ""
    accepted_at: dt.datetime
    completed_at: dt.datetime | None = None


# ---- quote / payout ----
class QuoteIn(BaseModel):
    gross_cents: int
    recipients: int = 1
    via_app_store: bool = False
    payout_mode: str | None = None


# ---- broadcast ----
class BroadcastIn(BaseModel):
    names: list[NameIn] = Field(default_factory=list)
    message: str = ""
    scope_kind: str = "custom"
    scope_detail: dict = Field(default_factory=dict)
    days: int = 30


# ---- admin config ----
class ConfigIn(BaseModel):
    pro_price_cents: int | None = None
    pro_plus_price_cents: int | None = None
    broadcast_price_cents: int | None = None
    processor_fee_pct: float | None = None
    processor_fee_flat_cents: int | None = None
    appstore_fee_pct: float | None = None
    platform_cut_pct: float | None = None
    platform_cut_max_pct: float | None = None
    payout_mode: str | None = None
    min_pledge_cents: int | None = None
    suggested_presets_cents: list[int] | None = None
    tzedaka_targets: list[dict] | None = None
    currency: str | None = None
    integrity_enabled: bool | None = None
    integrity_max_words_per_sec: float | None = None
    integrity_min_step_seconds: float | None = None
    escrow_days: int | None = None
    allow_reciter_recording: bool | None = None
    allow_poster_request_recording: bool | None = None
    allow_poster_message: bool | None = None
    recording_request_min_cents: int | None = None


# ---- B2: community ----
class ProfileIn(BaseModel):
    public: bool | None = None
    display_name: str | None = None
    section: str | None = None            # men | women | unspecified
    bio: str | None = None


class CommitmentIn(BaseModel):
    names: list[NameIn] = Field(default_factory=list)
    scope_kind: str = "custom"
    scope_detail: dict = Field(default_factory=dict)
    message: str = ""                     # "I'm davening for ___ — join me"
    section: str | None = None            # defaults to the user's profile section
    visibility: str = "private"           # private | unlisted | public


class JoinIn(BaseModel):
    display_name: str = ""


# ---- B3: integrations / consent ----
class ConsentIn(BaseModel):
    scopes: list[str] = Field(default_factory=list)   # subset of the partner's allowed scopes
    external_id: str = ""                              # the user's id in the partner app


class ActivityIn(BaseModel):
    type: str                                          # e.g. "service.completed"
    payload: dict = Field(default_factory=dict)        # e.g. {"service": "mincha"}


class PrefsIn(BaseModel):
    job_scopes: list[str] | None = None   # which scope_kinds you want alerts for ([] / None = all)
    notify: bool | None = None            # opt in to in-app prayer-alerts


# ---- fulfillment queue / integrity ----
class ConfirmIn(BaseModel):
    text: str = ""    # a brief note about the tefillah, to clear a fast-advance flag
