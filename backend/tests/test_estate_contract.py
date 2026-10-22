"""Estate page contract: the data the page reads from the backend, and the township file shared with the frontend."""
import asyncio
import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import reports
from app.security import RateLimiter
from app.vision import routes as vision_routes
from app.vision.alerts import AlertDispatcher
from app.vision.analysis import get_analyzer
from app.vision.config import VisionSettings
from app.vision.seed import seed_samples
from app.vision.engine import VisionEngine

TOWNSHIPS_JSON = Path(__file__).resolve().parents[2] / "frontend" / "src" / "data" / "townships.json"
REPORT_STATUSES = {"OFFICIAL_VERIFIED", "AI_VERIFIED", "VERIFIED", "UNDER_REVIEW", "REJECTED"}


def townships() -> dict[str, dict]:
    return {t["id"]: t for t in json.loads(TOWNSHIPS_JSON.read_text(encoding="utf-8"))}


def inside(bbox, lat, lon) -> bool:  # bbox order is [south, west, north, east]
    return bbox[0] <= lat <= bbox[2] and bbox[1] <= lon <= bbox[3]


@pytest.fixture()
def report_client(monkeypatch):
    monkeypatch.delenv("VISION_WRITE_TOKEN", raising=False)
    monkeypatch.setattr(reports, "DEMO_REPORTS", list(reports.DEMO_REPORTS))
    monkeypatch.setattr(reports, "_limiter", RateLimiter(1000, 60))
    app = FastAPI()
    app.include_router(reports.router)
    return TestClient(app)


@pytest.fixture()
def seeded(tmp_path, monkeypatch):
    """A running app with the five sample cameras and the vision router."""
    monkeypatch.delenv("VISION_WRITE_TOKEN", raising=False)
    settings = VisionSettings(data_dir=tmp_path, seed_samples=True)
    engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([], cooldown_s=300))
    asyncio.run(engine.start(run_loops=False))
    seed_samples(engine)
    app = FastAPI()
    app.include_router(vision_routes.router)
    app.state.vision_engine = engine
    return TestClient(app), engine


# ───────────── reports ─────────────
def test_reports_list_has_the_fields_the_page_reads(report_client):
    items = report_client.get("/api/v1/reports").json()
    assert items
    for r in items:
        assert {"id", "title", "location", "lat", "lon", "water_depth_cm", "status", "author"} <= set(r)
        assert isinstance(r["lat"], (int, float)) and isinstance(r["lon"], (int, float))
        assert r["status"] in REPORT_STATUSES


def test_a_new_report_lands_in_the_kampung_baru_township_as_under_review(report_client):
    body = {"title": "Drain overflow", "location": "Kampung Baru", "lat": 3.165, "lon": 101.705, "water_depth_cm": 40}
    posted = report_client.post("/api/v1/reports", json=body)
    assert posted.status_code == 200
    got = next(r for r in report_client.get("/api/v1/reports").json() if r["id"] == posted.json()["report"]["id"])
    assert got["status"] == "UNDER_REVIEW"
    assert inside(townships()["kampung-baru"]["bbox"], got["lat"], got["lon"])


# ───────────── cameras ─────────────
def test_sample_cameras_sit_inside_the_kl_wide_township(seeded):
    client, _ = seeded
    cams = client.get("/api/v1/vision/cameras").json()
    assert len(cams) >= 5
    bbox = townships()["kl-all"]["bbox"]
    for c in cams:
        assert inside(bbox, c["lat"], c["lon"]), c["id"]


def test_every_sub_township_with_a_camera_is_reachable_from_the_sample_set(seeded):
    """The Estate page shows an empty state for a township with no camera; make sure the others are not all empty."""
    client, _ = seeded
    cams = client.get("/api/v1/vision/cameras").json()
    with_cameras = [tid for tid, t in townships().items() if tid != "kl-all" and any(inside(t["bbox"], c["lat"], c["lon"]) for c in cams)]
    assert "kampung-baru" in with_cameras


# ───────────── the shared township file ─────────────
def test_township_file_is_well_formed():
    raw = json.loads(TOWNSHIPS_JSON.read_text(encoding="utf-8"))
    ids = [t["id"] for t in raw]
    assert len(ids) == len(set(ids)) and "kl-all" in ids
    for t in raw:
        south, west, north, east = t["bbox"]
        assert all(isinstance(v, (int, float)) for v in t["bbox"]), t["id"]
        assert south < north and west < east, t["id"]
        assert inside(t["bbox"], *t["center"]), t["id"]
        assert isinstance(t["zoom"], int) and 1 <= t["zoom"] <= 19, t["id"]
        assert t["name"].strip(), t["id"]
    kl = townships()["kl-all"]["bbox"]
    for t in raw:  # every township sits inside the KL-wide one, so "all" really means all
        assert kl[0] <= t["bbox"][0] and t["bbox"][2] <= kl[2] and kl[1] <= t["bbox"][1] and t["bbox"][3] <= kl[3], t["id"]
