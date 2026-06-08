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


# ---- ported views: Tehillim / Zmanim / Kotel ----
def test_tehillim_index_and_chapter():
    assert client.get("/tehillim").status_code == 200
    r = client.get("/tehillim/23")          # an embedded psalm
    assert r.status_code == 200
    assert b"prayer-page" in r.data and "אֲדֹנָי".encode("utf-8") in r.data or b"Psalm 23" in r.data
    assert client.get("/tehillim/0").status_code == 404
    assert client.get("/tehillim/151").status_code == 404


def test_zmanim_computes_times():
    from web.astro import zmanim, hm_fmt
    import datetime as dt
    z = zmanim(31.7683, 35.2137, "Asia/Jerusalem", dt.date(2026, 6, 8))
    assert z and z["netz"] < z["chatzot"] < z["shkia"]          # sunrise < midday < sunset
    r = client.get("/zmanim?name=Jerusalem&lat=31.7683&lng=35.2137&tz=Asia/Jerusalem&date=2026-06-08")
    assert r.status_code == 200 and b"Sunrise" in r.data


def test_kotel_bearing():
    from web.astro import bearing_to_kotel
    # from New York the Kotel is roughly east-north-east
    b = bearing_to_kotel(40.7128, -74.0060)
    assert 40 < b < 100
    # from due west of Jerusalem bearing tends eastward
    assert client.get("/kotel?name=New+York&lat=40.7128&lng=-74.0060").status_code == 200


def test_halachic_shaah_and_dakah_zmanit():
    import datetime as dt
    from web.astro import zmanim, halachic_state
    z = zmanim(31.7683, 35.2137, "Asia/Jerusalem", dt.date(2026, 6, 8))
    # midday: 6 sha'ot into the day
    midday = (z["netz"] + z["shkia"]) / 2
    h = halachic_state(z, midday)
    assert h is not None
    # da'kah zmanit is exactly sha'ah zmanit / 60 (day and night)
    assert abs(h["dakah_day_min"] - h["shaah_day_min"] / 60) < 1e-9
    assert abs(h["dakah_night_min"] - h["shaah_night_min"] / 60) < 1e-9
    # at midday we're in the day, 6 sha'ot elapsed → hour 7 of 12
    assert h["period"] == "day" and h["hour_num"] == 7
    assert 1 <= h["hour_num"] <= 12 and 0 <= h["minutes_into"] < 60
    # the page renders the clock with the sha'ah/da'kah readout + minute hand
    r = client.get("/zmanim?name=Jerusalem&lat=31.7683&lng=35.2137&tz=Asia/Jerusalem")
    assert r.status_code == 200
    body = r.get_data(as_text=True)
    assert "da'kah zmanit" in body and "sha'ah zmanit" in body and 'id="mhand"' in body
