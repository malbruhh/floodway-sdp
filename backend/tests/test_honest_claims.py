"""The API must not claim verification, certification or models it does not have."""
import re

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import reports, twin
from app.services.forecaster import forecaster

BANNED = re.compile(r"NADMA|\bJPS\b|certified", re.I)


def _client():
    app = FastAPI()
    app.include_router(reports.router)
    app.include_router(twin.router)
    return TestClient(app)


def test_demo_reports_are_labelled_as_demo_data():
    for r in _client().get("/api/v1/reports").json():
        assert not BANNED.search(r["verified_by"]), r["verified_by"]
        assert "demo" in r["verified_by"].lower()


def test_a_submitted_report_is_never_auto_verified(monkeypatch):
    monkeypatch.setattr(reports, "DEMO_REPORTS", list(reports.DEMO_REPORTS))
    body = {"title": "Water", "location": "Here", "lat": 3.1, "lon": 101.7, "water_depth_cm": 80, "author": "me"}
    saved = _client().post("/api/v1/reports", json=body).json()["report"]
    assert saved["status"] == "UNDER_REVIEW"  # used to be VERIFIED for any depth over 10 cm
    assert not BANNED.search(saved["verified_by"]), saved["verified_by"]


def test_the_forecast_says_it_is_a_formula_not_a_model():
    import asyncio

    out = asyncio.run(forecaster.predict_horizon(1.2, 60.0))
    assert not BANNED.search(out["source"]), out["source"]
    assert "not a trained model" in out["source"].lower()
    assert "not a trained or validated model" in out["method"].lower()


def test_twin_disclaimer_claims_no_certification():
    state = _client().get("/api/v1/twin/state").json()
    text = state["disclaimer"]
    assert not re.search(r"NADMA|\bJPS\b", text, re.I), text
    assert not re.search(r"(?<!not )certified", text, re.I), text  # "not certified" is fine; "Certified by ..." is not
    assert "not certified" in text.lower()
