"""JPS Selangor camera proxy: maps records honestly, drops unusable ones, and never fetches a caller's URL."""
import time
from datetime import datetime

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import jps
from app.services import jps_client

NOW_MYT = datetime.fromtimestamp(time.time(), jps_client.MYT).strftime("%Y-%m-%dT%H:%M:%S")


def _raw(cam_id, **over):
    base = {"id": cam_id, "cameraName": f"Cam {cam_id}", "districtName": "KLANG", "isEnabled": True, "isOnline": True,
            "lastUpdate": NOW_MYT, "latitude": "3.05", "longitude": "101.45", "mainRiverBasin": "Sg. Klang",
            "imageUrl": f"http://{jps_client.HOST}/InfoBanjir.WebAdmin/CCTV_Image/{cam_id}.jpg"}
    return {**base, **over}


@pytest.fixture(autouse=True)
def _fresh(monkeypatch):
    monkeypatch.setattr(jps_client, "_cache", {"at": 0.0, "cameras": [], "image_urls": {}})
    monkeypatch.setattr(jps_client, "_images", {})


def _client(monkeypatch, records, image=(200, b"\xff\xd8jpeg", "image/jpeg")):
    async def district(client, d):
        return records if d == 1 else []

    async def fetch_image(url):
        return image

    monkeypatch.setattr(jps_client, "_fetch_district", district)
    monkeypatch.setattr(jps_client, "_fetch_image", fetch_image)
    app = FastAPI()
    app.include_router(jps.router)
    return TestClient(app)


def test_drops_disabled_and_zero_position_cameras(monkeypatch):
    c = _client(monkeypatch, [_raw(1), _raw(2, isEnabled=False), _raw(3, latitude="0", longitude="0"), _raw(4, imageUrl="")])
    body = c.get("/api/v1/jps/cameras").json()
    assert [x["id"] for x in body["cameras"]] == [1]
    assert body["source"].startswith("JPS Selangor") and body["stale"] is False


def test_every_camera_is_image_only_with_a_status_and_age(monkeypatch):
    old = "2020-01-01T00:00:00"
    c = _client(monkeypatch, [_raw(1), _raw(2, lastUpdate=old), _raw(3, isOnline=False)])
    cams = {x["id"]: x for x in c.get("/api/v1/jps/cameras").json()["cameras"]}
    assert cams[1]["status"] == "online" and cams[1]["age_s"] < 60
    assert cams[2]["status"] == "stale"
    assert cams[3]["status"] == "offline"
    assert all(x["reading"] == "image_only" for x in cams.values())  # no AI level is claimed for real photos


def test_serves_cached_copy_marked_stale_when_jps_is_down(monkeypatch):
    c = _client(monkeypatch, [_raw(1)])
    assert c.get("/api/v1/jps/cameras").json()["stale"] is False
    jps_client._cache["at"] = 0.0  # expire the cache

    async def boom(client, d):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(jps_client, "_fetch_district", boom)
    body = c.get("/api/v1/jps/cameras").json()
    assert body["stale"] is True and body["count"] == 1


def test_502_when_jps_is_down_and_nothing_is_cached(monkeypatch):
    async def boom(client, d):
        raise httpx.ConnectError("down")

    c = _client(monkeypatch, [])
    monkeypatch.setattr(jps_client, "_fetch_district", boom)
    assert c.get("/api/v1/jps/cameras").status_code == 502


def test_image_proxy_returns_the_jpeg_and_404s_unknown_ids(monkeypatch):
    c = _client(monkeypatch, [_raw(1)])
    ok = c.get("/api/v1/jps/cameras/1/image")
    assert ok.status_code == 200 and ok.headers["content-type"] == "image/jpeg" and ok.content.startswith(b"\xff\xd8")
    assert c.get("/api/v1/jps/cameras/999/image").status_code == 404


def test_image_proxy_refuses_a_listed_url_on_another_host(monkeypatch):
    c = _client(monkeypatch, [_raw(1, imageUrl="http://169.254.169.254/latest/meta-data")])
    assert c.get("/api/v1/jps/cameras/1/image").status_code == 404


def test_non_image_upstream_response_is_a_502(monkeypatch):
    c = _client(monkeypatch, [_raw(1)], image=(200, b"<html>", "text/html"))
    assert c.get("/api/v1/jps/cameras/1/image").status_code == 502
