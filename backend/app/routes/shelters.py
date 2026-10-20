from fastapi import APIRouter, HTTPException
from app.services.shelters_data import SHELTERS_DATA

router = APIRouter(prefix="/api/v1/shelters", tags=["Shelters"])

@router.get("")
def list_shelters(status: str | None = None):
    if status:
        return [s for s in SHELTERS_DATA if s["status"].upper() == status.upper()]
    return SHELTERS_DATA

@router.get("/{shelter_id}")
def get_shelter(shelter_id: str):
    for s in SHELTERS_DATA:
        if s["id"] == shelter_id:
            return s
    raise HTTPException(404, f"Shelter {shelter_id} not found")
