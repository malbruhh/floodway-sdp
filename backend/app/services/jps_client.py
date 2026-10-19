"""JPS Selangor public camera list and snapshot proxy.

The API is unofficial and undocumented (no stated terms), so this client is read-only, cached and host-locked:
  * the camera list is cached for LIST_TTL_S, and a stale copy is served if JPS is unreachable,
  * a snapshot is fetched only from the host JPS itself names, and cached for IMAGE_TTL_S,
  * cameras that are disabled or have no usable position are dropped.
Snapshots are JPEGs overwritten about every 1 to 2 minutes (no video). No water level is read from them here.
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx

HOST = "infobanjirjps.selangor.gov.my"
LIST_URL = f"https://{HOST}/JPSAPI/api/CCTVS/GetCCTVsByDistrict/{{}}"
DISTRICT_IDS = range(1, 10)          # checked 2026-10-19: ids 1 to 9 hold the cameras, 10+ are empty
LIST_TTL_S = 120.0
IMAGE_TTL_S = 60.0
MAX_IMAGE_BYTES = 2 * 1024 * 1024
STALE_AFTER_S = 15 * 60              # the file is rewritten every 1 to 2 minutes, so 15 minutes old means it stopped
SOURCE = "JPS Selangor public snapshot (unofficial API)"
MYT = timezone(timedelta(hours=8))   # lastUpdate is local Malaysian time without an offset

_cache: dict = {"at": 0.0, "cameras": [], "image_urls": {}}
_images: dict[int, tuple[float, bytes, str]] = {}


class UpstreamError(Exception):
    pass


def _in_selangor(lat: float, lon: float) -> bool:
    return 2.5 <= lat <= 4.0 and 100.5 <= lon <= 102.0   # drops the 0,0 entries


def _age_s(last_update: str | None, now: float) -> float | None:
    try:
        ts = datetime.fromisoformat(last_update).replace(tzinfo=MYT).timestamp() if last_update else None
    except ValueError:
        return None
    return max(0.0, now - ts) if ts else None


def _status(is_online: bool, age: float | None) -> str:
    if not is_online:
        return "offline"
    return "stale" if age is None or age > STALE_AFTER_S else "online"


def parse_camera(raw: dict, now: float) -> tuple[dict, str] | None:
    """Map one JPS record to our shape, or None if it cannot be shown honestly."""
    try:
        lat, lon, cam_id = float(raw["latitude"]), float(raw["longitude"]), int(raw["id"])
    except (KeyError, TypeError, ValueError):
        return None
    if not raw.get("isEnabled") or not _in_selangor(lat, lon) or not raw.get("imageUrl"):
        return None
    age = _age_s(raw.get("lastUpdate"), now)
    cam = {
        "id": cam_id,
        "name": str(raw.get("cameraName") or f"Camera {cam_id}").strip(),
        "district": str(raw.get("districtName") or "").title(),
        "river_basin": raw.get("mainRiverBasin"),
        "lat": lat,
        "lon": lon,
        "status": _status(bool(raw.get("isOnline")), age),
        "last_update": raw.get("lastUpdate"),
        "age_s": None if age is None else round(age),
        "image_path": f"/api/v1/jps/cameras/{cam_id}/image",
        "reading": "image_only",   # no AI water level: real photos need a calibrated dry reference frame
    }
    return cam, str(raw["imageUrl"])


async def _fetch_district(client: httpx.AsyncClient, district_id: int) -> list[dict]:
    resp = await client.get(LIST_URL.format(district_id))
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else []


async def list_cameras() -> dict:
    """Cached camera list. Raises UpstreamError only when there is nothing cached to fall back on."""
    now = time.time()
    if _cache["cameras"] and now - _cache["at"] < LIST_TTL_S:
        return _result(stale=False)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            batches = await asyncio.gather(*(_fetch_district(client, d) for d in DISTRICT_IDS))
    except (httpx.HTTPError, ValueError) as exc:
        if _cache["cameras"]:
            return _result(stale=True)
        raise UpstreamError(f"JPS Selangor is not reachable: {exc.__class__.__name__}") from exc
    cameras, urls = [], {}
    for raw in (r for batch in batches for r in batch):
        parsed = parse_camera(raw, now)
        if parsed:
            cameras.append(parsed[0])
            urls[parsed[0]["id"]] = parsed[1]
    if not cameras and _cache["cameras"]:
        return _result(stale=True)
    cameras.sort(key=lambda c: (c["district"], c["name"]))
    _cache.update(at=now, cameras=cameras, image_urls=urls)
    return _result(stale=False)


def _result(stale: bool) -> dict:
    return {"source": SOURCE, "fetched_at": _cache["at"], "stale": stale, "count": len(_cache["cameras"]), "cameras": _cache["cameras"]}


async def get_image(cam_id: int) -> tuple[bytes, str]:
    """Latest snapshot for a camera JPS listed. KeyError if unknown; UpstreamError if the fetch fails."""
    now = time.time()
    hit = _images.get(cam_id)
    if hit and now - hit[0] < IMAGE_TTL_S:
        return hit[1], hit[2]
    if not _cache["image_urls"]:
        await list_cameras()
    url = _cache["image_urls"][cam_id]            # KeyError for an id JPS did not list: we never fetch a caller's URL
    if urlparse(url).hostname != HOST:
        raise KeyError(cam_id)
    try:
        status, body, ctype = await _fetch_image(url)
    except httpx.HTTPError as exc:
        raise UpstreamError("snapshot request failed") from exc
    if status != 200 or not ctype.startswith("image/") or len(body) > MAX_IMAGE_BYTES:
        raise UpstreamError(f"snapshot unavailable (HTTP {status})")
    _images[cam_id] = (now, body, ctype)
    return body, ctype


async def _fetch_image(url: str) -> tuple[int, bytes, str]:
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=False) as client:
        resp = await client.get(url)
    return resp.status_code, resp.content, resp.headers.get("content-type", "")
