from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.forecaster import forecaster

router = APIRouter(prefix="/api/v1/predict", tags=["AI Prediction"])

class PredictionRequest(BaseModel):
    current_water_level_m: float = Field(1.20, ge=0, le=10)
    rainfall_rate_mm_hr: float = Field(95.0, ge=0, le=500)

@router.post("")
async def predict_flood(p: PredictionRequest):
    res = await forecaster.predict_horizon(p.current_water_level_m, p.rainfall_rate_mm_hr)
    return res
