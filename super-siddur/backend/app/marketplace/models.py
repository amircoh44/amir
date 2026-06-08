"""Marketplace ORM models — isolated tables, cleanly separable from the core app.

Money-free phase: pledges are recorded as intents; no real funds move. The
payout breakdown is stored on each pledge for a transparent, auditable trail.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


class MarketUser(Base):
    """An end-user of the marketplace (poster and/or reciter)."""
    __tablename__ = "market_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    membership: Mapped[str] = mapped_column(String(32), default="free")     # free | pro | pro_plus
    membership_until: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # reciter preferences for matching alerts (portions, languages, max load, notify channels)
    prefs: Mapped[dict] = mapped_column(JSON, default=dict)
    payout_method: Mapped[dict] = mapped_column(JSON, default=dict)         # destination details (tzedaka/credit/cash)
    credit_cents: Mapped[int] = mapped_column(Integer, default=0)           # in-app credit balance
    kyc_status: Mapped[str] = mapped_column(String(16), default="none")     # none | pending | verified
    provider_customer_ref: Mapped[str] = mapped_column(String(128), default="")  # e.g. Stripe customer id (phase 2)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class PayoutConfig(Base):
    """Singleton (id=1) of admin-editable rates and policy. All rates configurable."""
    __tablename__ = "market_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # membership / broadcast pricing
    pro_price_cents: Mapped[int] = mapped_column(Integer, default=399)          # $3.99/mo
    pro_plus_price_cents: Mapped[int] = mapped_column(Integer, default=999)     # higher tier
    broadcast_price_cents: Mapped[int] = mapped_column(Integer, default=20000)  # ~$200/mo premium broadcast
    # fees & cut (percentages stored as floats 0..1)
    processor_fee_pct: Mapped[float] = mapped_column(default=0.029)
    processor_fee_flat_cents: Mapped[int] = mapped_column(Integer, default=30)
    appstore_fee_pct: Mapped[float] = mapped_column(default=0.30)
    platform_cut_pct: Mapped[float] = mapped_column(default=0.20)               # default 20%
    platform_cut_max_pct: Mapped[float] = mapped_column(default=0.50)           # adjustable up to ~50%
    # policy
    payout_mode: Mapped[str] = mapped_column(String(16), default="tzedaka")     # tzedaka | credit | cash
    min_pledge_cents: Mapped[int] = mapped_column(Integer, default=100)
    suggested_presets_cents: Mapped[list] = mapped_column(JSON, default=lambda: [180, 360, 1000, 1800])
    tzedaka_targets: Mapped[list] = mapped_column(JSON, default=list)           # [{key,label}]
    currency: Mapped[str] = mapped_column(String(8), default="usd")
    # integrity engine — a quiet timing sanity check on the paid tefillah only
    integrity_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    integrity_max_words_per_sec: Mapped[float] = mapped_column(default=6.0)      # faster than this is impossible
    integrity_min_step_seconds: Mapped[float] = mapped_column(default=2.0)       # floor per step regardless of length
    # escrow — payouts are never instant; they sit a few days before release
    escrow_days: Mapped[int] = mapped_column(Integer, default=3)
    # optional voice services (both off by default; admin opt-in, each separately controlled)
    allow_reciter_recording: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_poster_request_recording: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_poster_message: Mapped[bool] = mapped_column(Boolean, default=False)
    recording_request_min_cents: Mapped[int] = mapped_column(Integer, default=10000)  # e.g. $100+
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class PrayerRequest(Base):
    """A poster's request for prayers on one or more names."""
    __tablename__ = "market_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    poster_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    names: Mapped[list] = mapped_column(JSON, default=list)        # [{name, mother, note}]
    # what is wanted
    scope_kind: Mapped[str] = mapped_column(String(24), default="chapters")  # tehillim_all|chapters|letters|verses|sequence|custom
    scope_detail: Mapped[dict] = mapped_column(JSON, default=dict)           # {chapters:[...], letters:[...], sequence:"refuah", ...}
    # who recites
    reciter_mode: Mapped[str] = mapped_column(String(16), default="group")   # single | group
    expected_reciters: Mapped[int] = mapped_column(Integer, default=1)
    assignment_mode: Mapped[str] = mapped_column(String(16), default="free") # free | random
    # pricing
    payout_split: Mapped[str] = mapped_column(String(16), default="pool")    # per_reciter | pool
    gross_cents: Mapped[int] = mapped_column(Integer, default=0)             # total the poster pledges
    unit_price_cents: Mapped[int] = mapped_column(Integer, default=0)        # per-reciter price (per_reciter mode)
    via_app_store: Mapped[bool] = mapped_column(Boolean, default=False)
    payout_mode: Mapped[str] = mapped_column(String(16), default="tzedaka")
    tzedaka_target: Mapped[str] = mapped_column(String(64), default="")
    # lifecycle
    status: Mapped[str] = mapped_column(String(16), default="open")          # open | in_progress | completed | cancelled
    deadline: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Assignment(Base):
    """A reciter accepting (a portion of) a request, and marking it done."""
    __tablename__ = "market_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("market_requests.id", ondelete="CASCADE"), index=True)
    reciter_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    portion: Mapped[dict] = mapped_column(JSON, default=dict)        # assigned chapters/letters/verses
    status: Mapped[str] = mapped_column(String(16), default="accepted")  # accepted | completed | abandoned
    note: Mapped[str] = mapped_column(Text, default="")
    accepted_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Broadcast(Base):
    """Premium siddur-wide broadcast: a name shown to all users for a period."""
    __tablename__ = "market_broadcasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sponsor_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    names: Mapped[list] = mapped_column(JSON, default=list)
    message: Mapped[str] = mapped_column(Text, default="")
    scope_kind: Mapped[str] = mapped_column(String(24), default="custom")
    scope_detail: Mapped[dict] = mapped_column(JSON, default=dict)
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    start_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    end_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending | active | ended | cancelled
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Pledge(Base):
    """A recorded pledge/charge intent with its full payout breakdown (audit trail).
    Money-free phase: status stays 'intent' and `live` is false."""
    __tablename__ = "market_pledges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    payer_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("market_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    broadcast_id: Mapped[int | None] = mapped_column(ForeignKey("market_broadcasts.id", ondelete="SET NULL"), nullable=True)
    kind: Mapped[str] = mapped_column(String(16), default="request")    # request | broadcast | membership
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)         # output of compute_payout
    provider: Mapped[str] = mapped_column(String(24), default="null")
    provider_ref: Mapped[str] = mapped_column(String(128), default="")
    status: Mapped[str] = mapped_column(String(16), default="intent")  # intent | captured | released | refunded
    live: Mapped[bool] = mapped_column(Boolean, default=False)         # did real money move?
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ===================== B2: community / share-to-inspire =====================
class CommunityProfile(Base):
    """Per-user public-profile settings. PRIVATE BY DEFAULT (public=False).
    `section` keeps the men's and women's public spaces fully separated."""
    __tablename__ = "market_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), primary_key=True)
    public: Mapped[bool] = mapped_column(Boolean, default=False)          # opt-in visibility
    display_name: Mapped[str] = mapped_column(String(120), default="")    # alias shown publicly
    section: Mapped[str] = mapped_column(String(16), default="unspecified")  # men | women | unspecified
    bio: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Commitment(Base):
    """'I committed to daven for someone — join me.' Framed as inspiration, not
    a ranking. There is deliberately no score/leaderboard model here."""
    __tablename__ = "market_commitments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    names: Mapped[list] = mapped_column(JSON, default=list)               # [{name, mother, note}]
    scope_kind: Mapped[str] = mapped_column(String(24), default="custom")
    scope_detail: Mapped[dict] = mapped_column(JSON, default=dict)
    message: Mapped[str] = mapped_column(Text, default="")                # "I'm davening for ___ — join me"
    section: Mapped[str] = mapped_column(String(16), default="unspecified")  # men | women | unspecified
    visibility: Mapped[str] = mapped_column(String(16), default="private")   # private | unlisted | public
    share_token: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CommitmentJoin(Base):
    """Someone answering 'join me' on a commitment. A count of *joiners*, never
    presented as a competitive score."""
    __tablename__ = "market_commitment_joins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    commitment_id: Mapped[int] = mapped_column(ForeignKey("market_commitments.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("market_users.id", ondelete="SET NULL"), nullable=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


# ===================== B3: cross-app sync (613 Academy) =====================
class IntegrationConsent(Base):
    """Explicit, opt-in consent to sync activity to a partner app. No user-visible
    API keys: linking is server-to-server; the user only grants/revokes consent
    and sees exactly which scopes sync."""
    __tablename__ = "market_integration_consents"
    __table_args__ = (UniqueConstraint("user_id", "partner", name="uq_consent_user_partner"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    partner: Mapped[str] = mapped_column(String(32), default="academy613")
    scopes: Mapped[list] = mapped_column(JSON, default=list)              # e.g. ["service.completed","tehillim.read"]
    external_id: Mapped[str] = mapped_column(String(128), default="")     # the user's id in the partner app
    status: Mapped[str] = mapped_column(String(16), default="granted")    # granted | revoked
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    revoked_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ActivityEvent(Base):
    """A siddur activity (e.g. service.completed: mincha). Forwarded to consented
    partners; `deliveries` records per-partner outcome for auditing."""
    __tablename__ = "market_activity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(48), default="")            # service.completed | tehillim.read | commitment.created
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    deliveries: Mapped[list] = mapped_column(JSON, default=list)         # [{partner,status,ref,live}]
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Notification(Base):
    """In-app prayer-alert for a reciter whose preferences match a new request.
    Phase 1 is in-app only; external push (web/email) is a phase-2 channel."""
    __tablename__ = "market_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(24), default="job_match")
    request_id: Mapped[int | None] = mapped_column(ForeignKey("market_requests.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(200), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class JobStep(Base):
    """One queued tefillah within an assignment — read it, mark done, the next
    appears. Trust-based: no proof required. The server stamps `served_at` and
    measures `read_ms` so the integrity engine can sanity-check only the timing
    of the paid tefillah. `est_words` (when known, from the poster's client) lets
    the check be precise; otherwise only the per-step floor applies."""
    __tablename__ = "market_job_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("market_assignments.id", ondelete="CASCADE"), index=True)
    seq: Mapped[int] = mapped_column(Integer, default=0)              # order in the queue
    unit_kind: Mapped[str] = mapped_column(String(16), default="chapter")  # chapter|verse|letter|whole
    unit_ref: Mapped[str] = mapped_column(String(48), default="")     # e.g. "121" (Tehillim 121)
    label: Mapped[str] = mapped_column(String(160), default="")
    est_words: Mapped[int | None] = mapped_column(Integer, nullable=True)  # word count when known
    status: Mapped[str] = mapped_column(String(16), default="pending")     # pending|active|done|flagged
    served_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    done_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flag_reason: Mapped[str] = mapped_column(String(200), default="")
    confirmation: Mapped[str] = mapped_column(Text, default="")        # the brief reply that clears a flag


class Payout(Base):
    """Reciter payout held in escrow. Never instant: it sits until `hold_until`
    (a few days) so integrity has time to settle. Clean jobs auto-release after
    the hold; flagged ones need admin release once resolved."""
    __tablename__ = "market_payouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("market_assignments.id", ondelete="CASCADE"), index=True)
    reciter_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"), index=True)
    request_id: Mapped[int | None] = mapped_column(ForeignKey("market_requests.id", ondelete="SET NULL"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    payout_mode: Mapped[str] = mapped_column(String(16), default="tzedaka")
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="held")     # held | released | refunded | cancelled
    requires_review: Mapped[bool] = mapped_column(Boolean, default=False)  # was flagged → admin must release
    hold_until: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    released_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    live: Mapped[bool] = mapped_column(Boolean, default=False)          # did real money move? (phase 2)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class JobRecording(Base):
    """Reciter's OPTIONAL recording of themselves saying the tefillah. Never a
    condition of payment. Stored on disk (audio_dir/<id>.<ext>)."""
    __tablename__ = "market_recordings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("market_assignments.id", ondelete="CASCADE"), index=True)
    reciter_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255), default="")
    content_type: Mapped[str] = mapped_column(String(64), default="audio/webm")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    shared: Mapped[bool] = mapped_column(Boolean, default=True)         # reciter may keep it private
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)


class RecordingRequest(Base):
    """A poster asking to hear the reciter's recording (allowed only on larger
    pledges). The reciter is always free to decline."""
    __tablename__ = "market_recording_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(ForeignKey("market_assignments.id", ondelete="CASCADE"), index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(16), default="requested")  # requested | declined | fulfilled
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class JobMessage(Base):
    """A short personal audio the poster attaches to a job ('thinking of you,
    get well…'), delivered to whoever takes it; the reciter sees who sent it."""
    __tablename__ = "market_job_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("market_requests.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("market_users.id", ondelete="CASCADE"))
    sender_name: Mapped[str] = mapped_column(String(160), default="")
    filename: Mapped[str] = mapped_column(String(255), default="")
    content_type: Mapped[str] = mapped_column(String(64), default="audio/webm")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=_now)
