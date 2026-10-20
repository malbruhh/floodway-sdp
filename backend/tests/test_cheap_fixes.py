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
