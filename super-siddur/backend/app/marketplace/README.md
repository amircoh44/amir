# Marketplace — "Daven for a name" (Part B)

Isolated package inside the FastAPI backend. **Phase 1 is money-free**: the full
domain, jobs board, completion tracking, and a transparent payout engine work
end-to-end, but no real money moves. A Stripe Connect provider drops in later
behind one interface without touching the domain.

## What ships now (phase 1, tested)
- **Accounts** (`auth.py`) — market end-users (poster/reciter), reusing the core
  app's PBKDF2 + HS256 crypto. Tokens carry `kind="market"`.
- **Membership** — Pro / Pro+ tiers gate posting & accepting (`require_pro`,
  HTTP 402 → upsell). Phase 1 activates Pro on subscribe **without charging**.
- **Payout engine** (`payout.py`) — pure, deterministic, fully configurable.
  Fees first (processor → app-store), then platform cut from the net (default
  **20%**, hard-capped **50%**), then equal split among reciters. Every cent is
  accounted for; the breakdown is stored on each pledge for audit.
- **Jobs board** (`router.py`) — create requests (names + scope:
  `tehillim_all | chapters | letters | verses | sequence | custom`; reciter
  mode single/group; split per-reciter/pool; assignment free/random), browse
  the feed, accept (with random portion assignment), mark "I said it", and the
  poster sees who fulfilled it.
- **Premium broadcast** — siddur-wide name for a period (`/broadcasts`,
  `/broadcasts/active` for the app to display).
- **Admin config** (`market.admin` permission) — all rates/policy editable;
  the platform cut is clamped to the hard 50% ceiling server-side.
- **Pledges** recorded as **intents** via `NullPaymentProvider` (`payments.py`);
  `live=false`, status `intent`.

## Configurable, not hard-coded
`PayoutConfig` (singleton row) holds every rate: pro/pro+/broadcast prices,
processor %+flat, app-store %, platform cut % and its max, payout mode
(`tzedaka` default / `credit` / `cash`), min pledge, suggested presets, tzedaka
targets, currency. The halachic payout model is therefore a setting, awaiting
rabbinic sign-off — never baked into the flows.

## Phase 2 — payments (Stripe Connect), deferred by decision
Implement `StripeConnectProvider(PaymentProvider)` and swap `_provider`:
- charge posters; hold/escrow; **Connect payouts** to reciters/tzedaka
- **KYC** onboarding (`onboard_recipient`) and **1099** tax reporting via Connect
- Pro / broadcast **subscriptions**; refunds (`refund`)
- set membership active only on **successful** payment (remove phase-1 simulation)

## Compliance still required before go-live (not code-only)
- Verify **Apple/Google** rules on donations & person-to-person payments before
  pricing is finalized — may force money outside IAP or as donations.
- KYC / tax / refund flows validated with the processor.
- **Rabbinic review** of the payout model; keep `payout_mode` defaulting to
  tzedaka-routed until signed off.

## API surface
`/api/market/…` : `auth/register`, `auth/login`, `me`, `config`, `quote`,
`membership/subscribe`, `requests` (POST/GET), `requests/{id}`,
`requests/{id}/accept`, `assignments/{id}/complete`,
`requests/{id}/completions`, `broadcasts`, `broadcasts/active`,
`admin/config` (GET/PUT), `me/prefs`, `requests/matches`, `notifications`, `notifications/{id}/read`.

 Pro gates **both posting and accepting** jobs. Reciters set alert prefs (`me/prefs`), get preference-matched in-app alerts (`notifications`, `notifications/{id}/read`) when a matching request is posted, and browse `requests/matches`.

## B2 — Community / share-to-inspire (`community.py`)
- Public profiles are **opt-in, private by default** (`CommunityProfile.public=False`).
- The **men's and women's public sections are fully separated** by `section`; the
  `/community/feed` endpoint serves exactly one section and never mixes them.
- Built around **commitments** ("I'm davening for ___ — join me") and **shareable
  cards** (`/community/c/{token}`, openable with no account), not a leaderboard.
  Joiners are counted only as momentum ("davening with you"), never a rank — and
  the tone copy says so. There is no score/ranking model.

## B3 — Cross-app sync, 613 Academy (`integrations.py`, `partners.py`)
- **No user-visible API keys**: accounts link server-to-server; the user only
  grants/revokes **scoped consent** and sees exactly what syncs.
- `/integrations/{partner}/consent` (GET/POST/DELETE) + `/integrations/activity`:
  recording an activity (e.g. `service.completed: mincha`) forwards it to every
  consented partner whose granted scopes include that type — automatically.
- Delivery is signed (HMAC) server-to-server via `PartnerClient`; phase 1 uses
  `NullPartnerClient` (records, no network). A real Academy613Client swaps in.
- Nothing syncs without an active grant; revocation stops it immediately.

## Fulfillment queue + integrity engine (`fulfillment.py`)
Trust-based job completion. On accept, the poster's chosen tefillos are queued in
order (`generate_steps`); the reciter reads one, marks "I said it", the next
appears — until done. No proof, no recording.

- `GET /assignments/{id}/queue`, `POST /assignments/{id}/start`,
  `POST /steps/{id}/done`, `POST /steps/{id}/confirm`.
- **Integrity engine** = a quiet *timing* check on the paid step only. The server
  stamps `served_at` and measures `read_ms`; min plausible time =
  `est_words / max_words_per_sec`, never below a per-step floor. If a step is
  marked done impossibly fast it is **flagged** (not rejected): the queue pauses
  and asks for a one-line note, which clears it and advances.
- The reciter never supplies timing or length; `est_words` comes from the
  poster's client (`scope_detail.unit_words`). With no length, only the floor
  applies — so legitimate fast reading is never falsely flagged.
- Scope is strictly the paid tefillah's steps; content, audio, and everything
  outside the job are never inspected. All thresholds are admin-configurable
  (`integrity_enabled`, `integrity_max_words_per_sec`, `integrity_min_step_seconds`).

## Escrow + optional voice (`escrow.py`, `jobaudio.py`)
**Escrow — payouts are never instant.** When an assignment completes, a `Payout`
opens in escrow with `hold_until = now + escrow_days`. `POST /admin/payouts/
release-due` auto-releases **clean** payouts whose hold elapsed; payouts that
were ever flagged carry `requires_review` and need `POST /admin/payouts/{id}/
release` once resolved (or `/refund`). Reciters see theirs at `GET /me/payouts`.
Money-free: states only (`live=false`); real movement is the Stripe phase.

**Optional voice (both off by default, admin opt-in):**
- *Reciter recording* — `POST/GET/DELETE /assignments/{id}/recording`. Purely
  optional; never a condition of payment. Disabled unless `allow_reciter_recording`.
- *Poster asks to hear it* — `POST /assignments/{id}/recording-request` (only on
  pledges ≥ `recording_request_min_cents`, and only if `allow_poster_request_recording`);
  the reciter can `…/recording-request/decline`. No one is forced to be recorded.
- *Personal message* — `POST /requests/{id}/message` (poster) → delivered to the
  reciter (`GET /assignments/{id}/message` shows **who sent it** + audio URL).
  Disabled unless `allow_poster_message`.

Each audio service is **separately controlled** and **defaults off**:
`allow_reciter_recording`, `allow_poster_request_recording`, `allow_poster_message`.

Audio bytes live on disk (`audio_dir`), capped at 20 MB/clip.
