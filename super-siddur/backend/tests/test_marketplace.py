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

    # a non-Pro user cannot post a request
    r = client.post("/api/market/requests", headers=_h(poster),
                    json={"gross_cents": 1000, "names": [{"name": "Chaim"}]})
    assert r.status_code == 402  # Payment Required -> Pro upsell

    # become Pro (phase-1 simulated activation)
    s = client.post("/api/market/membership/subscribe", headers=_h(poster), json={"tier": "pro"})
    assert s.status_code == 200 and s.json()["membership"] == "pro"

    # post a request: pool split, free choice, 2 reciters, specific chapters
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
