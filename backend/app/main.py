import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import telemetry, twin, shelters, predict, reports, alerts, ai_check, jps, weather
from app.vision import router as vision_router, vision_lifespan

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with vision_lifespan(app):
        yield

app = FastAPI(
    title="FloodWay 2.0 Backend",
    description="FloodWay demo backend: flood-prevention prototype (camera water-level analysis, shelters, reports, alerts).",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
app.include_router(telemetry.router)
app.include_router(twin.router)
app.include_router(shelters.router)
app.include_router(predict.router)
app.include_router(reports.router)
app.include_router(alerts.router)
app.include_router(ai_check.router)
app.include_router(jps.router)
app.include_router(weather.router)
app.include_router(vision_router)

@app.get("/healthz")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "FloodWay 2.0 Core Backend",
        "engine": "Demo backend (simulated data, no external cloud service)",
        "version": "2.0.0"
    }
