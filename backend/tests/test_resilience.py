"""Resilience dashboard: event log, episode/lead-time maths, dispatcher outcomes, API and CSV."""
import asyncio
import csv
import io
import json
import threading
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import resilience
from app.security import RateLimiter
from app.vision import alerts as alerts_mod
from app.vision.alerts import AlertDispatcher, TelegramChannel
from app.vision.analysis import get_analyzer
from app.vision.config import VisionSettings
from app.vision.engine import VisionEngine
from app.vision.events import MAX_EVENTS, EventLog, build_episodes, now_iso, summarise
from app.vision.schemas import AlertEvent, Level
from app.vision.seed import sample_calibration
from app.vision.sources.synthetic import SyntheticRiverSource

UTC = timezone.utc
T0 = datetime(2026, 10, 21, 10, 0, 0, tzinfo=UTC)


def t(seconds: float) -> str:
    return (T0 + timedelta(seconds=seconds)).isoformat()


def lc(cam, to, s, sim=True):
    return {"kind": "level_change", "ts": t(s), "camera_id": cam, "camera_name": cam.upper(), "to": to, "simulated": sim}


def al(cam, level, s, alert_kind="alert", outcomes=None, suppressed=False, sim=True, name=None):
    return {"kind": "alert", "ts": t(s), "camera_id": cam, "camera_name": name or cam.upper(), "level": level,
            "alert_kind": alert_kind, "outcomes": outcomes if outcomes is not None else {"log": "sent"},
            "suppressed": suppressed, "simulated": sim}


def ac(cam, s):
    return al(cam, "ADVISORY", s, alert_kind="all_clear")


# ───────────── EventLog ─────────────
def test_log_round_trips_and_survives_a_restart(tmp_path):
    path = tmp_path / "events.jsonl"
    first = EventLog()
    first.open(path)
    first.append(lc("a", "ADVISORY", 0))
    first.append(al("a", "WARNING", 10))
    second = EventLog()
    second.open(path)
    assert [e["kind"] for e in second.events()] == ["level_change", "alert"]


def test_log_skips_corrupt_lines_and_cleans_the_file(tmp_path):
    path = tmp_path / "events.jsonl"
    good = json.dumps(lc("a", "ADVISORY", 0))
    path.write_text(f"{good}\nnot json\n{{\"no_kind\": 1}}\n[1,2]\n{good[:20]}\n", encoding="utf-8")
    log = EventLog()
    log.open(path)
    assert len(log.events()) == 1
    assert len(path.read_text(encoding="utf-8").splitlines()) == 1  # corrupt lines dropped from the file too


def test_log_keeps_only_the_last_max_events(tmp_path):
    path = tmp_path / "events.jsonl"
    path.write_text("".join(json.dumps(lc("a", "ADVISORY", i)) + "\n" for i in range(MAX_EVENTS + 25)), encoding="utf-8")
    log = EventLog()
    log.open(path)
    events = log.events()
    assert len(events) == MAX_EVENTS and events[-1]["ts"] == t(MAX_EVENTS + 24)
    assert len(path.read_text(encoding="utf-8").splitlines()) == MAX_EVENTS


def test_log_appends_from_many_threads_without_losing_or_tearing_lines(tmp_path):
    path = tmp_path / "events.jsonl"
    log = EventLog()
    log.open(path)

    def work(n):
        for i in range(50):
            log.append(lc(f"cam{n}", "ADVISORY", i))

    threads = [threading.Thread(target=work, args=(n,)) for n in range(8)]
    [th.start() for th in threads]
    [th.join() for th in threads]
    lines = path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 400 and all(json.loads(line)["kind"] == "level_change" for line in lines)
    assert len(log.events()) == 400


def test_an_unwritable_path_never_raises_and_memory_still_works(tmp_path):
    blocker = tmp_path / "file"
    blocker.write_text("x")
    log = EventLog()
    log.open(blocker / "events.jsonl")  # a directory cannot be created under a file
    log.append(lc("a", "ADVISORY", 0))
    assert len(log.events()) == 1


def test_a_log_that_was_never_opened_stays_in_memory(tmp_path):
    log = EventLog()
    log.append(lc("a", "ADVISORY", 0))
    assert len(log.events()) == 1 and list(tmp_path.iterdir()) == []


# ───────────── episodes and lead time ─────────────
def test_full_episode_has_an_exact_lead_time():
    [ep] = build_episodes([lc("a", "ADVISORY", 0), al("a", "WARNING", 600), al("a", "DANGER", 900), ac("a", 3000)])
    assert (ep["early_signal_at"], ep["warning_at"], ep["danger_at"], ep["ended_at"]) == (t(0), t(600), t(900), t(3000))
    assert ep["lead_time_s"] == 900


def test_episode_that_never_reaches_danger_has_no_lead_time():
    [ep] = build_episodes([lc("a", "ADVISORY", 0), al("a", "WARNING", 600), ac("a", 900)])
    assert ep["lead_time_s"] is None and ep["danger_at"] is None


def test_direct_jump_to_danger_is_none_not_zero():
    [ep] = build_episodes([al("a", "DANGER", 0), ac("a", 100)])
    assert ep["lead_time_s"] is None and ep["danger_at"] == t(0)


def test_open_episode_is_ongoing():
    [ep] = build_episodes([lc("a", "ADVISORY", 0), al("a", "WARNING", 60)])
    assert ep["ended_at"] is None


def test_two_episodes_on_one_camera_do_not_share_an_early_signal():
    events = [
        lc("a", "ADVISORY", 0), al("a", "WARNING", 100), al("a", "DANGER", 200),
        lc("a", "WARNING", 250), lc("a", "ADVISORY", 300), ac("a", 300),  # de-escalation inside the episode is ignored
        lc("a", "NORMAL", 400),
        al("a", "WARNING", 2000), al("a", "DANGER", 2600), ac("a", 3000),  # second episode: no ADVISORY signal of its own
    ]
    newest, oldest = build_episodes(events)
    assert oldest["lead_time_s"] == 200 and oldest["early_signal_at"] == t(0)
    assert newest["early_signal_at"] == t(2000) and newest["lead_time_s"] == 600  # falls back to its own first alert


def test_fresh_advisory_before_the_second_episode_is_used():
    events = [
        al("a", "WARNING", 0), ac("a", 100), lc("a", "NORMAL", 150),
        lc("a", "ADVISORY", 1000), al("a", "WARNING", 1100), al("a", "DANGER", 1500), ac("a", 2000),
    ]
    newest, _ = build_episodes(events)
    assert newest["early_signal_at"] == t(1000) and newest["lead_time_s"] == 500


def test_a_signal_that_faded_to_normal_is_forgotten():
    [ep] = build_episodes([lc("a", "ADVISORY", 0), lc("a", "NORMAL", 50), al("a", "WARNING", 5000), al("a", "DANGER", 5100)])
    assert ep["early_signal_at"] == t(5000) and ep["lead_time_s"] == 100


def test_cameras_are_tracked_independently():
    events = [lc("a", "ADVISORY", 0), lc("b", "ADVISORY", 10), al("b", "WARNING", 20), al("a", "WARNING", 30),
              al("a", "DANGER", 400), ac("b", 500)]
    by_cam = {ep["camera_id"]: ep for ep in build_episodes(events)}
    assert by_cam["a"]["lead_time_s"] == 400 and by_cam["a"]["ended_at"] is None
    assert by_cam["b"]["lead_time_s"] is None and by_cam["b"]["ended_at"] == t(500)


def test_mixed_utc_offsets_compare_as_instants():
    events = [
        {**lc("a", "ADVISORY", 0), "ts": "2026-10-21T18:00:00+08:00"},   # 10:00 UTC
        {**al("a", "WARNING", 0), "ts": "2026-10-21T10:05:00+00:00"},
        {**al("a", "DANGER", 0), "ts": "2026-10-21T10:15:00Z"},
    ]
    assert build_episodes(events)[0]["lead_time_s"] == 900


def test_duplicates_out_of_order_and_stray_records_are_harmless():
    events = [ac("a", 50), al("a", "DANGER", 20), al("a", "DANGER", 25), al("a", "WARNING", 10), lc("a", "ADVISORY", 0),
              {"kind": "route", "ts": t(5)}, {"kind": "alert", "ts": t(6), "camera_id": 7}, {"kind": "alert", "ts": t(7), "camera_id": "a", "level": "ADVISORY"}]
    [ep] = build_episodes(events)
    assert ep["danger_at"] == t(20) and ep["lead_time_s"] == 20 and ep["ended_at"] == t(50)


def restart(s):
    return {"kind": "engine_start", "ts": t(s)}


def test_a_restart_closes_open_episodes_as_interrupted_and_forgets_early_signals():
    events = [
        lc("a", "ADVISORY", 0), al("a", "WARNING", 100), al("a", "DANGER", 200),   # open when the server restarts
        lc("b", "ADVISORY", 150),                                                  # a signal that dies with the restart
        restart(300),
        al("b", "WARNING", 400), al("b", "DANGER", 500),
    ]
    by_cam = {ep["camera_id"]: ep for ep in build_episodes(events)}
    assert by_cam["a"]["interrupted"] is True and by_cam["a"]["ended_at"] is None and by_cam["a"]["lead_time_s"] == 200
    assert by_cam["b"]["early_signal_at"] == t(400) and by_cam["b"]["lead_time_s"] == 100  # not 350 s across the downtime
    assert by_cam["b"]["interrupted"] is False


def test_an_alert_after_a_restart_starts_a_new_episode_instead_of_joining_the_old_one():
    events = [al("a", "WARNING", 0), restart(50), al("a", "DANGER", 60)]
    newer, older = build_episodes(events)
    assert older["interrupted"] and older["danger_at"] is None
    assert newer["started_at"] == t(60) and newer["danger_at"] == t(60)


def test_interrupted_episodes_are_not_counted_as_ongoing_and_markers_do_not_make_events_live():
    events = [al("a", "WARNING", 0), restart(50), al("b", "WARNING", 60)]
    s = summarise(events, 24, T0 + timedelta(hours=1))
    assert s["episodes_caught"] == 2 and s["episodes_ongoing"] == 1
    assert s["all_simulated"] is True  # engine_start carries no simulated flag and must not flip it


def test_all_clear_without_a_start_is_ignored():
    assert build_episodes([ac("a", 5)]) == []


def test_episode_is_simulated_only_through_its_own_records():
    [ep] = build_episodes([al("a", "WARNING", 0, sim=False)])
    assert ep["simulated"] is False


# ───────────── summary ─────────────
def test_summary_window_filters_episodes_by_start():
    now = T0 + timedelta(hours=40)
    events = [al("a", "WARNING", 0), ac("a", 60), al("b", "WARNING", 39 * 3600)]
    assert summarise(events, 24, now)["episodes_caught"] == 1
    assert summarise(events, 48, now)["episodes_caught"] == 2
    assert summarise(events, 24, now)["episodes_ongoing"] == 1


def test_summary_lead_statistics():
    events = []
    for cam, lead in (("a", 600), ("b", 1200), ("c", 1800)):
        events += [lc(cam, "ADVISORY", 0), al(cam, "WARNING", 10), al(cam, "DANGER", lead)]
    events += [al("d", "WARNING", 0)]  # reaches no DANGER
    s = summarise(events, 24, T0 + timedelta(hours=1))
    assert s["lead"] == {"count": 3, "none_count": 1, "median_s": 1200, "min_s": 600, "max_s": 1800}


def test_summary_alert_counts_separate_sent_failed_suppressed_and_log_only():
    events = [
        al("a", "WARNING", 0, outcomes={"log": "sent", "telegram": "sent"}),
        al("a", "DANGER", 10, outcomes={"log": "sent", "telegram": "failed"}),
        al("a", "WARNING", 20, outcomes={"log": "sent"}),            # no external channel configured
        al("a", "WARNING", 30, outcomes={}, suppressed=True),
        ac("a", 40),
    ]
    a = summarise(events, 24, T0 + timedelta(hours=1))["alerts"]
    assert a == {"raised": 4, "all_clear": 1, "sent_external": 1, "failed": 1, "suppressed": 1}


def test_summary_of_nothing_is_zeros_not_an_error():
    s = summarise([], 24, T0)
    assert s["episodes_caught"] == 0 and s["log_since"] is None and s["alerts"]["raised"] == 0
    assert s["lead"]["median_s"] is None and s["routes"] == {"started": 0, "arrived": 0}


def test_all_simulated_turns_false_when_any_live_event_exists():
    now = T0 + timedelta(hours=1)
    assert summarise([al("a", "WARNING", 0)], 24, now)["all_simulated"] is True
    assert summarise([al("a", "WARNING", 0), al("b", "WARNING", 5, sim=False)], 24, now)["all_simulated"] is False


# ───────────── dispatcher outcomes ─────────────
def _event(level=Level.WARNING, kind="alert", cam="c"):
    return AlertEvent(id="1", camera_id=cam, camera_name="C", level=level, water_ratio=0.5, timestamp=now_iso(), message="m", kind=kind)


class _Ok:
    name = "ok"

    async def send(self, event):
        pass


class _Boom:
    name = "boom"

    async def send(self, event):
        raise RuntimeError("down")


def test_dispatcher_records_sent_failed_and_suppressed():
    log = EventLog()
    d = AlertDispatcher([_Ok(), _Boom()], cooldown_s=300)
    d.events = log
    assert asyncio.run(d.dispatch(_event(), simulated=True)) is True
    assert asyncio.run(d.dispatch(_event())) is False  # same level inside the cooldown
    first, second = log.events()
    assert first["outcomes"] == {"ok": "sent", "boom": "failed"} and first["suppressed"] is False and first["simulated"] is True
    assert second["suppressed"] is True and second["outcomes"] == {}


def test_dispatcher_without_a_log_still_works():
    d = AlertDispatcher([_Ok()], cooldown_s=300)
    assert asyncio.run(d.dispatch(_event())) is True


@pytest.mark.parametrize("status,expected", [(200, "sent"), (400, "failed"), (500, "failed")])
def test_telegram_rejection_counts_as_failed(monkeypatch, status, expected):
    real = httpx.AsyncClient
    monkeypatch.setattr(alerts_mod.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(lambda req: httpx.Response(status, json={})), **kw))
    log = EventLog()
    d = AlertDispatcher([TelegramChannel("tok", "chat")], cooldown_s=300)
    d.events = log
    asyncio.run(d.dispatch(_event()))
    assert log.events()[0]["outcomes"] == {"telegram": expected}


# ───────────── engine integration ─────────────
def test_engine_logs_a_scripted_episode_and_it_survives_a_restart(tmp_path):
    settings = VisionSettings(data_dir=tmp_path)
    engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([_Ok()], cooldown_s=300))
    rec = engine.register_synthetic("c", "Scripted", "mine", 3.1, 101.7, sample_calibration(),
                                    SyntheticRiverSource(1.05, 1.05, 100, seed=3), 8)

    async def run():
        await engine.start(run_loops=False)
        await engine.analyze_once_async("c")  # DANGER
        rec.source = SyntheticRiverSource(0.1, 0.1, 100, seed=3)
        for _ in range(6):
            await engine.analyze_once_async("c")
        await engine.stop()

    asyncio.run(run())
    start, *events = engine.events.events()
    assert start["kind"] == "engine_start"
    assert [e["kind"] for e in events] == ["level_change", "alert", "level_change", "level_change", "alert"]
    assert events[1]["alert_kind"] == "alert" and events[-1]["alert_kind"] == "all_clear"
    assert all(e["simulated"] == rec.source.is_playback for e in events)
    assert events[1]["outcomes"] == {"ok": "sent"}

    reloaded = EventLog()
    reloaded.open(settings.events_file)
    assert len(reloaded.events()) == 6
    [ep] = build_episodes(reloaded.events())
    assert ep["ended_at"] is not None and ep["lead_time_s"] is None  # direct jump to DANGER


def test_each_engine_start_leaves_a_marker(tmp_path):
    settings = VisionSettings(data_dir=tmp_path)
    for _ in range(2):
        engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([], cooldown_s=300))
        asyncio.run(engine.start(run_loops=False))
    assert [e["kind"] for e in engine.events.events()] == ["engine_start", "engine_start"]


# ───────────── API ─────────────
def _make_app(tmp_path, with_engine=True):
    settings = VisionSettings(data_dir=tmp_path, seed_samples=False)
    engine = VisionEngine(settings, get_analyzer(settings), AlertDispatcher([_Ok()], cooldown_s=300))
    app = FastAPI()
    app.include_router(resilience.router)
    if with_engine:
        app.state.vision_engine = engine
    return app, engine


@pytest.fixture()
def api(tmp_path, monkeypatch):
    monkeypatch.delenv("VISION_WRITE_TOKEN", raising=False)
    monkeypatch.setattr(resilience, "_limiter", RateLimiter(1000, 60))
    app, engine = _make_app(tmp_path)
    return TestClient(app), engine


def _ago(seconds):
    return (datetime.now(UTC).astimezone() - timedelta(seconds=seconds)).isoformat(timespec="seconds")


def test_summary_endpoint_shape_and_empty_state(api):
    client, _ = api
    body = client.get("/api/v1/resilience/summary").json()
    assert body["episodes_caught"] == 0 and body["window_h"] == 24
    assert set(body) >= {"episodes", "lead", "alerts", "routes", "all_simulated", "log_since", "generated_at"}


@pytest.mark.parametrize("bad", ["0", "721", "-1", "abc", "1.5"])
def test_summary_rejects_a_bad_window(api, bad):
    assert api[0].get(f"/api/v1/resilience/summary?window_h={bad}").status_code == 422


def test_endpoints_return_503_without_an_engine(tmp_path):
    app, _ = _make_app(tmp_path, with_engine=False)
    c = TestClient(app)
    assert c.get("/api/v1/resilience/summary").status_code == 503
    assert c.get("/api/v1/resilience/export.csv").status_code == 503


def test_summary_reflects_logged_events(api):
    client, engine = api
    engine.events.append({**al("a", "WARNING", 0), "ts": _ago(300)})
    engine.events.append({**al("a", "DANGER", 0), "ts": _ago(100)})
    body = client.get("/api/v1/resilience/summary").json()
    assert body["episodes_caught"] == 1 and body["alerts"]["raised"] == 2


ROUTE = {"kind": "start", "shelter_id": "", "client_id": "client-1"}


def _shelter_id():
    from app.services.shelters_data import SHELTERS_DATA
    return SHELTERS_DATA[0]["id"]


def test_route_event_is_recorded_once_per_client_and_shelter(api):
    client, engine = api
    body = {**ROUTE, "shelter_id": _shelter_id()}
    assert client.post("/api/v1/resilience/route-events", json=body).json() == {"recorded": True, "duplicate": False}
    assert client.post("/api/v1/resilience/route-events", json=body).json() == {"recorded": False, "duplicate": True}
    other_client = {**body, "client_id": "client-2"}
    assert client.post("/api/v1/resilience/route-events", json=other_client).json()["recorded"] is True
    arrived = {**body, "kind": "arrived"}
    assert client.post("/api/v1/resilience/route-events", json=arrived).json()["recorded"] is True
    assert client.get("/api/v1/resilience/summary").json()["routes"] == {"started": 2, "arrived": 1}
    assert all(e["simulated"] is True for e in engine.events.events())


def test_route_event_dedupe_expires_after_ten_minutes(api):
    client, engine = api
    sid = _shelter_id()
    engine.events.append({"kind": "route", "ts": _ago(601), "route_kind": "start", "shelter_id": sid, "client_id": "client-1", "simulated": True})
    assert client.post("/api/v1/resilience/route-events", json={**ROUTE, "shelter_id": sid}).json()["recorded"] is True
    engine.events.append({"kind": "route", "ts": _ago(30), "route_kind": "arrived", "shelter_id": sid, "client_id": "c9", "simulated": True})
    assert engine.events.has_recent_route("arrived", "c9", sid, 600) is True
    assert engine.events.has_recent_route("arrived", "c9", sid, 600, now=datetime.now(UTC) + timedelta(hours=1)) is False


@pytest.mark.parametrize("patch,status", [
    ({"shelter_id": "no-such-shelter"}, 404),
    ({"kind": "teleport"}, 422),
    ({"client_id": "x" * 65}, 422),
    ({"client_id": ""}, 422),
    ({"shelter_id": ""}, 422),
])
def test_route_event_validation(api, patch, status):
    body = {**ROUTE, "shelter_id": _shelter_id(), **patch}
    assert api[0].post("/api/v1/resilience/route-events", json=body).status_code == status


def test_route_event_requires_the_write_token_once_one_is_set(api, monkeypatch):
    client, _ = api
    monkeypatch.setenv("VISION_WRITE_TOKEN", "operator-secret")
    body = {**ROUTE, "shelter_id": _shelter_id()}
    url = "/api/v1/resilience/route-events"
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, json=body, headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert client.post(url, json=body, headers={"Authorization": "Bearer operator-secret"}).status_code == 200
    assert client.get("/api/v1/resilience/summary").status_code == 200  # reads stay open


def test_route_events_are_rate_limited(api, monkeypatch):
    client, _ = api
    monkeypatch.setattr(resilience, "_limiter", RateLimiter(2, 60))
    body = {**ROUTE, "shelter_id": _shelter_id()}
    codes = [client.post("/api/v1/resilience/route-events", json={**body, "client_id": f"c{i}"}).status_code for i in range(3)]
    assert codes == [200, 200, 429]


# ───────────── CSV ─────────────
def _csv(client, query=""):
    r = client.get(f"/api/v1/resilience/export.csv{query}")
    return r, list(csv.reader(io.StringIO(r.text)))


@pytest.mark.parametrize("kind", ["episodes", "alerts", "routes"])
def test_csv_empty_is_header_only_with_download_headers(api, kind):
    r, rows = _csv(api[0], f"?kind={kind}")
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/csv")
    assert r.headers["content-disposition"] == f'attachment; filename="floodway-{kind}.csv"'
    assert rows == [resilience.CSV_COLUMNS[kind]]


def test_csv_rejects_an_unknown_kind_and_window(api):
    assert api[0].get("/api/v1/resilience/export.csv?kind=secrets").status_code == 422
    assert api[0].get("/api/v1/resilience/export.csv?window_h=0").status_code == 422


def test_csv_neutralises_formulas_and_keeps_commas_quotes_and_newlines(api):
    client, engine = api
    evil = '=HYPERLINK("http://evil","click"),\nsecond line'
    engine.events.append({**al("a", "WARNING", 0, name=evil), "ts": _ago(60)})
    _, rows = _csv(client, "?kind=alerts")
    assert rows[1][2] == "'" + evil  # formula prefix defused, content otherwise intact
    assert rows[1][3] == "WARNING" and rows[1][8] == "True"
    _, ep_rows = _csv(client, "?kind=episodes")
    assert ep_rows[1][1].startswith("'=")
    for ch in "+-@":
        assert resilience._cell(f"{ch}1+1").startswith("'")
    assert resilience._cell(None) == "" and resilience._cell(900) == "900" and resilience._cell("Klang") == "Klang"


def test_csv_alert_rows_list_channels_that_sent_and_failed(api):
    client, engine = api
    engine.events.append({**al("a", "DANGER", 0, outcomes={"log": "sent", "telegram": "failed", "sms": "sent"}), "ts": _ago(60)})
    _, rows = _csv(client, "?kind=alerts")
    assert rows[1][6] == "sms" and rows[1][7] == "telegram"


def test_csv_respects_the_window(api):
    client, engine = api
    engine.events.append({**al("a", "WARNING", 0), "ts": _ago(3 * 3600)})
    engine.events.append({**al("b", "WARNING", 0), "ts": _ago(60)})
    assert len(_csv(client, "?kind=alerts&window_h=1")[1]) == 2
    assert len(_csv(client, "?kind=alerts&window_h=24")[1]) == 3
