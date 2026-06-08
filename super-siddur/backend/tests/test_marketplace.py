"""Marketplace tests: the payout engine (pure) + the money-free jobs-board flow."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="siddur-mkt-test-")
os.environ.setdefault("SIDDUR_DATA_DIR", _TMP)
os.environ.setdefault("SIDDUR_JWT_SECRET", "test-secret")
os.environ.setdefault("SIDDUR_SUPERADMIN_PASSWORD", "supersecret1")
os.environ.setdefault("SIDDUR_SUPERADMIN_EMAILS", "amir@graphicatz.com")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.marketplace.payout import (Rates, compute_payout,  # noqa: E402
                                    effective_platform_cut)
from app.seed import seed  # noqa: E402

seed()
client = TestClient(app)


# ---------------- pure payout engine ----------------
def test_payout_breakdown_is_transparent_and_sums():
    r = Rates(processor_fee_pct=0.029, processor_fee_flat_cents=30, appstore_fee_pct=0.30,
              platform_cut_pct=0.20, platform_cut_max_pct=0.50)
    b = compute_payout(10000, r, via_app_store=False, recipients=4)
    assert b["processor_fee_cents"] == round(10000 * 0.029) + 30      # fees first
    assert b["appstore_fee_cents"] == 0
    assert b["net_cents"] == 10000 - b["processor_fee_cents"]
    assert b["platform_cut_cents"] == round(b["net_cents"] * 0.20)    # cut from net
    # every cent is accounted for
    assert (b["processor_fee_cents"] + b["appstore_fee_cents"]
            + b["platform_cut_cents"] + b["distributable_cents"] == 10000)
    assert b["per_recipient_cents"] * b["recipients"] + b["remainder_cents"] == b["distributable_cents"]


def test_appstore_fee_and_hard_cut_cap():
    r = Rates(platform_cut_pct=0.95, platform_cut_max_pct=0.99)   # absurd config
    assert effective_platform_cut(r) == 0.50                      # hard-capped at 50%
    b = compute_payout(10000, r, via_app_store=True, recipients=1)
    assert b["appstore_fee_cents"] == 3000
    assert b["platform_cut_pct"] == 0.5


# ---------------- API flow ----------------
def _tok(email, pw="password123", name="U"):
    r = client.post("/api/market/auth/register", json={"email": email, "name": name, "password": pw})
    if r.status_code == 409:
        r = client.post("/api/market/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _h(t):
    return {"Authorization": f"Bearer {t}"}


def test_quote_endpoint_public():
    b = client.post("/api/market/quote", json={"gross_cents": 1000, "recipients": 2}).json()
    assert b["distributable_cents"] > 0 and b["recipients"] == 2


def test_full_jobs_board_flow():
    poster = _tok("poster@example.com", name="Poster")
    reciter = _tok("reciter@example.com", name="Reciter")

    # posting is OPEN to everyone — no Pro required (a free account can post)
    body = {"title": "Refuah for Chaim", "names": [{"name": "Chaim", "mother": "Sarah"}],
            "scope_kind": "chapters", "scope_detail": {"chapters": [20, 121, 130]},
            "reciter_mode": "group", "expected_reciters": 2, "assignment_mode": "free",
            "payout_split": "pool", "gross_cents": 1000, "payout_mode": "tzedaka"}
    r = client.post("/api/market/requests", headers=_h(poster), json=body)
    assert r.status_code == 200, r.text
    rid = r.json()["id"]
    assert r.json()["pledge_breakdown"]["distributable_cents"] > 0

    # it shows on the jobs board feed
    feed = client.get("/api/market/requests").json()
    assert any(x["id"] == rid for x in feed)

    # accepting a paid job also requires Pro (Pro unlocks posting AND accepting)
    assert client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter),
                       json={"portion": {"units": [20]}}).status_code == 402
    client.post("/api/market/membership/subscribe", headers=_h(reciter), json={"tier": "pro"})
    a = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter),
                    json={"portion": {"units": [20]}})
    assert a.status_code == 200, a.text
    aid = a.json()["id"]
    c = client.post(f"/api/market/assignments/{aid}/complete", headers=_h(reciter), json={"note": "Said it"})
    assert c.status_code == 200 and c.json()["status"] == "completed"

    # the poster sees who fulfilled it; a non-poster cannot
    comp = client.get(f"/api/market/requests/{rid}/completions", headers=_h(poster)).json()
    assert any(x["status"] == "completed" and x["reciter_name"] == "Reciter" for x in comp)
    assert client.get(f"/api/market/requests/{rid}/completions", headers=_h(reciter)).status_code == 403


def test_random_assignment_picks_a_unit():
    poster = _tok("poster2@example.com", name="Poster2")
    reciter = _tok("reciter2@example.com", name="Reciter2")
    client.post("/api/market/membership/subscribe", headers=_h(poster), json={"tier": "pro"})
    body = {"title": "Tehillim", "names": [{"name": "Dovid"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1, 2, 3]}, "reciter_mode": "group",
            "expected_reciters": 3, "assignment_mode": "random", "payout_split": "pool",
            "gross_cents": 900}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    client.post("/api/market/membership/subscribe", headers=_h(reciter), json={"tier": "pro"})
    a = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()
    assert a["portion"]["units"] and a["portion"]["units"][0] in (1, 2, 3)


def _admin_tok():
    return client.post("/api/auth/login",
                       json={"email": "amir@graphicatz.com", "password": "supersecret1"}).json()["access_token"]


def test_admin_config_enforces_cut_cap():
    tok = _admin_tok()
    r = client.put("/api/market/admin/config", headers=_h(tok),
                   json={"platform_cut_pct": 0.80, "platform_cut_max_pct": 0.90})
    assert r.status_code == 200, r.text
    cfg = client.get("/api/market/admin/config", headers=_h(tok)).json()
    assert cfg["platform_cut_max_pct"] == 0.50      # hard-capped
    assert cfg["platform_cut_pct"] <= 0.50
    # restore default so other tests/runs aren't affected
    client.put("/api/market/admin/config", headers=_h(tok),
               json={"platform_cut_pct": 0.20, "platform_cut_max_pct": 0.50})


def test_marketplace_admin_permission_required():
    # a market user token must not be able to edit admin config
    user = _tok("rando@example.com")
    assert client.get("/api/market/admin/config", headers=_h(user)).status_code in (401, 403)


# ---------------- B2: community / share-to-inspire ----------------
def test_profile_private_by_default_and_section_feed_separation():
    u = _tok("commit_men@example.com", name="Avi")
    # private by default
    prof = client.get("/api/market/community/profile", headers=_h(u)).json()
    assert prof["public"] is False
    # opt into the men's section
    client.put("/api/market/community/profile", headers=_h(u),
               json={"public": True, "display_name": "Avi", "section": "men"})
    # a public commitment in the men's section
    r = client.post("/api/market/community/commitments", headers=_h(u),
                    json={"names": [{"name": "Chaim"}], "message": "Davening for Chaim — join me",
                          "visibility": "public"})
    assert r.status_code == 200, r.text
    token = r.json()["share_token"]
    # appears in the men's feed, NOT the women's feed (full separation)
    men = client.get("/api/market/community/feed?section=men", headers=_h(u)).json()
    women = client.get("/api/market/community/feed?section=women", headers=_h(u)).json()
    assert any(x["share_token"] == token for x in men["items"])
    assert all(x["share_token"] != token for x in women["items"])
    assert "not a contest" in men["note"].lower()  # inspiration, not competition


def test_public_commitment_requires_a_section():
    u = _tok("nosection@example.com", name="X")  # profile.section stays "unspecified"
    r = client.post("/api/market/community/commitments", headers=_h(u),
                    json={"names": [{"name": "Y"}], "visibility": "public"})
    assert r.status_code == 400  # must pick men's or women's section before public sharing


def test_share_card_open_and_join_without_account():
    u = _tok("sharer@example.com", name="Sharer")
    client.put("/api/market/community/profile", headers=_h(u), json={"public": True, "section": "women"})
    token = client.post("/api/market/community/commitments", headers=_h(u),
                        json={"names": [{"name": "Leah"}], "visibility": "public",
                              "message": "Join me"}).json()["share_token"]
    # a friend opens the link with no account and joins
    card = client.get(f"/api/market/community/c/{token}").json()
    assert card["names"][0]["name"] == "Leah"
    j = client.post(f"/api/market/community/c/{token}/join", json={"display_name": "Friend"})
    assert j.status_code == 200 and j.json()["joining"] == 1
    # a private card is not shareable
    ptoken = client.post("/api/market/community/commitments", headers=_h(u),
                         json={"names": [{"name": "Z"}], "visibility": "private"}).json()["share_token"]
    assert client.get(f"/api/market/community/c/{ptoken}").status_code == 404


# ---------------- B3: cross-app sync (613 Academy) ----------------
def test_consent_gated_activity_sync():
    u = _tok("sync@example.com", name="Syncer")
    # partner is discoverable with its scopes
    partners = client.get("/api/market/integrations/partners").json()["partners"]
    assert any(p["key"] == "academy613" for p in partners)
    # no consent yet → nothing syncs
    ev = client.post("/api/market/integrations/activity", headers=_h(u),
                     json={"type": "service.completed", "payload": {"service": "mincha"}}).json()
    assert ev["delivered_to"] == []
    # bad scope rejected
    bad = client.post("/api/market/integrations/academy613/consent", headers=_h(u),
                      json={"scopes": ["not.a.scope"], "external_id": "ext-1"})
    assert bad.status_code == 400
    # grant scoped consent (external_id = identity from the server-to-server link)
    g = client.post("/api/market/integrations/academy613/consent", headers=_h(u),
                    json={"scopes": ["service.completed"], "external_id": "academy-user-42"})
    assert g.status_code == 200
    # consent screen shows exactly what syncs
    cons = client.get("/api/market/integrations/academy613/consent", headers=_h(u)).json()
    assert cons["granted"] and cons["syncs"][0]["key"] == "service.completed"
    # davening Mincha now reflects to the partner
    ev = client.post("/api/market/integrations/activity", headers=_h(u),
                     json={"type": "service.completed", "payload": {"service": "mincha"}}).json()
    assert any(d["partner"] == "academy613" for d in ev["delivered_to"])
    # an out-of-scope activity does NOT sync
    ev2 = client.post("/api/market/integrations/activity", headers=_h(u),
                      json={"type": "tehillim.read", "payload": {"chapters": [1]}}).json()
    assert ev2["delivered_to"] == []
    # revoke → syncing stops
    client.delete("/api/market/integrations/academy613/consent", headers=_h(u))
    ev3 = client.post("/api/market/integrations/activity", headers=_h(u),
                      json={"type": "service.completed", "payload": {"service": "mincha"}}).json()
    assert ev3["delivered_to"] == []


def test_prefs_alerts_and_matches():
    poster = _tok("alertposter@example.com", name="AP")
    client.post("/api/market/membership/subscribe", headers=_h(poster), json={"tier": "pro"})
    reciter = _tok("alertreciter@example.com", name="AR")
    client.post("/api/market/membership/subscribe", headers=_h(reciter), json={"tier": "pro"})
    # reciter opts into alerts for "chapters" requests only
    client.put("/api/market/me/prefs", headers=_h(reciter), json={"job_scopes": ["chapters"], "notify": True})
    body = {"title": "Refuah", "names": [{"name": "Miriam"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "group", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 500}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    # reciter received an in-app prayer-alert and it appears in their matches feed
    notes = client.get("/api/market/notifications?unread_only=true", headers=_h(reciter)).json()
    assert any(n["request_id"] == rid for n in notes)
    nid = next(n["id"] for n in notes if n["request_id"] == rid)
    assert client.post(f"/api/market/notifications/{nid}/read", headers=_h(reciter)).status_code == 200
    matches = client.get("/api/market/requests/matches", headers=_h(reciter)).json()
    assert any(m["id"] == rid for m in matches)
    # an out-of-scope (sequence) request does NOT alert this chapters-only reciter
    body2 = dict(body, scope_kind="sequence", scope_detail={"sequence": "refuah"})
    rid2 = client.post("/api/market/requests", headers=_h(poster), json=body2).json()["id"]
    notes2 = client.get("/api/market/notifications?unread_only=true", headers=_h(reciter)).json()
    assert all(n["request_id"] != rid2 for n in notes2)
    # the poster never gets a self-alert
    pnotes = client.get("/api/market/notifications", headers=_h(poster)).json()
    assert all(n["request_id"] not in (rid, rid2) for n in pnotes)


# ---------------- Fulfillment queue + integrity engine ----------------
def _pro(email, name):
    t = _tok(email, name=name)
    client.post("/api/market/membership/subscribe", headers=_h(t), json={"tier": "pro"})
    return t


def test_fulfillment_queue_flag_and_confirm():
    atok = _admin_tok()
    client.put("/api/market/admin/config", headers=_h(atok),
               json={"integrity_enabled": True, "integrity_min_step_seconds": 2.0,
                     "integrity_max_words_per_sec": 6.0})
    poster = _pro("qposter@example.com", "QP")
    reciter = _pro("qreciter@example.com", "QR")
    body = {"title": "Tehillim", "names": [{"name": "Yael"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [20, 121], "unit_words": {"20": 70, "121": 50}},
            "reciter_mode": "single", "expected_reciters": 1, "assignment_mode": "free",
            "payout_split": "pool", "gross_cents": 500}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    acc = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()
    assert acc["steps"] == 2
    aid = acc["id"]

    # queue is built; start serves the first tefillah in order
    st = client.post(f"/api/market/assignments/{aid}/start", headers=_h(reciter)).json()
    sid0 = st["current"]["id"]
    assert st["current"]["label"] == "Tehillim 20"

    # marking it done instantly is impossibly fast -> gentle flag (no advance)
    d = client.post(f"/api/market/steps/{sid0}/done", headers=_h(reciter)).json()
    assert d["flagged"] is True and "quickly" in d["message"].lower()

    # a too-short confirmation is rejected; a real one clears the flag and advances
    assert client.post(f"/api/market/steps/{sid0}/confirm", headers=_h(reciter), json={"text": "ok"}).status_code == 400
    c = client.post(f"/api/market/steps/{sid0}/confirm", headers=_h(reciter),
                    json={"text": "Said Tehillim 20 with kavana for Yael's refuah"}).json()
    assert c["completed"] is False and c["next"]["label"] == "Tehillim 121"
    sid1 = c["next"]["id"]

    # finishing the last step (also flagged then confirmed) completes the assignment
    assert client.post(f"/api/market/steps/{sid1}/done", headers=_h(reciter)).json()["flagged"] is True
    fin = client.post(f"/api/market/steps/{sid1}/confirm", headers=_h(reciter),
                      json={"text": "Said Tehillim 121 b'kavana"}).json()
    assert fin["completed"] is True
    assert client.get(f"/api/market/assignments/{aid}/queue", headers=_h(reciter)).json()["status"] == "completed"


def test_fulfillment_trust_passes_without_flags():
    atok = _admin_tok()
    client.put("/api/market/admin/config", headers=_h(atok), json={"integrity_enabled": False})
    poster = _pro("qposter2@example.com", "QP2")
    reciter = _pro("qreciter2@example.com", "QR2")
    body = {"title": "Tehillim", "names": [{"name": "Dov"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1, 2]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 500}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    aid = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()["id"]
    sid = client.post(f"/api/market/assignments/{aid}/start", headers=_h(reciter)).json()["current"]["id"]
    # trust mode: instant done is accepted, queue advances and completes
    d = client.post(f"/api/market/steps/{sid}/done", headers=_h(reciter)).json()
    assert d["flagged"] is False and d["next"]["label"] == "Tehillim 2"
    sid2 = d["next"]["id"]
    assert client.post(f"/api/market/steps/{sid2}/done", headers=_h(reciter)).json()["completed"] is True
    # restore default for other tests
    client.put("/api/market/admin/config", headers=_h(atok), json={"integrity_enabled": True})


def test_integrity_scope_is_only_the_step_timing():
    # the integrity check only ever looks at step timing — never content/audio.
    from app.marketplace.fulfillment import integrity_ok, min_seconds_for
    from app.marketplace.models import JobStep, PayoutConfig
    cfg = PayoutConfig(id=1, integrity_enabled=True, integrity_min_step_seconds=2.0,
                       integrity_max_words_per_sec=6.0)
    step = JobStep(est_words=60)                      # 60 words / 6 wps = 10s minimum
    assert round(min_seconds_for(step, cfg)) == 10
    assert integrity_ok(step, 1200, cfg)[0] is False  # 1.2s -> impossible
    assert integrity_ok(step, 12000, cfg)[0] is True   # 12s -> fine
    cfg.integrity_enabled = False
    assert integrity_ok(step, 50, cfg)[0] is True      # disabled -> always trust


# ---------------- Escrow ----------------
def test_escrow_holds_then_releases_clean_payout():
    atok = _admin_tok()
    client.put("/api/market/admin/config", headers=_h(atok),
               json={"escrow_days": 0, "integrity_enabled": False})
    poster = _pro("escposter@example.com", "EP")
    reciter = _pro("escreciter@example.com", "ER")
    body = {"title": "T", "names": [{"name": "Rina"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 1000}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    aid = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()["id"]
    client.post(f"/api/market/assignments/{aid}/complete", headers=_h(reciter), json={"note": "done"})
    # payout exists, held (never instant), clean
    payouts = client.get("/api/market/me/payouts", headers=_h(reciter)).json()
    p = next(x for x in payouts if x["assignment_id"] == aid)
    assert p["status"] == "held" and p["requires_review"] is False and p["amount_cents"] > 0
    # escrow_days 0 -> hold elapsed -> auto-release of clean payouts
    rel = client.post("/api/market/admin/payouts/release-due", headers=_h(atok)).json()
    assert p["id"] in rel["released"]
    p2 = next(x for x in client.get("/api/market/me/payouts", headers=_h(reciter)).json() if x["id"] == p["id"])
    assert p2["status"] == "released"
    client.put("/api/market/admin/config", headers=_h(atok), json={"escrow_days": 3, "integrity_enabled": True})


def test_escrow_flagged_payout_needs_admin_release():
    atok = _admin_tok()
    client.put("/api/market/admin/config", headers=_h(atok),
               json={"escrow_days": 0, "integrity_enabled": True, "integrity_min_step_seconds": 2.0})
    poster = _pro("escposter2@example.com", "EP2")
    reciter = _pro("escreciter2@example.com", "ER2")
    body = {"title": "T", "names": [{"name": "Tov"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 1000}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    aid = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()["id"]
    sid = client.post(f"/api/market/assignments/{aid}/start", headers=_h(reciter)).json()["current"]["id"]
    assert client.post(f"/api/market/steps/{sid}/done", headers=_h(reciter)).json()["flagged"] is True
    client.post(f"/api/market/steps/{sid}/confirm", headers=_h(reciter), json={"text": "Said Tehillim 1 b'kavana"})
    p = client.get("/api/market/me/payouts", headers=_h(reciter)).json()[0]
    assert p["requires_review"] is True
    # auto-release skips flagged payouts; admin must release once resolved
    assert p["id"] not in client.post("/api/market/admin/payouts/release-due", headers=_h(atok)).json()["released"]
    assert client.post(f"/api/market/admin/payouts/{p['id']}/release", headers=_h(atok)).json()["status"] == "released"
    client.put("/api/market/admin/config", headers=_h(atok), json={"escrow_days": 3})


# ---------------- Optional voice: recording + request ----------------
def test_optional_recording_and_request_and_decline():
    atok = _admin_tok()
    client.put("/api/market/admin/config", headers=_h(atok),
               json={"allow_reciter_recording": True, "allow_poster_request_recording": True})
    poster = _pro("recposter@example.com", "RecP")
    reciter = _pro("recreciter@example.com", "RecR")
    body = {"title": "T", "names": [{"name": "Ari"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 10000}  # large pledge
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    aid = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()["id"]
    # reciter optionally uploads a recording (shared)
    up = client.post(f"/api/market/assignments/{aid}/recording", headers=_h(reciter),
                     files={"file": ("r.webm", b"AUDIOBYTES", "audio/webm")}, data={"shared": "true"})
    assert up.status_code == 200, up.text
    # poster (large pledge) can fetch the shared recording
    g = client.get(f"/api/market/assignments/{aid}/recording", headers=_h(poster))
    assert g.status_code == 200 and g.content == b"AUDIOBYTES"
    # poster may request to hear it; the reciter is free to decline
    rq = client.post(f"/api/market/assignments/{aid}/recording-request", headers=_h(poster))
    assert rq.status_code == 200
    dec = client.post(f"/api/market/assignments/{aid}/recording-request/decline", headers=_h(reciter))
    assert dec.status_code == 200 and dec.json()["status"] == "declined"
    # recording is NEVER enabled implicitly: turning it off blocks upload
    client.put("/api/market/admin/config", headers=_h(atok), json={"allow_reciter_recording": False})
    off = client.post(f"/api/market/assignments/{aid}/recording", headers=_h(reciter),
                      files={"file": ("r.webm", b"x", "audio/webm")}, data={"shared": "true"})
    assert off.status_code == 403
    client.put("/api/market/admin/config", headers=_h(atok),
               json={"allow_reciter_recording": False, "allow_poster_request_recording": False})


# ---------------- Personal audio message (poster -> reciter) ----------------
def test_personal_message_delivered_with_sender():
    poster = _pro("msgposter@example.com", "Bracha")
    reciter = _pro("msgreciter@example.com", "MsgR")
    stranger = _pro("msgstranger@example.com", "Str")
    body = {"title": "T", "names": [{"name": "Eli"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 1000}
    rid = client.post("/api/market/requests", headers=_h(poster), json=body).json()["id"]
    aid = client.post(f"/api/market/requests/{rid}/accept", headers=_h(reciter), json={}).json()["id"]
    # personal messages are OFF by default and must be explicitly enabled
    atok = _admin_tok()
    assert client.post(f"/api/market/requests/{rid}/message", headers=_h(poster),
                       files={"file": ("m.webm", b"X", "audio/webm")}).status_code == 403
    client.put("/api/market/admin/config", headers=_h(atok), json={"allow_poster_message": True})
    up = client.post(f"/api/market/requests/{rid}/message", headers=_h(poster),
                     files={"file": ("m.webm", b"GETWELL", "audio/webm")})
    assert up.status_code == 200, up.text
    meta = client.get(f"/api/market/assignments/{aid}/message", headers=_h(reciter)).json()
    assert meta["has_message"] is True and meta["from"] == "Bracha"   # reciter sees who sent it
    audio = client.get(f"/api/market/requests/{rid}/message/audio", headers=_h(reciter))
    assert audio.status_code == 200 and audio.content == b"GETWELL"
    # an unrelated user cannot hear it
    assert client.get(f"/api/market/requests/{rid}/message/audio", headers=_h(stranger)).status_code == 403


# ---------------- Access corrections: open posting + personal zone ----------------
def test_posting_is_open_no_login_no_pro():
    # NO Authorization header, NO Pro: enter name -> choose prayer -> pay
    body = {"title": "Refuah", "names": [{"name": "Nechama", "mother": "Rivka"}],
            "scope_kind": "chapters", "scope_detail": {"chapters": [20, 121]},
            "reciter_mode": "group", "expected_reciters": 1, "assignment_mode": "free",
            "payout_split": "pool", "gross_cents": 500,
            "poster_contact": {"email": "guest@example.com", "name": "Guest"}}
    r = client.post("/api/market/requests", json=body)        # no headers at all
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["pledge_breakdown"]["distributable_cents"] > 0
    token = j["manage_token"]                                  # anonymous revisit token
    # the anonymous poster can revisit/track via the token, no account
    by = client.get(f"/api/market/requests/by-token/{token}").json()
    assert by["id"] == j["id"] and "fulfillment" in by
    # a free (non-Pro) logged-in user can also post
    free = _tok("freeposter@example.com", name="Free")
    r2 = client.post("/api/market/requests", headers=_h(free), json=body)
    assert r2.status_code == 200 and "manage_token" not in r2.json()  # attributed to the account


def test_personal_dashboard_aggregates_everything():
    me = _pro("zoneuser@example.com", "Zoe")
    helper = _pro("zonehelper@example.com", "Helper")
    # I post a job (logged in -> attributed to me)
    body = {"title": "For Zoe", "names": [{"name": "Zoe"}], "scope_kind": "chapters",
            "scope_detail": {"chapters": [1]}, "reciter_mode": "single", "expected_reciters": 1,
            "assignment_mode": "free", "payout_split": "pool", "gross_cents": 1000}
    rid = client.post("/api/market/requests", headers=_h(me), json=body).json()["id"]
    # helper takes it (someone davening FOR me)
    client.post(f"/api/market/requests/{rid}/accept", headers=_h(helper), json={})
    # I take on a job for someone else, and I share a commitment
    body2 = dict(body, title="For Amit", names=[{"name": "Amit"}])
    rid2 = client.post("/api/market/requests", headers=_h(helper), json=body2).json()["id"]
    client.post(f"/api/market/requests/{rid2}/accept", headers=_h(me), json={})
    client.put("/api/market/community/profile", headers=_h(me), json={"section": "women"})
    client.post("/api/market/community/commitments", headers=_h(me),
                json={"names": [{"name": "Sara"}], "visibility": "public"})

    d = client.get("/api/market/me/dashboard", headers=_h(me)).json()
    assert any(p["id"] == rid for p in d["posted"])                       # what I posted
    assert any(t["request_id"] == rid2 for t in d["taken"])              # jobs I took
    assert any(s["names"][0]["name"] == "Sara" for s in d["shared"])     # what I shared
    assert any(x["name"] == "Amit" for x in d["davening_for"])           # who I'm davening for
    assert any(x["who"] == "Helper" for x in d["praying_for_me"])        # who's davening for me
    assert len(d["pledges"]) >= 1                                         # payment history
