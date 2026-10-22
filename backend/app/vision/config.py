"""Live Vision settings. Everything is read from environment variables with safe defaults."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class VisionSettings:
    # Cadence: one analysis cycle per camera every `interval_s` seconds.
    default_interval_s: int = int(os.getenv("VISION_DEFAULT_INTERVAL_S", "8"))
    # Each cycle grabs a short burst and takes the median (robust against glare/ripples).
    burst_frames: int = int(os.getenv("VISION_BURST_FRAMES", "5"))
    burst_gap_s: float = float(os.getenv("VISION_BURST_GAP_S", "0.4"))
    # "classical" (no training needed) or "yolo" (needs ultralytics + weights).
    analyzer: str = os.getenv("VISION_ANALYZER", "classical")
    yolo_weights: str = os.getenv("VISION_YOLO_WEIGHTS", "")
    # Safety switches for public deployments.
    allow_user_cameras: bool = _bool("VISION_ALLOW_USER_CAMERAS", True)
    allow_private_urls: bool = _bool("VISION_ALLOW_PRIVATE_URLS", False)
    seed_samples: bool = _bool("VISION_SEED_SAMPLES", True)
    # Testing aid: shift the sample scenes' clock by N seconds to reach a given water level on demand.
    # Backend only, so the page itself never gains manual controls.
    sample_clock_offset_s: float = float(os.getenv("VISION_SAMPLE_CLOCK_OFFSET_S", "0"))
    # Alerting.
    alert_cooldown_s: int = int(os.getenv("VISION_ALERT_COOLDOWN_S", "300"))
    telegram_token: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_chat_id: str = os.getenv("TELEGRAM_DEFAULT_CHAT_ID", "")
    # Storage (user cameras only; credentials are never written to disk).
    data_dir: Path = field(default_factory=lambda: Path(os.getenv("VISION_DATA_DIR", "data")))

    @property
    def cameras_file(self) -> Path:
        return self.data_dir / "cameras.json"

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"
