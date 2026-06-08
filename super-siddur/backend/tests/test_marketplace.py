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

    # a reciter accepts a portion and marks it said
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
