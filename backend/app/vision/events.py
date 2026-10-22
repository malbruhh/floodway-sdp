"""Durable event log behind the Resilience dashboard.

The engine and dispatcher append plain dicts (kinds: level_change, alert, route). The log keeps them in memory and, once
`open(path)` is called, in an append-only JSONL file so history survives a restart. `build_episodes` and `summarise`
are pure functions over the event list: the dashboard's metric definitions live here and nowhere else.

Metric definitions
  episode      per camera, from an `alert` (WARNING or DANGER) to its `all_clear`; open ones are "ongoing". A server
               restart (`engine_start`) closes open ones as "interrupted": the trackers start again at NORMAL.
  early signal the camera's last level_change into ADVISORY while no episode was open, else the first alert.
  lead time    first DANGER alert minus the early signal. None when the episode never reached DANGER or no earlier
               signal exists (a direct jump to DANGER is not a lead time of 0, it is "none").
  sent         an alert record where a non-"log" channel reported success. The log channel is not a delivery.
"""
from __future__ import annotations

import json
import logging
import statistics
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("floodway.vision.events")

MAX_EVENTS = 5000  # shortcut: one capped file, no rotation; upgrade to daily files if the log must outlive a month


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def parse_ts(value: str) -> datetime:
    """ISO 8601 to an aware datetime. A timestamp without an offset is read as UTC."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class EventLog:
    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._path: Optional[Path] = None
        self._lock = threading.Lock()

    def open(self, path: Path) -> None:
        """Load history from `path` and persist every later append there. Corrupt lines are skipped."""
        loaded: list[dict[str, Any]] = []
        total = 0
        try:
            for line in path.read_text(encoding="utf-8").splitlines():
                total += 1
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if isinstance(rec, dict) and isinstance(rec.get("kind"), str) and isinstance(rec.get("ts"), str):
                    loaded.append(rec)
        except FileNotFoundError:
            pass
        except OSError:
            log.exception("could not read %s", path)
        with self._lock:
            self._events = (loaded + self._events)[-MAX_EVENTS:]
            self._path = path
            if total > MAX_EVENTS or len(loaded) < total:  # trim an oversized file, or drop its corrupt lines
                self._rewrite()

    def append(self, rec: dict[str, Any]) -> None:
        with self._lock:
            self._events.append(rec)
            del self._events[:-MAX_EVENTS]
            if self._path is None:
                return
            try:
                self._path.parent.mkdir(parents=True, exist_ok=True)
                with self._path.open("a", encoding="utf-8") as fh:
                    fh.write(json.dumps(rec, separators=(",", ":")) + "\n")
            except OSError:
                log.exception("could not write %s: event kept in memory only", self._path)

    def events(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._events)

    def has_recent_route(self, route_kind: str, client_id: str, shelter_id: str, within_s: float,
                         now: Optional[datetime] = None) -> bool:
        """True when this client already logged the same route event for this shelter inside the window."""
        cutoff = (now or datetime.now(timezone.utc)) - timedelta(seconds=within_s)
        with self._lock:
            for rec in reversed(self._events):
                if rec["kind"] != "route":
                    continue
                if parse_ts(rec["ts"]) < cutoff:
                    break
                if (rec.get("route_kind"), rec.get("client_id"), rec.get("shelter_id")) == (route_kind, client_id, shelter_id):
                    return True
        return False

    def _rewrite(self) -> None:
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._path.write_text("".join(json.dumps(r, separators=(",", ":")) + "\n" for r in self._events), encoding="utf-8")
        except OSError:
            log.exception("could not rewrite %s", self._path)


# ───────────── pure metrics ─────────────
def build_episodes(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fold level_change and alert records into episodes (see the module docstring). Order in the list does not matter."""
    ordered = sorted(
        (e for e in events if e.get("kind") in ("level_change", "alert", "engine_start") and isinstance(e.get("ts"), str)),
        key=lambda e: parse_ts(e["ts"]),
    )  # sorted() is stable, so records with the same second keep their logged order
    open_ep: dict[str, dict[str, Any]] = {}
    early: dict[str, str] = {}
    done: list[dict[str, Any]] = []
    for e in ordered:
        if e["kind"] == "engine_start":  # trackers restart at NORMAL, so an open episode can never be closed by an all-clear
            for ep in open_ep.values():
                ep["interrupted"] = True
                done.append(ep)
            open_ep.clear()
            early.clear()
            continue
        cam = e.get("camera_id")
        if not isinstance(cam, str):
            continue
        if e["kind"] == "level_change":
            if cam in open_ep:
                continue
            if e.get("to") == "ADVISORY":
                early[cam] = e["ts"]
            elif e.get("to") == "NORMAL":
                early.pop(cam, None)
            continue
        if e.get("alert_kind") == "all_clear":
            ep = open_ep.pop(cam, None)
            if ep:
                ep["ended_at"] = e["ts"]
                done.append(ep)
            continue
        level = e.get("level")
        if level not in ("WARNING", "DANGER"):
            continue
        ep = open_ep.get(cam)
        if ep is None:
            ep = open_ep[cam] = {
                "camera_id": cam, "camera_name": e.get("camera_name", cam), "started_at": e["ts"],
                "early_signal_at": early.pop(cam, e["ts"]), "warning_at": None, "danger_at": None,
                "ended_at": None, "lead_time_s": None, "interrupted": False, "simulated": bool(e.get("simulated", False)),
            }
        key = "danger_at" if level == "DANGER" else "warning_at"
        if ep[key] is None:
            ep[key] = e["ts"]
    episodes = done + list(open_ep.values())
    for ep in episodes:
        if ep["danger_at"]:
            lead = (parse_ts(ep["danger_at"]) - parse_ts(ep["early_signal_at"])).total_seconds()
            ep["lead_time_s"] = int(lead) if lead > 0 else None
    episodes.sort(key=lambda ep: parse_ts(ep["started_at"]), reverse=True)
    return episodes


def summarise(events: list[dict[str, Any]], window_h: int, now: Optional[datetime] = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=window_h)
    in_window = [e for e in events if isinstance(e.get("ts"), str) and parse_ts(e["ts"]) >= cutoff]
    episodes = [ep for ep in build_episodes(events) if parse_ts(ep["started_at"]) >= cutoff]

    leads = [ep["lead_time_s"] for ep in episodes if ep["lead_time_s"] is not None]
    alerts = {"raised": 0, "all_clear": 0, "sent_external": 0, "failed": 0, "suppressed": 0}
    routes = {"started": 0, "arrived": 0}
    for e in in_window:
        if e["kind"] == "alert":
            alerts["all_clear" if e.get("alert_kind") == "all_clear" else "raised"] += 1
            if e.get("suppressed"):
                alerts["suppressed"] += 1
                continue
            outcomes = [v for k, v in (e.get("outcomes") or {}).items() if k != "log"]
            if "sent" in outcomes:
                alerts["sent_external"] += 1
            elif "failed" in outcomes:
                alerts["failed"] += 1
        elif e["kind"] == "route":
            routes["started" if e.get("route_kind") == "start" else "arrived"] += 1

    return {
        "window_h": window_h,
        "generated_at": now.isoformat(timespec="seconds"),
        "log_since": min((e["ts"] for e in events if isinstance(e.get("ts"), str)), key=parse_ts, default=None),
        "all_simulated": all(e.get("simulated", False) for e in in_window if e["kind"] != "engine_start"),
        "episodes": episodes,
        "episodes_caught": len(episodes),
        "episodes_ongoing": sum(1 for ep in episodes if ep["ended_at"] is None and not ep["interrupted"]),
        "lead": {
            "count": len(leads),
            "none_count": len(episodes) - len(leads),
            "median_s": int(statistics.median(leads)) if leads else None,
            "min_s": min(leads) if leads else None,
            "max_s": max(leads) if leads else None,
        },
        "alerts": alerts,
        "routes": routes,
    }
