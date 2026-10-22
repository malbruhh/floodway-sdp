import asyncio

import pytest
from fastapi.testclient import TestClient

from app.vision.alerts import AlertDispatcher
from app.vision.analysis import get_analyzer
from app.vision.bootstrap import build_default_engine
from app.vision.config import VisionSettings
from app.vision.engine import VisionEngine
from app.vision.schemas import AlertEvent
from app.vision.seed import sample_calibration
from app.vision.standalone import create_app


class FakeChannel:
    name = "fake"

    def __init__(self):
        self.sent: list[AlertEvent] = []

    async def send(self, event):
        self.sent.append(event)


@pytest.fixture()
def settings(tmp_path):
    return VisionSettings(data_dir=tmp_path, seed_samples=True)


@pytest.fixture()
def client(settings, monkeypatch):
    # Disable the background loops: the tests drive analysis explicitly.
    async def no_loops(self, run_loops=True):
        self._loop = asyncio.get_running_loop()
        self._running = True

    monkeypatch.setattr(VisionEngine, "start", no_loops)
    engine = build_default_engine(settings)
    with TestClient(create_app(engine)) as c:
        c.engine = engine
        yield c


def test_lists_seeded_cameras(client):
    cams = client.get("/api/v1/vision/cameras").json()
    ids = {c["id"] for c in cams}
    assert {"sample-klang-jamek", "sample-backyard-stream"} <= ids
    sample = next(c for c in cams if c["id"] == "sample-klang-jamek")
    assert sample["is_playback"] is True and sample["source_type"] == "synthetic"


def test_analyze_returns_reading_and_frame(client):
    r = client.post("/api/v1/vision/cameras/sample-klang-jamek/analyze")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["frames_analyzed"] >= 1 and 0 <= body["confidence"] <= 1
    assert body["level"] in {"NORMAL", "ADVISORY", "WARNING", "DANGER"}
    assert body["model"] == "reference-diff-v1"  # sample cameras are read against their own dry frame
    frame = client.get("/api/v1/vision/cameras/sample-klang-jamek/frame.jpg")
    assert frame.status_code == 200 and frame.headers["content-type"] == "image/jpeg"
    assert frame.content[:2] == b"\xff\xd8"
    assert client.get("/api/v1/vision/cameras/sample-klang-jamek/readings").json()[-1]["timestamp"] == body["timestamp"]


def test_unknown_camera_is_404(client):
    assert client.post("/api/v1/vision/cameras/nope/analyze").status_code == 404
    assert client.get("/api/v1/vision/cameras/nope/readings").status_code == 404


def test_offline_camera_fails_and_goes_offline_after_three(client):
    for _ in range(3):
        assert client.post("/api/v1/vision/cameras/sample-backyard-stream/analyze").status_code == 502
    cam = next(c for c in client.get("/api/v1/vision/cameras").json() if c["id"] == "sample-backyard-stream")
    assert cam["online"] is False


def _draft(url):
    cal = sample_calibration().model_dump(mode="json")
    return {"name": "Test drain", "lat": 3.15, "lon": 101.7, "source_type": "snapshot", "source_url": url, "calibration": cal}


@pytest.mark.parametrize("url", ["http://127.0.0.1/x.jpg", "http://169.254.169.254/latest", "file:///etc/passwd"])
def test_create_camera_blocks_ssrf(client, url):
    assert client.post("/api/v1/vision/cameras", json=_draft(url)).status_code == 422


def test_preview_blocks_ssrf(client):
    r = client.post("/api/v1/vision/cameras/preview", json={"source_type": "snapshot", "source_url": "http://10.0.0.1/a.jpg"})
    assert r.status_code == 422


def test_user_cameras_can_be_disabled(tmp_path):
    engine = build_default_engine(VisionSettings(data_dir=tmp_path, allow_user_cameras=False))
    with TestClient(create_app(engine)) as c:
        assert c.post("/api/v1/vision/cameras", json=_draft("https://93.184.216.34/a.jpg")).status_code == 403


def test_seeded_cameras_cannot_be_deleted(client):
    assert client.delete("/api/v1/vision/cameras/sample-klang-jamek").status_code == 403


def test_invalid_calibration_is_422(client):
    bad = _draft("https://93.184.216.34/a.jpg")
    bad["calibration"]["lines"] = {"normal": 0.4, "warning": 0.6, "danger": 0.8}
    assert client.post("/api/v1/vision/cameras", json=bad).status_code == 422


def test_websocket_streams_snapshot_then_reading(client):
    with client.websocket_connect("/api/v1/vision/ws") as ws:
        first = ws.receive_json()
        assert first["type"] == "snapshot" and len(first["cameras"]) >= 5
        client.post("/api/v1/vision/cameras/sample-klang-jamek/analyze")
        msg = ws.receive_json()
        assert msg["type"] == "reading" and msg["reading"]["camera_id"] == "sample-klang-jamek"


def test_escalation_creates_alert_and_dispatches(settings, monkeypatch):
    """Drive a camera into DANGER and check the alert is stored, published and dispatched once."""
    from app.vision.sources.synthetic import SyntheticRiverSource

    channel = FakeChannel()
    engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([channel], cooldown_s=300))
    engine.register_synthetic("flood", "Flood test", "mine", 3.1, 101.7, sample_calibration(),
                              SyntheticRiverSource(1.05, 1.05, 100, seed=3), 8)

    async def run():
        await engine.start(run_loops=False)
        r1 = await engine.analyze_once_async("flood")
        r2 = await engine.analyze_once_async("flood")
        await engine.stop()
        return r1, r2

    r1, r2 = asyncio.run(run())
    assert r1.level.value == "DANGER"  # confident danger escalates immediately
    assert len(engine.alerts) == 1 and engine.alerts[0].level.value == "DANGER"
    assert len(channel.sent) == 1  # second reading does not re-alert (cooldown / no change)
    assert r2.action == "show_on_map"


def test_dispatcher_cooldown_and_escalation_rules():
    d = AlertDispatcher([], cooldown_s=300)
    ev = lambda lvl: AlertEvent(id="1", camera_id="c", camera_name="C", level=lvl, water_ratio=0.8, timestamp="t", message="m")
    from app.vision.schemas import Level

    assert d.should_send(ev(Level.WARNING), now=1000)
    d._last["c"] = (Level.WARNING, 1000)
    assert not d.should_send(ev(Level.WARNING), now=1100)      # inside cooldown
    assert d.should_send(ev(Level.DANGER), now=1100)           # escalation bypasses cooldown
    assert d.should_send(ev(Level.WARNING), now=1400)          # cooldown elapsed


def test_added_camera_starts_its_capture_loop_and_can_be_removed(client):
    """Regression: the sync create route runs in a worker thread, where asyncio.create_task fails. The camera was
    saved but answered 500 and never got analysed."""
    import time

    r = client.post("/api/v1/vision/cameras", json=_draft("https://93.184.216.34/a.jpg"))
    assert r.status_code == 201, r.text
    rec = client.engine.cameras[r.json()["id"]]
    deadline = time.time() + 2
    while rec.task is None and time.time() < deadline:
        time.sleep(0.02)
    assert rec.task is not None, "capture loop was never started"

    assert client.delete(f"/api/v1/vision/cameras/{rec.id}").status_code == 204
    deadline = time.time() + 2
    while not rec.task.done() and time.time() < deadline:
        time.sleep(0.02)
    assert rec.task.done(), "capture loop kept running after removal"


def test_user_cameras_survive_a_cold_restart(settings, monkeypatch):
    """A restart must not lose cameras people added, or their calibration (P5-06)."""

    async def no_loops(self, run_loops=True):
        self._loop = asyncio.get_running_loop()
        self._running = True
        self._load_user_cameras()  # the real start() does this before spawning loops

    monkeypatch.setattr(VisionEngine, "start", no_loops)
    draft = _draft("https://93.184.216.34/a.jpg")
    with TestClient(create_app(build_default_engine(settings))) as first:
        created = first.post("/api/v1/vision/cameras", json=draft)
        assert created.status_code == 201, created.text
        cam_id = created.json()["id"]

    # A brand new engine on the same data directory, as after a process restart.
    with TestClient(create_app(build_default_engine(settings))) as second:
        cams = {c["id"]: c for c in second.get("/api/v1/vision/cameras").json()}
        assert cam_id in cams, "the user camera was lost on restart"
        assert cams[cam_id]["calibration"]["lines"] == draft["calibration"]["lines"]
        assert cams[cam_id]["provider"] == "mine"
        assert {"sample-klang-jamek", "sample-backyard-stream"} <= set(cams), "sample cameras should be seeded on a cold start"


# ---- P5-03: write protection ----------------------------------------------------------------------------------

def test_writes_are_open_in_development_but_log_a_warning(client, monkeypatch):
    monkeypatch.delenv("VISION_WRITE_TOKEN", raising=False)
    assert client.post("/api/v1/vision/cameras", json=_draft("https://93.184.216.34/a.jpg")).status_code == 201


def test_writes_require_the_token_once_one_is_set(client, monkeypatch):
    monkeypatch.setenv("VISION_WRITE_TOKEN", "operator-secret")
    url, good = "/api/v1/vision/cameras", {"Authorization": "Bearer operator-secret"}
    draft = _draft("https://93.184.216.34/a.jpg")

    for call in (
        lambda h: client.post(url, json=draft, headers=h),
        lambda h: client.post(url + "/preview", json={"source_type": "snapshot", "source_url": "https://93.184.216.34/a.jpg"}, headers=h),
        lambda h: client.post(url + "/test", json=draft, headers=h),
        lambda h: client.post(url + "/sample-klang-jamek/analyze", headers=h),
        lambda h: client.delete(url + "/sample-klang-jamek", headers=h),
    ):
        assert call({}).status_code == 401
        assert call({"Authorization": "Bearer wrong"}).status_code == 401
        assert call({"Authorization": "Basic operator-secret"}).status_code == 401
        assert call(good).status_code != 401  # authorised: may still fail for other reasons (403 sample, 502 source...)


def test_reads_and_the_socket_stay_open_when_a_token_is_set(client, monkeypatch):
    monkeypatch.setenv("VISION_WRITE_TOKEN", "operator-secret")
    assert client.get("/api/v1/vision/cameras").status_code == 200
    assert client.get("/api/v1/vision/alerts").status_code == 200
    with client.websocket_connect("/api/v1/vision/ws") as ws:
        assert ws.receive_json()["type"] == "snapshot"


def test_all_clear_is_sent_once_when_a_camera_drops_below_warning(settings):
    from app.vision.sources.synthetic import SyntheticRiverSource

    channel = FakeChannel()
    engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([channel], cooldown_s=300))
    rec = engine.register_synthetic("c", "Clear test", "mine", 3.1, 101.7, sample_calibration(),
                                    SyntheticRiverSource(1.05, 1.05, 100, seed=3), 8)

    async def run():
        await engine.start(run_loops=False)
        await engine.analyze_once_async("c")  # DANGER
        rec.source = SyntheticRiverSource(0.1, 0.1, 100, seed=3)  # river falls
        for _ in range(6):  # DANGER -> WARNING after 3, WARNING -> ADVISORY after 3 more
            await engine.analyze_once_async("c")
        await engine.stop()

    asyncio.run(run())
    kinds = [a.kind for a in engine.alerts]
    assert kinds == ["all_clear", "alert"]
    assert [e.kind for e in channel.sent] == ["alert", "all_clear"]


def test_all_clear_ignores_cooldown_and_resets_it():
    from app.vision.schemas import Level

    d = AlertDispatcher([], cooldown_s=300)
    ev = lambda lvl, kind="alert": AlertEvent(id="1", camera_id="c", camera_name="C", level=lvl, water_ratio=0.5,
                                              timestamp="t", message="m", kind=kind)
    d._last["c"] = (Level.WARNING, 1000)
    assert d.should_send(ev(Level.ADVISORY, "all_clear"), now=1010)     # inside cooldown, still sent
    asyncio.run(d.dispatch(ev(Level.ADVISORY, "all_clear")))
    assert "c" not in d._last
    assert d.should_send(ev(Level.WARNING), now=1020)                    # the next WARNING is new
