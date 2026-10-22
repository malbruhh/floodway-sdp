# FloodWay

**Public river cameras in, early flood warning and safe routes out.**

FloodWay is a prototype flood early-warning and evacuation app for Selangor and the Klang Valley. It shows live public river-camera snapshots from JPS Selangor on a map, reads water levels from camera frames, alerts residents, and routes them to shelter around flooded roads.

Built for the **Sime Darby Property University Hackathon 2026** ("Township of Tomorrow").

> **Prototype notice.** FloodWay is a student prototype, not an official warning system. Several parts run on simulated data and are labelled as such (see [What is real and what is simulated](#what-is-real-and-what-is-simulated)). In an emergency, follow instructions from the authorities (NADMA, JPS, MetMalaysia, Bomba).

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [What is real and what is simulated](#what-is-real-and-what-is-simulated)
- [Data sources and ethical use](#data-sources-and-ethical-use)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

| Feature | What it does |
|---|---|
| **Selangor river cameras** (`/jps`) | Latest public JPS Selangor snapshot for about 80 cameras, filter by district, online or stale status and age of each photo. Image only, no AI reading |
| **Camera map** (`/map`) | Camera dots coloured by feed status, demo shelters, flood-prone areas |
| **Live Vision** (`/live`) | Reads a camera frame, converts the waterline to a share of bank height and a level: NORMAL, ADVISORY, WARNING or DANGER, with trend. Add your own camera by URL or photo and calibrate it in a wizard |
| **Alerts** | In-app toast, browser notification and optional Telegram message when a level changes, with a cooldown |
| **Family SOS** | One tap sends your location and chosen shelter to a Telegram chat, then a check-in message on arrival |
| **Evacuation routes** (`/map`, `/navigation`) | Road routes from OpenStreetMap that avoid flooded zones, with turn-by-turn steps |
| **Citizen reports** (`/reports`) | Geotagged flood reports with an optional AI photo check |
| **Home dashboard** (`/home`) | Risk status, forecast, river trend and shelter capacity |
| **Sensor ingest** | An ESP32 water-level node can post readings; CSV export |

## How it works

```
JPS Selangor public API ──► backend cache + image proxy ──► camera wall and map dots
Camera frame / photo ─────► Live Vision analyser ─────────► level, trend, alert
Alert ────────────────────► in-app, browser, Telegram
Shelters + flood areas + OpenStreetMap routes ────────────► evacuation route
```

The browser never talks to JPS directly. The backend fetches the camera list (cached 2 minutes) and each snapshot (cached 1 minute), checks the image host, and serves it to the page.

## What is real and what is simulated

before moving on real telemetric data, we will be using sampled/simulated data to show how the system should perform under normal condition.



| Real | Simulated or limited |
|---|---|
| JPS Selangor camera list and snapshots | The five Live Vision sample cameras are **AI-generated images**, labelled SAMPLE |
| OpenStreetMap tiles and road geometry | River level, rainfall and sensor counts on the home screen are simulated |
| The camera analysis, alert and routing code | The forecast is a hand-written formula, not a trained model |
| User-added cameras and photos | Shelters and flood-prone areas are demo data, not an official register |
| | JPS photos are shown as images only; no AI water level is claimed for them |

## Data sources and ethical use

FloodWay is built only on **public, openly reachable data**, and is designed to be a good citizen of those sources.

- **JPS Selangor** (`infobanjirjps.selangor.gov.my`): camera names, positions, status and snapshot images that the JPS public info-banjir site itself shows to any visitor. No login, no paywall, no access control is bypassed.
- **OpenStreetMap**: map tiles and road data, used with the required attribution (ODbL).
- **Telegram Bot API** and an optional **OpenRouter** model: used only if you add your own keys.

How we treat the data:

- **Read-only and gentle.** We only make plain GET requests. The backend calls JPS once per cache period for everyone (camera list every 2 minutes, a snapshot at most once a minute), not once per visitor.
- **Attributed.** Every JPS image is labelled "JPS Selangor public snapshot" with the age of the photo. We do not suggest JPS endorses or operates FloodWay.
- **No secrets taken.** We do not reuse API keys found on JPS pages, and we never touch admin or login endpoints.
- **Not archived.** Snapshots are kept in memory only (refreshed at most once a minute) and are never written to disk.
- **Unofficial API.** JPS publishes no terms or documentation for this API and it can change without notice. Before any real deployment, or any commercial use, we will ask JPS for permission. We will remove or limit the feed on request.
- **No claims we cannot back up.** No accuracy figures are stated, no agency verification is implied, and sample imagery is always labelled.
- **Privacy.** FloodWay does not try to identify people in camera images. Citizen reports and Telegram messages contain only what the user chooses to send. No tokens or keys are committed; secrets live in `backend/.env`, which is git-ignored.
- **Safe use.** This tool supports awareness and is not a replacement for official warnings. Never rely on it alone for life-safety decisions.

If you believe something here breaches a source's terms, please open an issue.

## Run it locally

### Prerequisites

- **Python 3.12** (3.9 will not work)
- **Node.js 20.19 or newer** (Vite 7) and npm
- Git

### 1. Get the code

```bash
git clone https://github.com/malbruhh/floodway-sdp.git
cd floodway-sdp
git checkout dev
```

### 2. Start the backend (port 8080)

Windows PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8080
```

macOS or Linux:

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m uvicorn app.main:app --port 8080
```

API docs: http://localhost:8080/docs. The JPS camera list needs internet access.

### 3. Start the frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and choose **Explore Demo as Citizen**. Then try **JPS Cameras**, **Map** and **Live Vision**.

The frontend expects the backend at `http://localhost:8080`. To use another address, set `VITE_API_BASE` (for example in `frontend/.env.local`).

### Docker (backend only)

```bash
cd backend
docker build -t floodway-backend .
docker run -p 8080:8080 floodway-backend
```

## Configuration

Copy `backend/.env.example` to `backend/.env`. Everything is optional for a local demo.

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_DEFAULT_CHAT_ID` | Enable Telegram alerts and SOS. Without them the app reports `NOT_SENT` |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Enable the AI photo check on citizen reports. Without it the app says "AI check not run" |
| `VISION_WRITE_TOKEN` | Require a bearer token for routes that change state. **Set this for any public deployment** |
| `VISION_SEED_SAMPLES` | `1` loads the five AI-generated sample cameras |
| `CORS_ORIGINS` | Allowed browser origins (default `*`; restrict it when deploying) |

Never put secrets in variables that start with `VITE_`: they are public in the browser bundle.

## Tests

```powershell
powershell -File scripts/check.ps1     # frontend type check + tests + build, backend tests
```

Or separately: `cd frontend && npm run check`, and `cd backend && .venv\Scripts\python.exe -m pytest -q`. At the last run: backend 137 passed, frontend 126 passed.

## Project structure

```
frontend/   React 19, Vite 7, Tailwind 4, Leaflet UI
backend/    FastAPI: Live Vision engine, JPS client, alerts, reports, forecast, telemetry
models/     Forecaster research code (synthetic data) and a legacy ANN; not used by the app
datasets/   Malaysia monthly rainfall and flood CSV (legacy ANN only)
firmware/   ESP32 water-level sensor sketch
docs/       SUMMARY.md (team summary), STATUS.md (technical status), ops/DEMO_RUNBOOK.md
scripts/    check.ps1 and demo helpers
booth/      Demo film sources
```

## Roadmap

Proposed before any real deployment:

- Real rainfall and river inputs from JPS stations, Open-Meteo and MetMalaysia warnings.
- A calibrated AI water level on a small pilot of JPS cameras, cross-checked with the nearest JPS river station.
- A township layer for an SDP development: boundary, cameras, shelters and flood areas.
- An estate-manager page and building or basement risk panel.
- Bahasa Malaysia, alert subscriptions and accessibility fixes.
- Hosting, persistence and hardened write routes.

See [docs/SUMMARY.md](docs/SUMMARY.md) for the full feature table with status.

## Contributing

Issues and pull requests are welcome. Please:

1. Work on a branch from `dev`, not `main`.
2. Run `scripts/check.ps1` before you push.
3. Keep the honesty rules: label sample data, state no unmeasured accuracy, never commit secrets.
4. Read [docs/STATUS.md](docs/STATUS.md) first.

## License

No license has been chosen yet, so all rights are reserved by the authors for now. Ask the team before reusing the code.

## Acknowledgements

- Camera data: JPS Selangor public info-banjir site. FloodWay is not affiliated with or endorsed by JPS.
- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Built for the [Sime Darby Property University Hackathon 2026](https://www.simedarbyproperty.com/universityhackathon/). Not affiliated with or endorsed by Sime Darby Property.
