"""Smoke tests that don't require a database connection."""

from fastapi.testclient import TestClient

from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_openapi_served():
    assert client.get("/api/openapi.json").status_code == 200


def test_security_headers_present():
    resp = client.get("/health")
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"


def test_password_round_trip():
    hashed = hash_password("a-strong-password")
    assert verify_password("a-strong-password", hashed)
    assert not verify_password("wrong", hashed)


def test_jwt_round_trip():
    token = create_access_token("42", role="customer")
    claims = decode_token(token)
    assert claims["sub"] == "42"
    assert claims["type"] == "access"
    assert claims["role"] == "customer"


def test_admin_pages_redirect_anonymous_to_login():
    # Anonymous users must never see the admin chrome.
    for path in ("/admin", "/admin/products", "/admin/orders", "/admin/customers"):
        resp = client.get(path, follow_redirects=False)
        assert resp.status_code == 302
        assert resp.headers["location"] == "/login"


def test_admin_api_requires_auth():
    # The admin JSON API the pages call is itself gated.
    assert client.get("/api/admin/products").status_code == 401


def test_cart_page_requires_login():
    resp = client.get("/cart", follow_redirects=False)
    assert resp.status_code == 302
    assert resp.headers["location"] == "/login"


def test_customers_globe_page_is_public():
    # The "our customers" showcase renders for anonymous visitors.
    resp = client.get("/customers")
    assert resp.status_code == 200
    assert "globe-canvas" in resp.text


def test_checkout_result_pages_render():
    assert client.get("/checkout/success?order=ORD-1").status_code == 200
    assert client.get("/checkout/cancel?order=ORD-1").status_code == 200
