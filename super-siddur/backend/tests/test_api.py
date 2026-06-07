"""End-to-end API tests. Uses a throwaway SQLite DB in a temp dir."""
import os
import tempfile

# Configure BEFORE importing the app (config/db read env at import time).
_TMP = tempfile.mkdtemp(prefix="siddur-test-")
os.environ["SIDDUR_DATA_DIR"] = _TMP
os.environ["SIDDUR_JWT_SECRET"] = "test-secret"
os.environ["SIDDUR_SUPERADMIN_PASSWORD"] = "supersecret1"
os.environ["SIDDUR_SUPERADMIN_EMAILS"] = "amir@graphicatz.com,shalomlebowitz@gmail.com"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402

seed()  # create tables + seed super admins/content (startup event only fires under `with`)
client = TestClient(app)


def _token(email="amir@graphicatz.com", pw="supersecret1"):
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def test_health_and_status():
    assert client.get("/healthz").json()["ok"] is True
    assert client.get("/api/admin/status").json()["enabled"] is True


def test_content_seeded_and_public():
    docs = client.get("/api/content").json()
    assert isinstance(docs, list) and len(docs) == 11


def test_superadmins_seeded_and_login():
    for email in ("amir@graphicatz.com", "shalomlebowitz@gmail.com"):
        tok = _token(email)
        me = client.get("/api/auth/me", headers=_auth(tok)).json()
        assert me["role"] == "superadmin"
        assert set(me["permissions"]) >= {"content.edit", "settings.edit", "icons.edit", "admins.manage"}


def test_login_rejects_bad_password():
    assert client.post("/api/auth/login", json={"email": "amir@graphicatz.com", "password": "nope"}).status_code == 401


def test_content_write_requires_auth():
    assert client.post("/api/content", json=[{"nusach": "x", "svcId": "y", "service": "Z", "sections": []}]).status_code == 401
    tok = _token()
    r = client.post("/api/content", json=[{"nusach": "x", "svcId": "y", "service": "Z", "sections": []}], headers=_auth(tok))
    assert r.status_code == 200 and r.json()["docs"] == 1
    assert len(client.get("/api/content").json()) == 1


def test_settings_branding_roundtrip():
    tok = _token()
    r = client.put("/api/settings/branding", json={"value": {"title1": "Beit Tefillah"}}, headers=_auth(tok))
    assert r.status_code == 200
    assert client.get("/api/settings").json()["branding"]["title1"] == "Beit Tefillah"


def test_icon_upload_and_serve():
    tok = _token()
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16"/></svg>'
    r = client.post("/api/icons", data={"key": "bow", "label": "Bow", "kind": "override", "svg": svg}, headers=_auth(tok))
    assert r.status_code == 200, r.text
    assert r.json()["url"] == "/api/icons/bow/raw"
    assert any(i["key"] == "bow" for i in client.get("/api/icons").json())
    raw = client.get("/api/icons/bow/raw")
    assert raw.status_code == 200 and "svg" in raw.headers["content-type"]


def test_icon_upload_png_bytes():
    tok = _token()
    png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f3f0000000049454e44ae426082")
    r = client.post("/api/icons", data={"key": "custom_dove", "label": "Dove"},
                    files={"file": ("dove.png", png, "image/png")}, headers=_auth(tok))
    assert r.status_code == 200, r.text
    assert client.get("/api/icons/custom_dove/raw").headers["content-type"] == "image/png"


def test_permissions_enforced_for_editor():
    su = _token()
    # create a limited editor (content only)
    r = client.post("/api/admins", json={"email": "editor@example.com", "name": "Ed",
                                         "password": "editorpass1", "role": "editor",
                                         "permissions": ["content.edit"]}, headers=_auth(su))
    assert r.status_code == 200, r.text
    ed = _token("editor@example.com", "editorpass1")
    # allowed: content
    assert client.post("/api/content", json=[], headers=_auth(ed)).status_code == 200
    # denied: icons + settings + admin management
    assert client.post("/api/icons", data={"key": "x", "svg": "<svg/>"}, headers=_auth(ed)).status_code == 403
    assert client.put("/api/settings/x", json={"value": {}}, headers=_auth(ed)).status_code == 403
    assert client.get("/api/admins", headers=_auth(ed)).status_code == 403


def test_cannot_delete_seeded_superadmin():
    su = _token()
    admins = client.get("/api/admins", headers=_auth(su)).json()
    amir = next(a for a in admins if a["email"] == "amir@graphicatz.com")
    assert client.delete(f"/api/admins/{amir['id']}", headers=_auth(su)).status_code == 400
