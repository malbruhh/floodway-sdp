"""Live rain and warnings: scaled and filtered honestly, cached, and never break the forecast when upstream is down."""
from datetime import datetime

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import twin
from app.services import weather_client as wc


@pytest.fixture(autouse=True)
def _fresh(monkeypatch):
    monkeypatch.setattr(wc, "_rain", {})
    monkeypatch.setattr(wc, "_warnings", {"at": 0.0, "items": []})


def _client(monkeypatch, rain=None, warnings=None, boom=False):
    calls = []

    async def get_json(url, params):
        calls.append(url)
        if boom:
            raise httpx.ConnectError("down")
        return {"current": {"time": "2026-10-23T01:45", "interval": 900, "precipitation": rain}} if url == wc.RAIN_URL else warnings

    monkeypatch.setattr(wc, "_get_json", get_json)
    app = FastAPI()
    app.include_router(twin.router)
    return TestClient(app), calls


def test_rate_scales_the_interval_to_mm_per_hour():
    assert wc.rate_mm_hr({"precipitation": 2.5, "interval": 900}) == 10.0
    assert wc.rate_mm_hr({"precipitation": -1, "interval": 900}) == 0.0
    assert wc.rate_mm_hr({}) is None


def test_only_current_land_rain_warnings_for_selangor_or_kl_are_kept():
    now = datetime(2026, 10, 23, 12, 0)
    base = {"valid_from": "2026-10-23T00:00:00", "valid_to": "2026-10-24T00:00:00", "text_en": "Heavy rain over Selangor and Kuala Lumpur"}
    recs = [
        {**base, "warning_issue": {"title_en": "Thunderstorm Warning", "issued": "x"}},
        {**base, "warning_issue": {"title_en": "Strong Winds and Rough Seas Warning"}},
        {**base, "text_en": "Heavy rain over Kelantan", "warning_issue": {"title_en": "Heavy Rain Warning"}},
        {**base, "valid_to": "2026-10-23T06:00:00", "warning_issue": {"title_en": "Heavy Rain Warning"}},
    ]
    assert [w["title"] for w in wc.relevant_warnings(recs, now)] == ["Thunderstorm Warning"]


def test_default_forecast_ignores_live_data_and_makes_no_call(monkeypatch):
    c, calls = _client(monkeypatch, rain=9.0)
    body = c.get("/api/v1/twin/state").json()
    assert body["rainfall_rate_mm_hr"] == 95.0 and body["weather"]["rain_source"] == "Simulated demo rate" and calls == []


def test_live_rain_feeds_the_forecast_and_is_cached(monkeypatch):
    c, calls = _client(monkeypatch, rain=2.5, warnings=[])
    for _ in range(2):
        body = c.get("/api/v1/twin/state?live_rain=true").json()
    assert body["rainfall_rate_mm_hr"] == 10.0 and body["weather"]["rain_source"] == wc.RAIN_SOURCE
    assert calls.count(wc.RAIN_URL) == 1 and "not a trained" in body["forecast"]["source"].lower()


def test_upstream_down_falls_back_to_the_simulated_rate_and_says_so(monkeypatch):
    c, _ = _client(monkeypatch, boom=True)
    r = c.get("/api/v1/twin/state?live_rain=true")
    assert r.status_code == 200
    body = r.json()
    assert body["rainfall_rate_mm_hr"] == 95.0 and "unavailable" in body["weather"]["rain_source"]


def _points_client(monkeypatch, calls):
    async def get_json(url, params):
        calls.append(params)
        n = len(params["latitude"].split(","))
        row = {"current": {"time": "t", "interval": 900, "precipitation": 1.0, "temperature_2m": 27.5}}
        return [row] * n if n > 1 else row

    monkeypatch.setattr(wc, "_get_json", get_json)
    from app.routes import weather
    app = FastAPI()
    app.include_router(weather.router)
    return TestClient(app)


def test_many_points_use_one_upstream_call_and_are_cached(monkeypatch):
    calls = []
    c = _points_client(monkeypatch, calls)
    q = "lat=3.1&lon=101.6&lat=3.0&lon=101.5&lat=3.1&lon=101.6"
    for _ in range(2):
        body = c.get(f"/api/v1/weather/points?{q}").json()
    assert set(body["points"]) == {"3.1,101.6", "3.0,101.5"} and body["points"]["3.1,101.6"]["rate_mm_hr"] == 4.0
    assert len(calls) == 1 and body["points"]["3.0,101.5"]["temp_c"] == 27.5


def test_bad_points_are_rejected(monkeypatch):
    c = _points_client(monkeypatch, [])
    assert c.get("/api/v1/weather/points?lat=3&lat=4&lon=101").status_code == 422
    assert c.get("/api/v1/weather/points?lat=99&lon=101").status_code == 422


def test_upstream_down_gives_null_points_not_an_error(monkeypatch):
    _client(monkeypatch, boom=True)
    c = _points_client(monkeypatch, [])

    async def boom(url, params):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(wc, "_get_json", boom)
    assert c.get("/api/v1/weather/points?lat=3.1&lon=101.6").json()["points"] == {"3.1,101.6": None}


def _detail_client(monkeypatch, boom=False, warnings=None):
    async def get_json(url, params):
        if boom:
            raise httpx.ConnectError("down")
        if url == wc.WARNING_URL:
            return warnings or []
        return {"current": {"time": "t", "interval": 900, "precipitation": 0.5, "temperature_2m": 28, "relative_humidity_2m": 80, "wind_speed_10m": 5, "wind_gusts_10m": 9, "weather_code": 63},
                "hourly": {"time": ["a", "b"], "precipitation": [0.1, 2.0], "precipitation_probability": [30, 80]}}

    monkeypatch.setattr(wc, "_get_json", get_json)
    monkeypatch.setattr(wc, "_detail", {})
    from app.routes import weather
    app = FastAPI()
    app.include_router(weather.router)
    return TestClient(app)


def test_detail_has_now_next_hours_and_works_outside_selangor(monkeypatch):
    c = _detail_client(monkeypatch)
    far = c.get("/api/v1/weather/detail?lat=35.68&lon=139.69").json()  # Tokyo: a camera outside Malaysia
    assert far["sky"] == "Rain" and far["rate_mm_hr"] == 2.0 and far["next_hours"][1] == {"time": "b", "mm": 2.0, "chance_pct": 80}
    assert far["warnings"] == [] and far["warnings_covered"] is False  # we only claim MetMalaysia coverage for Selangor / KL


def test_detail_checks_warnings_inside_selangor(monkeypatch):
    now = wc.datetime.now(wc.MYT).replace(tzinfo=None)
    rec = {"valid_from": (now - wc.timedelta(hours=1)).isoformat(), "valid_to": (now + wc.timedelta(hours=1)).isoformat(),
           "text_en": "Heavy rain over Selangor", "warning_issue": {"title_en": "Heavy Rain Warning"}}
    c = _detail_client(monkeypatch, warnings=[rec])
    body = c.get("/api/v1/weather/detail?lat=3.1&lon=101.6").json()
    assert body["warnings_covered"] is True and [w["title"] for w in body["warnings"]] == ["Heavy Rain Warning"]


def test_detail_502_when_down_and_validates_range(monkeypatch):
    c = _detail_client(monkeypatch, boom=True)
    assert c.get("/api/v1/weather/detail?lat=3.1&lon=101.6").status_code == 502
    assert c.get("/api/v1/weather/detail?lat=99&lon=101.6").status_code == 422
