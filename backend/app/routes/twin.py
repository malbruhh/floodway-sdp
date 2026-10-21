import time
import math
from fastapi import APIRouter, Query, HTTPException
from app.config import DEVICES, STALE_AFTER_SECONDS
from app.services.forecaster import forecaster
from app.services.shelters_data import SHELTERS_DATA
from app.routes.telemetry import readings, machines

router = APIRouter(prefix="/api/v1/twin", tags=["Digital Twin"])

def haversine_km(lat1, lon1, lat2, lon2) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))

@router.get("/state")
async def get_twin_state(
    device_id: str = Query("fw-node-01"),
    lat: float = Query(3.1610),
    lon: float = Query(101.7010),
    rainfall_rate_mm: float = Query(95.0)
):
    dev = DEVICES.get(device_id)
    if not dev:
        # Graceful fallback to default device
        dev = list(DEVICES.values())[0] if DEVICES else {"mount_height_cm": 400.0, "name": "Default Station"}

    now = time.time()
    rs = readings.get(device_id, [])
    last_ts, level_m = (rs[-1] if rs else (now, 1.20))
    is_stale = (now - last_ts) > STALE_AFTER_SECONDS

    forecast = await forecaster.predict_horizon(level_m, rainfall_rate_mm, dev.get("danger_threshold_m", 1.50))
    machine = machines.get(device_id)
    phase = machine.phase if machine else "NORMAL"

    # Find nearest shelter
    nearest = min(
        SHELTERS_DATA,
        key=lambda s: haversine_km(lat, lon, s["lat"], s["lon"])
    )
    dist_km = haversine_km(lat, lon, nearest["lat"], nearest["lon"])

    return {
        "device_id": device_id,
        "station_name": dev.get("name", "FloodWay Station"),
        "water_level_m": round(level_m, 3),
        "water_depth_cm": round(level_m * 100, 1),
        "rainfall_rate_mm_hr": rainfall_rate_mm,
        "phase": phase,
        "is_stale": is_stale,
        "forecast": forecast,
        "nearest_shelter": {
            **nearest,
            "distance_km": round(dist_km, 2),
            "travel_time_min": max(3, round(dist_km * 4.5))
        },
        "disclaimer": "Indicative only. Demo output from a simple formula on simulated input; not certified by any agency. Follow official instructions."
    }
