"""Live rain (Open-Meteo) and official weather warnings (MetMalaysia via data.gov.my).

Both are public, read-only and keyless. Results are cached for TTL_S so one backend call serves every visitor.
A failure returns None / an empty list: callers fall back to the simulated rate and say so. Nothing here is a forecast.
"""
from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone

import httpx

TTL_S = 300.0
MAX_POINTS = 100                     # one URL, one call; JPS lists 80 cameras
RAIN_URL = "https://api.open-meteo.com/v1/forecast"
WARNING_URL = "https://api.data.gov.my/weather/warning"
RAIN_SOURCE = "Open-Meteo (modelled rain at this point, not a gauge)"
WARNING_SOURCE = "MetMalaysia via data.gov.my"
_PLACE = re.compile(r"selangor|kuala lumpur|wilayah persekutuan", re.I)
_HAZARD = re.compile(r"thunderstorm|rain|flood|ribut|hujan|banjir", re.I)  # matched on the title, so a sea-only wind warning is skipped
MYT = timezone(timedelta(hours=8))   # valid_from and valid_to are local Malaysian time without an offset

_detail: dict[tuple[float, float], tuple[float, dict]] = {}
_SKY = {0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Light rain", 63: "Rain", 65: "Heavy rain", 80: "Light showers", 81: "Showers", 82: "Violent showers", 95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"}

_rain: dict[tuple[float, float], tuple[float, dict]] = {}
_warnings: dict = {"at": 0.0, "items": []}


async def _get_json(url: str, params: dict):
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:  # data.gov.my redirects once
        resp = await client.get(url, params=params)
    resp.raise_for_status()
    return resp.json()


def rate_mm_hr(current: dict) -> float | None:
    """Open-Meteo `precipitation` is the sum over the last `interval` seconds; scale it to mm per hour."""
    try:
        return round(max(0.0, float(current["precipitation"])) * 3600.0 / float(current["interval"]), 2)
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        return None


async def rain_now(lat: float, lon: float) -> dict | None:
    key = (round(lat, 2), round(lon, 2))
    now = time.time()
    hit = _rain.get(key)
    if hit and now - hit[0] < TTL_S:
        return hit[1]
    try:
        body = await _get_json(RAIN_URL, {"latitude": key[0], "longitude": key[1], "current": "precipitation", "timezone": "auto"})
    except (httpx.HTTPError, ValueError):
        return hit[1] if hit else None  # an old reading is still labelled with its own time
    rate = rate_mm_hr(body.get("current") or {})
    if rate is None:
        return None
    out = {"rate_mm_hr": rate, "observed_at": body["current"].get("time"), "source": RAIN_SOURCE}
    _rain[key] = (now, out)
    return out


def _point(current: dict) -> dict | None:
    rate = rate_mm_hr(current)
    if rate is None:
        return None
    temp = current.get("temperature_2m")
    return {"rate_mm_hr": rate, "temp_c": temp if isinstance(temp, (int, float)) else None,
            "observed_at": current.get("time"), "source": RAIN_SOURCE}


async def weather_for(points: list[tuple[float, float]]) -> dict[str, dict | None]:
    """Rain and temperature for many points in ONE upstream call. Keys are "lat,lon" rounded to 2 places."""
    keys = list(dict.fromkeys((round(la, 2), round(lo, 2)) for la, lo in points))[:MAX_POINTS]
    now = time.time()
    out: dict[str, dict | None] = {}
    missing = []
    for k in keys:
        hit = _rain.get(k)
        if hit and now - hit[0] < TTL_S:
            out[f"{k[0]},{k[1]}"] = hit[1]
        else:
            missing.append(k)
    if missing:
        try:
            body = await _get_json(RAIN_URL, {"latitude": ",".join(str(k[0]) for k in missing), "longitude": ",".join(str(k[1]) for k in missing),
                                              "current": "precipitation,temperature_2m", "timezone": "auto"})
            rows = body if isinstance(body, list) else [body]
        except (httpx.HTTPError, ValueError):
            rows = []
        for i, k in enumerate(missing):
            row = _point((rows[i] if i < len(rows) and isinstance(rows[i], dict) else {}).get("current") or {})
            if row:
                _rain[k] = (now, row)
            old = _rain.get(k)
            out[f"{k[0]},{k[1]}"] = row or (old[1] if old else None)  # an old reading keeps its own observed_at
    return out


def in_warning_area(lat: float, lon: float) -> bool:
    """MetMalaysia warnings are matched on Selangor / KL names, so only show them for places in that area."""
    return 2.5 <= lat <= 4.0 and 100.5 <= lon <= 102.0


async def detail_for(lat: float, lon: float) -> dict | None:
    """Fuller weather for one focused camera: now, next 6 hours, and warnings. Works for any place on Earth; None on failure."""
    key = (round(lat, 2), round(lon, 2))
    now = time.time()
    hit = _detail.get(key)
    if hit and now - hit[0] < TTL_S:
        return hit[1]
    try:
        body = await _get_json(RAIN_URL, {"latitude": key[0], "longitude": key[1], "timezone": "auto", "forecast_hours": 6,
                                          "current": "precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code",
                                          "hourly": "precipitation,precipitation_probability"})
        cur, hourly = body["current"], body["hourly"]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return hit[1] if hit else None
    base = _point(cur)
    if not base:
        return None
    nxt = [{"time": t, "mm": p, "chance_pct": c} for t, p, c in zip(hourly.get("time", []), hourly.get("precipitation", []), hourly.get("precipitation_probability", []))]
    out = {**base, "humidity_pct": cur.get("relative_humidity_2m"), "wind_kmh": cur.get("wind_speed_10m"), "gust_kmh": cur.get("wind_gusts_10m"),
           "sky": _SKY.get(cur.get("weather_code"), "Unknown"), "next_hours": nxt,
           "warnings": await warnings_now() if in_warning_area(lat, lon) else [], "warnings_covered": in_warning_area(lat, lon), "warnings_source": WARNING_SOURCE}
    _detail[key] = (now, out)
    return out


def relevant_warnings(records: list[dict], now: datetime) -> list[dict]:
    """Warnings valid now that name Selangor or KL and a rain or flood hazard."""
    out = []
    for r in records:
        try:
            start, end = datetime.fromisoformat(r["valid_from"]), datetime.fromisoformat(r["valid_to"])
        except (KeyError, TypeError, ValueError):
            continue
        title = (r.get("warning_issue") or {}).get("title_en") or r.get("heading_en") or ""
        if start <= now <= end and _PLACE.search(str(r.get("text_en") or "")) and _HAZARD.search(title):
            out.append({"title": title,
                        "issued": (r.get("warning_issue") or {}).get("issued"), "valid_to": r["valid_to"]})
    return out


async def warnings_now(now: datetime | None = None) -> list[dict]:
    t = time.time()
    if t - _warnings["at"] < TTL_S:
        return _warnings["items"]
    try:
        records = await _get_json(WARNING_URL, {"limit": 20})
    except (httpx.HTTPError, ValueError):
        return _warnings["items"]
    if not isinstance(records, list):
        return _warnings["items"]
    _warnings.update(at=t, items=relevant_warnings(records, now or datetime.now(MYT).replace(tzinfo=None)))
    return _warnings["items"]
