"""Pydantic contracts shared by the engine, REST routes and WebSocket."""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class Level(str, Enum):
    NORMAL = "NORMAL"
    ADVISORY = "ADVISORY"
    WARNING = "WARNING"
    DANGER = "DANGER"


Provider = Literal["public", "city", "mine"]
SourceType = Literal["snapshot", "stream", "synthetic", "file", "upload"]
Trend = Literal["rising", "steady", "falling"]


class Lines(BaseModel):
    """Reference lines as normalised y positions (0 = top of frame, 1 = bottom).
    A smaller y means higher water, so danger < warning < normal."""

    normal: float = Field(ge=0, le=1)
    warning: float = Field(ge=0, le=1)
    danger: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def _ordered(self) -> "Lines":
        if not (self.danger < self.warning < self.normal):
            raise ValueError("lines must satisfy danger < warning < normal (top to bottom)")
        return self


class Calibration(BaseModel):
    roi: list[tuple[float, float]] = Field(min_length=3, max_length=32)
    lines: Lines

    @field_validator("roi")
    @classmethod
    def _roi_in_frame(cls, pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
        for x, y in pts:
            if not (0 <= x <= 1 and 0 <= y <= 1):
                raise ValueError("roi points must be normalised to 0..1")
        return pts

    @model_validator(mode="after")
    def _lines_inside_roi(self) -> "Calibration":
        bed = max(y for _, y in self.roi)
        if self.lines.normal >= bed:
            raise ValueError("normal line must sit above the bottom of the analysed zone")
        return self


class SourceDraft(BaseModel):
    source_type: Literal["snapshot", "stream", "upload"]
    source_url: str = Field(min_length=8, max_length=2048)
    username: Optional[str] = Field(default=None, max_length=128)
    password: Optional[str] = Field(default=None, max_length=256)


class CameraCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    provider: Provider = "mine"
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    source_type: Literal["snapshot", "stream", "upload"]
    source_url: str = Field(min_length=8, max_length=2048)
    username: Optional[str] = Field(default=None, max_length=128)
    password: Optional[str] = Field(default=None, max_length=256)
    interval_s: int = Field(default=8, ge=5, le=600)
    # How often the source itself refreshes (e.g. 900 for a 15-minute public snapshot). 0 = continuous.
    feed_refresh_s: int = Field(default=0, ge=0, le=3600)
    calibration: Calibration


class Reading(BaseModel):
    camera_id: str
    timestamp: str
    window_seconds: float
    frames_analyzed: int
    water_ratio: float
    waterline_y: Optional[float] = None
    level: Level
    observed_level: Level
    confidence: float
    low_confidence: bool
    lines_crossed: list[str]
    trend: Trend
    model: str
    latency_ms: int
    action: Literal["none", "show_on_map"]


class CameraPublic(BaseModel):
    id: str
    name: str
    provider: Provider
    lat: float
    lon: float
    source_type: SourceType
    is_playback: bool
    online: bool
    interval_s: int
    feed_refresh_s: int
    last_frame_at: Optional[str] = None
    calibration: Calibration
    reading: Optional[Reading] = None


class AlertEvent(BaseModel):
    id: str
    camera_id: str
    camera_name: str
    level: Level
    water_ratio: float
    timestamp: str
    message: str
    kind: Literal["alert", "all_clear"] = "alert"
