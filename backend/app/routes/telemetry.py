import time
import hmac
import hashlib
from collections import defaultdict, deque
from statistics import median
from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from app.config import DEVICES, MAX_SKEW_SECONDS
from app.services.phase_machine import PhaseMachine

router = APIRouter(prefix="/api/v1", tags=["Telemetry"])

readings: dict[str, deque] = defaultdict(lambda: deque(maxlen=2000))
raw_buffer: dict[str, deque] = defaultdict(lambda: deque(maxlen=5))
# Each station has its own warning/danger line, as JPS sets them per station.
machines: dict[str, PhaseMachine] = {
    dev_id: PhaseMachine(cfg.get("warning_threshold_m", 1.20), cfg.get("danger_threshold_m", 1.50))
    for dev_id, cfg in DEVICES.items()
}

# Seed initial normal reading for demo devices (seed: a calm river)
for dev_id in DEVICES:
    readings[dev_id].append((int(time.time()) - 60, 0.80))
    machines[dev_id].update(0.80)

class IngestPayload(BaseModel):
    device_id: str
    ts: int
    distance_cm: float = Field(ge=10, le=800)
    sig: str = ""

@router.post("/ingest")
def ingest_sensor_reading(p: IngestPayload):
    dev = DEVICES.get(p.device_id)
    if not dev:
        raise HTTPException(404, f"Unknown device {p.device_id}")

    # A device with a secret must sign every reading.
    if dev.get("secret"):
        expected_msg = f"{p.device_id}.{p.ts}.{p.distance_cm:.1f}".encode()
        good_sig = hmac.new(dev["secret"].encode(), expected_msg, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(good_sig, p.sig):
            raise HTTPException(401, "Invalid HMAC signature")

    if abs(time.time() - p.ts) > MAX_SKEW_SECONDS:
        raise HTTPException(400, "timestamp outside allowed window")
    if readings[p.device_id] and p.ts <= readings[p.device_id][-1][0]:
        raise HTTPException(409, "reading older than the last one")

    raw_buffer[p.device_id].append(p.distance_cm)
    filtered_dist = median(raw_buffer[p.device_id])
    mount_h = dev.get("mount_height_cm", 400.0)
    level_m = max(0.0, (mount_h - filtered_dist) / 100.0)

    readings[p.device_id].append((p.ts, level_m))
    phase = machines[p.device_id].update(level_m)

    return {
        "status": "ACCEPTED",
        "device_id": p.device_id,
        "level_m": round(level_m, 3),
        "phase": phase,
        "timestamp": p.ts
    }

@router.get("/devices")
def list_devices():
    out = []
    now = time.time()
    for dev_id, dev in DEVICES.items():
        rs = readings.get(dev_id, [])
        last_ts, last_val = (rs[-1] if rs else (now, 1.20))
        out.append({
            "id": dev_id,
            "name": dev.get("name", dev_id),
            "lat": dev.get("lat"),
            "lon": dev.get("lon"),
            "current_level_m": round(last_val, 3),
            "status": "ONLINE" if (now - last_ts) < 600 else "STALE",
            "phase": machines[dev_id].phase
        })
    return {"devices": out}

@router.get("/export.csv")
def export_csv(device_id: str = Query("fw-node-01")):
    rows = ["ts,timestamp_iso,level_m"]
    for t, l in readings.get(device_id, []):
        iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t))
        rows.append(f"{t},{iso},{l:.3f}")
    return Response("\n".join(rows), media_type="text/csv")
