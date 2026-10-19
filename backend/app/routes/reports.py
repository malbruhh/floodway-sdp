import time
import random
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/reports", tags=["Community Reports"])

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
    title: str
    location: str
    lat: float
    lon: float
    water_depth_cm: float
    image_base64: str | None = None
    author: str = "Citizen"

@router.get("")
def get_reports():
    return DEMO_REPORTS

@router.post("")
def submit_report(r: NewReport):
    # Nothing verifies a submission here: it is stored as UNDER_REVIEW and says so. (It used to be auto-marked
    # VERIFIED with a made-up 'AI vision (97.2% confidence)' for any depth over 10 cm.)
    rep_id = f"rep-{int(time.time())}"
    verified_status = "UNDER_REVIEW"
    new_entry = {
        "id": rep_id,
        "title": r.title,
        "location": r.location,
        "lat": r.lat,
        "lon": r.lon,
        "water_depth_cm": r.water_depth_cm,
        "status": verified_status,
        "verified_by": "Not reviewed",
        "timestamp_str": "Just now",
        "author": r.author,
        "upvotes": 1,
        "image_url": "/assets/banjir2.jpg"
    }
    DEMO_REPORTS.insert(0, new_entry)
    return {"status": "SUCCESS", "report": new_entry}
