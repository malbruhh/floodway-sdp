"""Resilience dashboard API: summary, CSV export and route-event logging. Metric definitions live in app/vision/events.py."""
import csv
import io
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.security import RateLimiter, require_write_token
from app.services.shelters_data import SHELTERS_DATA
from app.vision.events import now_iso, parse_ts, summarise
from app.vision.routes import _engine

router = APIRouter(prefix="/api/v1/resilience", tags=["Resilience"])
_limiter = RateLimiter(30, 60)
DEDUPE_S = 600  # the same client starting the same route again within 10 minutes is one household

WINDOW = Query(24, ge=1, le=720, description="hours of history")

CSV_COLUMNS = {
    "episodes": ["camera_id", "camera_name", "started_at", "early_signal_at", "warning_at", "danger_at", "ended_at",
                 "lead_time_s", "interrupted", "simulated"],
    "alerts": ["ts", "camera_id", "camera_name", "level", "alert_kind", "suppressed", "channels_sent",
               "channels_failed", "simulated"],
    "routes": ["ts", "route_kind", "shelter_id", "simulated"],
}


class RouteEvent(BaseModel):
    kind: Literal["start", "arrived"]
    shelter_id: str = Field(min_length=1, max_length=64)
    client_id: str = Field(min_length=1, max_length=64)


def _cell(value) -> str:
    """Stringify one CSV cell. Camera names are user-supplied, so a leading = + - @ would run as a formula in Excel."""
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@", "\t", "\r") else text


def _rows(kind: str, events: list[dict], summary: dict) -> list[list]:
    if kind == "episodes":
        return [[ep.get(c) for c in CSV_COLUMNS[kind]] for ep in summary["episodes"]]
    wanted = "alert" if kind == "alerts" else "route"
    cutoff = parse_ts(summary["generated_at"])
    out = []
    for e in events:
        if e["kind"] != wanted or (cutoff - parse_ts(e["ts"])).total_seconds() > summary["window_h"] * 3600:
            continue
        if kind == "alerts":
            outcomes = e.get("outcomes") or {}
            out.append([e["ts"], e.get("camera_id"), e.get("camera_name"), e.get("level"), e.get("alert_kind"),
                        e.get("suppressed", False), "|".join(k for k, v in outcomes.items() if v == "sent" and k != "log"),
                        "|".join(k for k, v in outcomes.items() if v == "failed"), e.get("simulated", False)])
        else:
            out.append([e["ts"], e.get("route_kind"), e.get("shelter_id"), e.get("simulated", True)])
    return out


@router.get("/summary")
def get_summary(request: Request, window_h: int = WINDOW):
    return summarise(_engine(request).events.events(), window_h)


@router.get("/export.csv")
def export_csv(request: Request, kind: Literal["episodes", "alerts", "routes"] = "episodes", window_h: int = WINDOW):
    events = _engine(request).events.events()
    summary = summarise(events, window_h)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(CSV_COLUMNS[kind])
    for row in _rows(kind, events, summary):
        writer.writerow([_cell(v) for v in row])
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="floodway-{kind}.csv"'})


@router.post("/route-events", dependencies=[Depends(require_write_token)])
def post_route_event(body: RouteEvent, request: Request):
    _limiter.check(request.client.host if request.client else "unknown")
    if not any(s["id"] == body.shelter_id for s in SHELTERS_DATA):
        raise HTTPException(404, f"Shelter {body.shelter_id} not found")
    log = _engine(request).events
    if log.has_recent_route(body.kind, body.client_id, body.shelter_id, DEDUPE_S):
        return {"recorded": False, "duplicate": True}
    # The evacuation drive in the app is a simulation, so these events are always tagged simulated.
    log.append({"kind": "route", "ts": now_iso(), "route_kind": body.kind, "shelter_id": body.shelter_id,
                "client_id": body.client_id, "simulated": True})
    return {"recorded": True, "duplicate": False}
