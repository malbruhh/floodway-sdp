import hashlib
import hmac
import time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import DEVICES
from app.routes import predict, shelters, telemetry

app = FastAPI()
for r in (predict.router, shelters.router, telemetry.router):
    app.include_router(r)
client = TestClient(app)


def _sig(dev_id: str, ts: int, dist: float) -> str:
    return hmac.new(DEVICES[dev_id]["secret"].encode(), f"{dev_id}.{ts}.{dist:.1f}".encode(), hashlib.sha256).hexdigest()


def test_ingest_requires_signature():
    body = {"device_id": "fw-node-01", "ts": int(time.time()), "distance_cm": 280}
    assert client.post("/api/v1/ingest", json=body).status_code == 401
    assert client.post("/api/v1/ingest", json={**body, "sig": "bad"}).status_code == 401
    ok = client.post("/api/v1/ingest", json={**body, "sig": _sig("fw-node-01", body["ts"], 280)})
    assert ok.status_code == 200


def test_predict_rejects_out_of_range():
    assert client.post("/api/v1/predict", json={"current_water_level_m": -1}).status_code == 422
    assert client.post("/api/v1/predict", json={"rainfall_rate_mm_hr": 9999}).status_code == 422
    assert client.post("/api/v1/predict", json={}).status_code == 200


def test_unknown_shelter_is_404():
    assert client.get("/api/v1/shelters/nope").status_code == 404


def _post(dev_id: str, dist: float, ts: int):
    return client.post("/api/v1/ingest", json={"device_id": dev_id, "ts": ts, "distance_cm": dist, "sig": _sig(dev_id, ts, dist)})


def test_thresholds_are_per_device():
    # fw-node-02 warns at 1.30 m, so 1.40 m is WARNING there (it would be WARNING-or-DANGER on node-01's 1.20/1.50).
    mount = DEVICES["fw-node-02"]["mount_height_cm"]
    now = int(time.time())
    for i in range(3):  # fill the median filter
        r = _post("fw-node-02", mount - 140, now + i)
    assert r.json()["phase"] == "WARNING"


def test_stale_timestamp_is_rejected():
    assert _post("fw-node-01", 280, int(time.time()) - 600).status_code == 400


def test_replayed_reading_is_rejected():
    ts = int(time.time()) + 50
    assert _post("fw-node-01", 280, ts).status_code == 200
    assert _post("fw-node-01", 280, ts).status_code == 409


def test_danger_steps_down_one_level_at_a_time():
    from app.services.phase_machine import PhaseMachine
    m = PhaseMachine(1.20, 1.50)
    assert m.update(1.6) == "DANGER"
    assert [m.update(0.3) for _ in range(3)] == ["DANGER", "DANGER", "WARNING"]
    assert [m.update(0.3) for _ in range(3)][-1] == "ADVISORY"
    assert [m.update(0.3) for _ in range(3)][-1] == "NORMAL"


def test_report_post_then_get_and_status_is_clamped(monkeypatch):
    from app.routes import reports
    monkeypatch.setattr(reports, "DEMO_REPORTS", list(reports.DEMO_REPORTS))
    app2 = FastAPI()
    app2.include_router(reports.router)
    c = TestClient(app2)
    body = {"title": "Drain overflow", "location": "Shah Alam", "lat": 3.1, "lon": 101.5, "water_depth_cm": 30}
    r = c.post("/api/v1/reports", json={**body, "status": "AI_VERIFIED", "description": "d"})
    assert r.status_code == 200 and r.json()["report"]["status"] == "AI_VERIFIED"
    assert c.get("/api/v1/reports").json()[0]["id"] == r.json()["report"]["id"]
    # the client can never claim an official verification
    assert c.post("/api/v1/reports", json={**body, "status": "OFFICIAL_VERIFIED"}).status_code == 422
    assert c.post("/api/v1/reports", json=body).json()["report"]["status"] == "UNDER_REVIEW"


def test_report_field_limits_and_write_token(monkeypatch):
    from app.routes import reports
    monkeypatch.setattr(reports, "DEMO_REPORTS", list(reports.DEMO_REPORTS))
    app2 = FastAPI()
    app2.include_router(reports.router)
    c = TestClient(app2)
    body = {"title": "x", "location": "y", "lat": 3.1, "lon": 101.5, "water_depth_cm": 30}
    assert c.post("/api/v1/reports", json={**body, "title": "x" * 121}).status_code == 422
    assert c.post("/api/v1/reports", json={**body, "lat": 91}).status_code == 422
    monkeypatch.setenv("VISION_WRITE_TOKEN", "secret")
    assert c.post("/api/v1/reports", json=body).status_code == 401
    assert c.post("/api/v1/reports", json=body, headers={"Authorization": "Bearer secret"}).status_code == 200
