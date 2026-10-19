# FloodWay 2.0: AI Flood Early Warning and Evacuation
### Sime Darby Property University Hackathon 2026 · Township of Tomorrow

> **"One glance to know if you are safe. One tap to find shelter."**

FloodWay reads water levels from ordinary cameras, warns residents early, and routes them to shelter around flooded roads. It is a prototype: the sample cameras, rainfall and river numbers, forecast, shelters and reports are simulated, and no external cloud service is called.

## How it works

```
Cameras / photos / ESP32 sensor  ->  Water-level analysis (backend/app/vision)  ->  Level: NORMAL / ADVISORY / WARNING / DANGER
Citizen reports + optional AI photo check                                      ->  In-app, browser and Telegram alerts
Shelters + flood-prone areas + OpenStreetMap routes                           ->  Evacuation map and turn-by-turn page
```

* **Live Vision (`/live`):** camera frames in, water level, trend and alerts out. Add your own camera by URL or photo upload.
* **Evacuation map (`/map`, `/navigation`):** demo shelters, flood-prone areas, stored OpenStreetMap routes that avoid flood zones.
* **Citizen reports (`/reports`):** geotagged flood reports with an optional AI photo check (needs `OPENROUTER_API_KEY`, otherwise it says "AI check not run").
* **Alerts and SOS:** in-app and browser alerts; Telegram family SOS and arrival check-in (needs a bot token, otherwise `NOT_SENT`).
* **Forecast:** a rule-based 2-hour estimate, labelled "not a trained model".

See [docs/STATUS.md](docs/STATUS.md) for what works, what is simulated and the open fixes, and [docs/ops/DEMO_RUNBOOK.md](docs/ops/DEMO_RUNBOOK.md) for what is real and what is simulated.

## Repository structure

```
/frontend    React 19 + Vite + Tailwind 4 UI
/backend     Python FastAPI services (Live Vision, alerts, reports, forecast, telemetry)
/models      Forecaster research code (PyTorch GRU, synthetic weights) and a legacy ANN; not used by the app
/datasets    Malaysia monthly rainfall / flood CSV (used only by the legacy ANN)
/firmware    ESP32 water-level sensor sketch
/docs        Specs, plans, runbook, AI-agent notes
```

## Quick start

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
cd backend  && pip install -r requirements.txt && python run.py   # http://localhost:8080  (Python 3.12; Swagger at /docs)
```

Checks: `powershell -File scripts/check.ps1`.
