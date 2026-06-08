"""Server-rendered siddur — route + slug tests (Flask test client)."""
from web.app import INDEX, app
from web.slugs import slugify

client = app.test_client()


def test_slugify_hebrew_to_ascii():
    s = slugify("מוֹדֶה אֲנִי")
    assert s and all(c.isalnum() or c == "-" for c in s)
    assert slugify("Torah Reading") == "torah-reading"


def test_home_lists_nusachot():
    r = client.get("/")
    assert r.status_code == 200
    assert b"Ashkenaz" in r.data or b"Sefard" in r.data


def test_nusach_service_prayer_slug_routes():
    nus = "ashkenaz" if "ashkenaz" in INDEX else next(iter(INDEX))
    assert client.get(f"/siddur/{nus}").status_code == 200
    svc_slug = next(iter(INDEX[nus]))
    assert client.get(f"/siddur/{nus}/{svc_slug}").status_code == 200
    sec = INDEX[nus][svc_slug]["sections"][0]
    r = client.get(f"/siddur/{nus}/{svc_slug}/{sec['slug']}")
    assert r.status_code == 200
    assert sec["header"].encode("utf-8") in r.data          # the Hebrew renders
    assert b"prayer-page" in r.data


def test_unknown_slugs_404():
    nus = next(iter(INDEX))
    svc = next(iter(INDEX[nus]))
    assert client.get("/siddur/nope-nusach").status_code == 404
    assert client.get(f"/siddur/{nus}/nope-service").status_code == 404
    assert client.get(f"/siddur/{nus}/{svc}/nope-prayer").status_code == 404
