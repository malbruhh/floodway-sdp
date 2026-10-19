import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import ai_check
from app.security import RateLimiter

IMG = "data:image/jpeg;base64," + "A" * 64
BODY = {"image_data_url": IMG, "description": "water on the road", "reported_depth_cm": 30}
URL = "/api/v1/ai/flood-image-check"


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.delenv("VISION_WRITE_TOKEN", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.setattr(ai_check, "_limiter", RateLimiter(limit=6, window_s=60))
    app = FastAPI()
    app.include_router(ai_check.router)
    return TestClient(app)


def test_without_a_key_it_says_it_did_not_run(client):
    r = client.post(URL, json=BODY).json()
    assert r["available"] is False
    assert r["looks_like_flooding"] is None and r["confidence"] is None and r["estimated_depth_cm"] is None
    assert "not configured" in r["notes"]
    assert "verified" not in r["notes"].lower().replace("not been", "")  # never claims verification


def test_a_failed_call_is_reported_not_faked(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "k")

    async def boom(*a, **k):
        raise RuntimeError("quota")

    monkeypatch.setattr(ai_check, "_call_openrouter", boom)
    r = client.post(URL, json=BODY).json()
    assert r["available"] is False and r["confidence"] is None
    assert "has not been checked by AI" in r["notes"]


def test_names_the_model_that_actually_ran(client, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "k")
    monkeypatch.setenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

    async def ok(key, model, body):
        return {"looks_like_flooding": True, "appears_authentic": True, "estimated_depth_cm": 28, "confidence": 0.7, "hazards": ["Submerged road"], "notes": "Road is covered by brown water."}

    monkeypatch.setattr(ai_check, "_call_openrouter", ok)
    r = client.post(URL, json=BODY).json()
    assert r["available"] is True and r["looks_like_flooding"] is True
    assert "google/gemini-2.5-flash" in r["engine"] and "not an official verification" in r["engine"]


def test_sloppy_model_output_is_normalised_not_trusted():
    out = ai_check.normalise({"looks_like_flooding": "yes", "estimated_depth_cm": "NaN", "confidence": 7, "hazards": "x", "notes": ""}, "m")
    assert out.looks_like_flooding is None          # not a real boolean
    assert out.estimated_depth_cm is None           # NaN rejected
    assert out.confidence == 1.0                    # clamped, not trusted
    assert out.hazards == []
    assert out.notes == "The model gave no notes."


@pytest.mark.parametrize("bad", [
    {**BODY, "image_data_url": "http://evil.example/x.jpg"},
    {**BODY, "image_data_url": "data:text/html;base64," + "A" * 64},
    {**BODY, "reported_depth_cm": -5},
    {**BODY, "description": "x" * 301},
])
def test_rejects_bad_input(client, bad):
    assert client.post(URL, json=bad).status_code == 422


def test_rate_limited(client):
    codes = [client.post(URL, json=BODY).status_code for _ in range(8)]
    assert codes[:6] == [200] * 6 and codes[6:] == [429, 429]


def test_token_guard(client, monkeypatch):
    monkeypatch.setenv("VISION_WRITE_TOKEN", "tok")
    assert client.post(URL, json=BODY).status_code == 401
    assert client.post(URL, json=BODY, headers={"Authorization": "Bearer tok"}).status_code == 200
