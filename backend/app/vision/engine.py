"""The heart of Live Vision. One asyncio loop per camera:

    sleep(interval) -> grab a burst of frames -> analyse each -> median -> level (with hysteresis)
    -> store reading -> publish to WebSocket subscribers -> alert on escalation

Blocking work (HTTP/OpenCV/NumPy) runs in worker threads so the API stays responsive."""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import cv2
import numpy as np

from .alerts import AlertDispatcher
from .analysis import WaterAnalyzer
from .analysis.temporal import aggregate
from .config import VisionSettings
from .events import EventLog
from .levels import LevelTracker, compute_trend, lines_crossed, rank, ratio_to_level, thresholds_from_calibration
from .schemas import (
    AlertEvent,
    CameraCreate,
    CameraPublic,
    Calibration,
    Level,
    Reading,
    SourceDraft,
)
from .sources import FrameSource, SourceError, build_source
from .sources.still import UPLOAD_PREFIX, upload_id_from_url
from .sources.synthetic import SyntheticRiverSource
from .url_guard import UnsafeURL, validate_source_url

log = logging.getLogger("floodway.vision.engine")

HISTORY_LIMIT = 200
ALERT_LIMIT = 100
OFFLINE_AFTER_FAILURES = 3


def _now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


JPEG_MAGIC = bytes([0xFF, 0xD8, 0xFF])
PNG_MAGIC = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
UPLOAD_MAX_SIDE = 1920
UPLOAD_KEEP_S = 24 * 3600


def _jpeg(frame: np.ndarray) -> bytes:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        raise SourceError("could not encode frame")
    return buf.tobytes()


@dataclass
class CameraRecord:
    id: str
    name: str
    provider: str
    lat: float
    lon: float
    source_type: str
    source: FrameSource
    calibration: Calibration
    interval_s: int
    feed_refresh_s: int = 0
    seeded: bool = False
    source_url: Optional[str] = None
    online: bool = True
    failures: int = 0
    last_frame_at: Optional[str] = None
    last_frame_hash: Optional[str] = None
    last_jpeg: Optional[bytes] = None
    tracker: LevelTracker = field(default_factory=LevelTracker)
    readings: deque = field(default_factory=lambda: deque(maxlen=HISTORY_LIMIT))
    lock: threading.Lock = field(default_factory=threading.Lock)
    task: Optional[asyncio.Task] = None
    analyzer: Optional[WaterAnalyzer] = None  # overrides the engine's analyser for this camera (sample cameras)


class VisionEngine:
    def __init__(self, settings: VisionSettings, analyzer: WaterAnalyzer, dispatcher: AlertDispatcher):
        self.settings = settings
        self.analyzer = analyzer
        self.dispatcher = dispatcher
        self.cameras: dict[str, CameraRecord] = {}
        self.alerts: deque[AlertEvent] = deque(maxlen=ALERT_LIMIT)
        self.events = EventLog()  # durable history for the Resilience dashboard; persisted once start() opens it
        if dispatcher.events is None:
            dispatcher.events = self.events
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._running = False

    # ───────────── lifecycle ─────────────
    async def start(self, run_loops: bool = True) -> None:
        self._loop = asyncio.get_running_loop()
        self._running = True
        self.events.open(self.settings.events_file)
        self.events.append({"kind": "engine_start", "ts": _now_iso()})
        self._load_user_cameras()
        if run_loops:
            for rec in self.cameras.values():
                self._spawn(rec)

    async def stop(self) -> None:
        self._running = False
        for rec in self.cameras.values():
            if rec.task:
                rec.task.cancel()
        await asyncio.gather(*[r.task for r in self.cameras.values() if r.task], return_exceptions=True)

    def _on_loop(self, fn, *args) -> None:
        """Run `fn` on the engine's event loop. Sync routes (add/remove camera) run in a worker thread, where
        asyncio.create_task / Task.cancel are not allowed; hop onto the loop in that case."""
        try:
            running = asyncio.get_running_loop()
        except RuntimeError:
            running = None
        if running is self._loop:
            fn(*args)
        elif self._loop and self._loop.is_running():
            self._loop.call_soon_threadsafe(fn, *args)

    def _spawn(self, rec: CameraRecord) -> None:
        self._on_loop(self._spawn_now, rec)

    def _spawn_now(self, rec: CameraRecord) -> None:
        if rec.id in self.cameras and (rec.task is None or rec.task.done()):
            rec.task = asyncio.create_task(self._camera_loop(rec.id))

    # ───────────── registry ─────────────
    def register_synthetic(self, camera_id: str, name: str, provider: str, lat: float, lon: float,
                           calibration: Calibration, source: FrameSource, interval_s: int,
                           analyzer: Optional[WaterAnalyzer] = None) -> CameraRecord:
        rec = CameraRecord(id=camera_id, name=name, provider=provider, lat=lat, lon=lon, source_type="synthetic",
                           source=source, calibration=calibration, interval_s=interval_s, seeded=True, analyzer=analyzer)
        self.cameras[camera_id] = rec
        return rec

    def register_offline_placeholder(self, camera_id: str, name: str, lat: float, lon: float,
                                     calibration: Calibration, url: str, interval_s: int) -> CameraRecord:
        """A seeded camera whose URL will not resolve, so the 'offline' state is real, not faked."""
        src = build_source("snapshot", url, None, None, self.settings)
        rec = CameraRecord(id=camera_id, name=name, provider="mine", lat=lat, lon=lon, source_type="snapshot",
                           source=src, calibration=calibration, interval_s=interval_s, seeded=True, source_url=url)
        self.cameras[camera_id] = rec
        return rec

    def add_camera(self, draft: CameraCreate) -> CameraPublic:
        if not self.settings.allow_user_cameras:
            raise PermissionError("adding cameras is disabled on this server")
        self._check_source(draft)
        source = build_source(draft.source_type, draft.source_url, draft.username, draft.password, self.settings)
        cam_id = f"cam-{uuid.uuid4().hex[:8]}"
        rec = CameraRecord(id=cam_id, name=draft.name, provider=draft.provider, lat=draft.lat, lon=draft.lon,
                           source_type=draft.source_type, source=source, calibration=draft.calibration,
                           interval_s=draft.interval_s, feed_refresh_s=draft.feed_refresh_s, source_url=draft.source_url)
        self.cameras[cam_id] = rec
        self._persist()
        if self._running and self._loop:
            self._spawn(rec)
        pub = self.public(rec)
        self._publish_threadsafe({"type": "camera", "camera": pub.model_dump(mode="json")})
        return pub

    def remove_camera(self, camera_id: str) -> None:
        rec = self.cameras.get(camera_id)
        if rec is None:
            raise KeyError(camera_id)
        if rec.seeded:
            raise PermissionError("sample cameras cannot be removed")
        if rec.task:
            self._on_loop(rec.task.cancel)
        if rec.source_type == "upload":
            (self.settings.uploads_dir / f"{upload_id_from_url(rec.source_url)}.jpg").unlink(missing_ok=True)
        del self.cameras[camera_id]
        self._persist()
        self._publish_threadsafe({"type": "camera_removed", "camera_id": camera_id})

    def public(self, rec: CameraRecord) -> CameraPublic:
        return CameraPublic(
            id=rec.id, name=rec.name, provider=rec.provider, lat=rec.lat, lon=rec.lon,
            source_type=rec.source_type, is_playback=rec.source.is_playback, online=rec.online,
            interval_s=rec.interval_s, feed_refresh_s=rec.feed_refresh_s, last_frame_at=rec.last_frame_at,
            calibration=rec.calibration, reading=rec.readings[-1] if rec.readings else None,
        )

    def list_public(self) -> list[CameraPublic]:
        return [self.public(r) for r in self.cameras.values()]

    def get(self, camera_id: str) -> CameraRecord:
        try:
            return self.cameras[camera_id]
        except KeyError as exc:
            raise KeyError(camera_id) from exc

    def readings(self, camera_id: str, limit: int) -> list[Reading]:
        return list(self.get(camera_id).readings)[-limit:]

    def latest_jpeg(self, camera_id: str) -> Optional[bytes]:
        return self.get(camera_id).last_jpeg

    # ───────────── analysis ─────────────
    def _analyse_frames(self, frames: list[np.ndarray], cal: Calibration, analyzer: Optional[WaterAnalyzer] = None):
        analyzer = analyzer or self.analyzer
        return aggregate([analyzer.analyze(f, cal) for f in frames])

    def analyze_once(self, camera_id: str) -> tuple[Reading, Optional[AlertEvent]]:
        """Blocking: one full capture -> analyse -> level cycle for a saved camera."""
        rec = self.get(camera_id)
        with rec.lock:
            started = time.perf_counter()
            try:
                frames = rec.source.grab_frames(self.settings.burst_frames, self.settings.burst_gap_s)
            except SourceError:
                rec.failures += 1
                if rec.failures >= OFFLINE_AFTER_FAILURES:
                    rec.online = False
                raise
            rec.failures = 0
            rec.online = True

            jpeg = _jpeg(frames[-1])
            digest = hashlib.md5(jpeg).hexdigest()
            if digest != rec.last_frame_hash:  # only count genuinely new frames (slow snapshot feeds repeat)
                rec.last_frame_hash = digest
                rec.last_frame_at = _now_iso()
            rec.last_jpeg = jpeg

            window = self._analyse_frames(frames, rec.calibration, rec.analyzer)
            if window.ratio is None:
                raise SourceError("analysis produced no result")

            thr = thresholds_from_calibration(rec.calibration)
            observed = ratio_to_level(window.ratio, thr)
            previous = rec.tracker.current
            level, changed = rec.tracker.update(observed, window.confidence)
            history = [r.water_ratio for r in rec.readings] + [window.ratio]
            elapsed = time.perf_counter() - started

            reading = Reading(
                camera_id=rec.id, timestamp=_now_iso(),
                window_seconds=round(elapsed, 1), frames_analyzed=window.frames_used,
                water_ratio=round(window.ratio, 3),
                waterline_y=round(window.waterline_y, 4) if window.waterline_y is not None else None,
                level=level, observed_level=observed, confidence=window.confidence,
                low_confidence=window.confidence < 0.6,
                lines_crossed=lines_crossed(window.ratio, thr),
                trend=compute_trend(history),  # type: ignore[arg-type]
                model=(rec.analyzer or self.analyzer).name, latency_ms=int(elapsed * 1000),
                action="show_on_map" if rank(level) >= rank(Level.ADVISORY) else "none",
            )
            rec.readings.append(reading)
            if changed:
                self.events.append({"kind": "level_change", "ts": reading.timestamp, "camera_id": rec.id,
                                    "camera_name": rec.name, "from": previous.value, "to": level.value,
                                    "simulated": rec.source.is_playback})

            alert = None
            escalated = changed and rank(level) > rank(previous) and rank(level) >= rank(Level.WARNING)
            # The tracker steps down one level at a time, so this fires once, on WARNING -> ADVISORY.
            all_clear = changed and rank(previous) >= rank(Level.WARNING) and rank(level) < rank(Level.WARNING)
            if escalated or all_clear:
                alert = AlertEvent(
                    id=f"alt-{uuid.uuid4().hex[:8]}", camera_id=rec.id, camera_name=rec.name, level=level,
                    water_ratio=reading.water_ratio, timestamp=reading.timestamp,
                    kind="all_clear" if all_clear else "alert",
                    message=(f"{rec.name} is back below the warning line ({level.value})" if all_clear
                             else f"{rec.name} reached {level.value} ({round(reading.water_ratio * 100)}% of bank height)"),
                )
                self.alerts.appendleft(alert)
            return reading, alert

    def test_draft(self, draft: CameraCreate) -> Reading:
        """Run one analysis for an unsaved camera (wizard step 3). Nothing is stored."""
        self._check_source(draft)
        source = build_source(draft.source_type, draft.source_url, draft.username, draft.password, self.settings)
        frames = source.grab_frames(self.settings.burst_frames, self.settings.burst_gap_s)
        started = time.perf_counter()
        window = self._analyse_frames(frames, draft.calibration)
        if window.ratio is None:
            raise SourceError("analysis produced no result")
        thr = thresholds_from_calibration(draft.calibration)
        level = ratio_to_level(window.ratio, thr)
        elapsed = time.perf_counter() - started
        return Reading(
            camera_id="draft", timestamp=_now_iso(), window_seconds=round(elapsed, 1),
            frames_analyzed=window.frames_used, water_ratio=round(window.ratio, 3),
            waterline_y=round(window.waterline_y, 4) if window.waterline_y is not None else None,
            level=level, observed_level=level, confidence=window.confidence,
            low_confidence=window.confidence < 0.6, lines_crossed=lines_crossed(window.ratio, thr),
            trend="steady", model=self.analyzer.name, latency_ms=int(elapsed * 1000),
            action="show_on_map" if rank(level) >= rank(Level.ADVISORY) else "none",
        )

    def _check_source(self, draft: SourceDraft | CameraCreate) -> None:
        # An upload reference is validated by the factory (hex id under uploads/); URLs go through the SSRF guard.
        if draft.source_type != "upload":
            validate_source_url(draft.source_url, self.settings.allow_private_urls)

    def store_upload(self, data: bytes) -> str:
        """Validate and re-encode an uploaded photo; return its 'upload:<id>' reference.
        Magic bytes decide the type (not the filename). Decoding and re-encoding to JPEG drops EXIF, including GPS."""
        if not (data.startswith(JPEG_MAGIC) or data.startswith(PNG_MAGIC)):
            raise UnsafeURL("only JPEG and PNG photos are accepted")
        frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise UnsafeURL("that file is not a readable photo")
        longest = max(frame.shape[:2])
        if longest > UPLOAD_MAX_SIDE:
            scale = UPLOAD_MAX_SIDE / longest
            frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        upload_id = uuid.uuid4().hex
        directory = self.settings.uploads_dir
        directory.mkdir(parents=True, exist_ok=True)
        self._prune_uploads()
        (directory / f"{upload_id}.jpg").write_bytes(_jpeg(frame))
        return f"{UPLOAD_PREFIX}{upload_id}"

    def _prune_uploads(self) -> None:
        """Drop photos nobody saved a camera with after a day, so abandoned wizards do not fill the disk."""
        kept = {upload_id_from_url(r.source_url) for r in self.cameras.values() if r.source_type == "upload"}
        cutoff = time.time() - UPLOAD_KEEP_S
        for path in self.settings.uploads_dir.glob("*.jpg"):
            if path.stem not in kept and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)

    def preview_draft(self, draft: SourceDraft) -> bytes:
        self._check_source(draft)
        source = build_source(draft.source_type, draft.source_url, draft.username, draft.password, self.settings)
        return _jpeg(source.grab_frames(1, 0.0)[-1])

    # ───────────── loop + pub/sub ─────────────
    async def analyze_once_async(self, camera_id: str) -> Reading:
        reading, alert = await asyncio.to_thread(self.analyze_once, camera_id)
        await self._after_reading(reading, alert)
        return reading

    async def _after_reading(self, reading: Reading, alert: Optional[AlertEvent]) -> None:
        await self.publish({"type": "reading", "reading": reading.model_dump(mode="json")})
        if alert:
            await self.publish({"type": "alert", "alert": alert.model_dump(mode="json")})
            cam = self.cameras.get(alert.camera_id)
            await self.dispatcher.dispatch(alert, simulated=bool(cam and cam.source.is_playback))

    async def _camera_loop(self, camera_id: str) -> None:
        rec = self.cameras[camera_id]
        await asyncio.sleep((hash(camera_id) % 1000) / 1000 * min(rec.interval_s, 4))  # stagger starts
        while self._running and camera_id in self.cameras:
            try:
                await self.analyze_once_async(camera_id)
            except SourceError as exc:
                log.info("camera %s: %s", camera_id, exc)
                await self.publish({"type": "status", "camera_id": camera_id, "online": rec.online})
            except Exception:
                log.exception("camera %s analysis crashed", camera_id)
            await asyncio.sleep(rec.interval_s)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    async def publish(self, message: dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                self._subscribers.discard(q)  # slow consumer: drop it, it will reconnect

    def _publish_threadsafe(self, message: dict[str, Any]) -> None:
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.publish(message), self._loop)

    # ───────────── persistence (user cameras only, never credentials) ─────────────
    def _persist(self) -> None:
        mine = [
            {
                "id": r.id, "name": r.name, "provider": r.provider, "lat": r.lat, "lon": r.lon,
                "source_type": r.source_type, "source_url": r.source_url, "interval_s": r.interval_s,
                "feed_refresh_s": r.feed_refresh_s, "calibration": r.calibration.model_dump(mode="json"),
            }
            for r in self.cameras.values() if not r.seeded
        ]
        try:
            self.settings.data_dir.mkdir(parents=True, exist_ok=True)
            self.settings.cameras_file.write_text(json.dumps(mine, indent=2))
        except OSError:
            log.exception("could not persist cameras")

    def _load_user_cameras(self) -> None:
        path = self.settings.cameras_file
        if not path.exists():
            return
        try:
            for item in json.loads(path.read_text()):
                source = build_source(item["source_type"], item["source_url"], None, None, self.settings)
                rec = CameraRecord(
                    id=item["id"], name=item["name"], provider=item["provider"], lat=item["lat"], lon=item["lon"],
                    source_type=item["source_type"], source=source, calibration=Calibration(**item["calibration"]),
                    interval_s=item["interval_s"], feed_refresh_s=item.get("feed_refresh_s", 0), source_url=item["source_url"],
                )
                self.cameras[rec.id] = rec
        except Exception:
            log.exception("could not load saved cameras")
