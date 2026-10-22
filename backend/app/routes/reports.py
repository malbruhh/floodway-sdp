import time
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.routes.alerts import RATE_LIMIT, RATE_WINDOW_S
from app.security import RateLimiter, require_write_token

router = APIRouter(prefix="/api/v1/reports", tags=["Community Reports"])
_limiter = RateLimiter(RATE_LIMIT, RATE_WINDOW_S)
MAX_REPORTS = 200  # in-memory demo store: the oldest reports drop off

DEMO_REPORTS = [
    {
        "id": "rep-01",
        "title": "Jalan Raja Muda Musa Water Spillover",
        "location": "Kampung Baru, Kuala Lumpur",
        "lat": 3.1642,
        "lon": 101.7031,
        "water_depth_cm": 35,
        "status": "VERIFIED",
        "verified_by": "Demo data (not verified)",
        "timestamp_str": "12 minutes ago",
        "author": "Ahmad F.",
        "upvotes": 28,
        "image_url": "/assets/banjir2.jpg"
    },
    {
        "id": "rep-02",
        "title": "Submerged Drain & Road Clogged",
        "location": "Taman Sri Muda, Seksyen 25",
        "lat": 3.0315,
        "lon": 101.5360,
        "water_depth_cm": 50,
        "status": "VERIFIED",
        "verified_by": "Demo data (not verified)",
        "timestamp_str": "25 minutes ago",
        "author": "Sarah T.",
        "upvotes": 41,
        "image_url": "/assets/banjir3.jfif"
    }
]

class NewReport(BaseModel):
    title: str = Field(max_length=120)
    location: str = Field(max_length=120)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    water_depth_cm: float = Field(ge=0, le=1000)
    author: str = Field(default="Citizen", max_length=60)
    description: str = Field(default="", max_length=500)
    # Only what the client may claim. Nothing the client sends can make a report officially verified.
    status: Literal["UNDER_REVIEW", "AI_VERIFIED"] = "UNDER_REVIEW"

@router.get("")
def get_reports():
    return DEMO_REPORTS

@router.post("", dependencies=[Depends(require_write_token)])
def submit_report(r: NewReport, request: Request):
    _limiter.check(request.client.host if request.client else "unknown")
    # Nothing verifies a submission here. The photo is not uploaded: the reporter's browser keeps it for their own
    # view, so the stored report has no image.
    ai = r.status == "AI_VERIFIED"
    new_entry = {
        "id": f"rep-{time.time_ns()}",
        "title": r.title,
        "location": r.location,
        "lat": r.lat,
        "lon": r.lon,
        "water_depth_cm": r.water_depth_cm,
        "status": r.status,
        "verified_by": "AI assessment (not an official verification)" if ai else "Not reviewed",
        "timestamp_str": "Just now",
        "author": r.author,
        "upvotes": 1,
        "image_url": None,
        "description": r.description,
    }
    DEMO_REPORTS.insert(0, new_entry)
    del DEMO_REPORTS[MAX_REPORTS:]
    return {"status": "SUCCESS", "report": new_entry}
