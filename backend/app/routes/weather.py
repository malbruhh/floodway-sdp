from fastapi import APIRouter, HTTPException, Query

from app.services import weather_client

router = APIRouter(prefix="/api/v1/weather", tags=["Weather"])


@router.get("/points")
async def points(lat: list[float] = Query(..., max_length=weather_client.MAX_POINTS), lon: list[float] = Query(..., max_length=weather_client.MAX_POINTS)):
    """Rain and temperature at each lat/lon pair (repeat the params). Keyed "lat,lon" rounded to 2 places; null if unavailable."""
    if len(lat) != len(lon) or not all(-90 <= a <= 90 for a in lat) or not all(-180 <= o <= 180 for o in lon):
        raise HTTPException(422, "lat and lon must be equal-length lists in range")
    return {"source": weather_client.RAIN_SOURCE, "points": await weather_client.weather_for(list(zip(lat, lon)))}


@router.get("/detail")
async def detail(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    """Weather for one place: now, next 6 hours and (inside Selangor / KL) MetMalaysia warnings."""
    out = await weather_client.detail_for(lat, lon)
    if out is None:
        raise HTTPException(502, "Weather is not reachable")
    return out
