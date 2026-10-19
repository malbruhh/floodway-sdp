# FloodWay: features, status and data (reference)

Written 2026-10-19 from a code read; tests were not run when this was written. Target event: Sime Darby Property University Hackathon 2026 ("Township of Tomorrow": People and Planet tracks; judging: Impact 25%, Innovation 20%, Feasibility 20%, Strategic fit 15%, Commercial 10%, Pitch 10%; proposal 23 Oct, final submission 11 Nov, pitch day 14 Nov). Companion files: `SDP_ALIGNMENT_SUMMARY.md`, `PROGRESS.md`.

## 1. Features: what each does and outputs

| # | Feature | What it does | Output |
|---|---|---|---|
| 1 | Live Vision | Reads the waterline from a camera frame and converts it to a share of bank height | Level (NORMAL / ADVISORY / WARNING / DANGER), percentage, trend, annotated feed, websocket updates |
| 2 | Camera onboarding | Add a camera by URL or photo, draw the water zone and three lines, test it; private addresses blocked | Saved camera that survives a restart |
| 3 | Alerts | Raises an alert on a level change, with a cooldown | In-app toast, browser notification, alert log, optional Telegram |
| 4 | SOS and family check-in | Broadcasts location and shelter, then confirms arrival within 50 m | Telegram message; `NOT_SENT` when no token |
| 5 | Phase machine | Escalates NORMAL, ADVISORY, WARNING, DANGER and does not downgrade early | Phase label |
| 6 | Forecast (`/predict`, `/twin/state`) | Hand-written formula on level and rainfall | P10/P50/P90 curve to +120 min, time to peak, time to danger |
| 7 | ESP32 telemetry | Converts ultrasonic distance to level | Level and phase, device list, CSV export |
| 8 | Evacuation map | Shelters, flood zones, camera hazards | Interactive map, route bent around flood zones, nearest shelter |
| 9 | Turn-by-turn navigation | Replays a stored OpenStreetMap route with a simulated drive | Steps, ETA, arrival dialog |
| 10 | Citizen reports | Photo, category, location; optional AI photo check | Report feed with status; "AI check not run" when off |
| 11 | Home dashboard | Camera status, district risk, forecast, river trend, capacity | One-glance risk status |
| 12 | Offline sample mode | Sample photos and a "Sample data" chip when the backend is down | Degraded but honest UI |
| 13 | Demo login and profile | Name, emergency contacts, Telegram channel | Local profile |

## 2. Data used and where

| Data | Real / simulated | Used by | State |
|---|---|---|---|
| 5 sample cameras (AI-generated, 12-step water ladder) | Simulated | Live Vision, Home | Active |
| User camera URL or photo | Real | Live Vision | Active; the classical analyser can't read photographic water |
| OpenStreetMap roads via OSRM, pre-computed (`klRoutes.json`) | Real geometry | Map, navigation | Active, 8 shelters only |
| OpenStreetMap tiles | Real | Map | Active |
| 8 demo shelters, 16 hand-placed flood-prone areas | Simulated | Map, SOS, `/shelters`, twin | Active |
| `demoScenario.ts` (river 1.2 m, rain 95 mm/h, 14 sensors, 87% confidence) | Simulated | Home | Active |
| ESP32 ultrasonic distance (`/ingest`) | Real hardware, demo values | Telemetry, phase machine | Code works, demo shows simulated values |
| Citizen photos | Real, user-supplied | Reports, AI photo check (Gemini 2.5 Flash via OpenRouter) | Off without a key |
| `datasets/_MalaysiaFloodDataset...csv` (monthly rainfall by district, 2000-2010) | Real, coarse | Legacy ANN only | Not used by the app |
| Synthetic storm generator | Simulated | Trains the GRU forecaster | Nothing loads the model |
| `terrain.json` (60x60 grid) | Unclear | Meant for the old 3D twin | Orphaned |

Needed for real use (not in the repo, access unverified): live rainfall and river data (JPS gauges, MetMalaysia, Open-Meteo, GloFAS), an official relief-centre register, flood-risk maps, township boundary and building data from SDP, real CCTV feeds.

## 3. Status

| Status | Features |
|---|---|
| Completed | Live Vision on sample cameras (1), camera onboarding (2), alerts (3), SOS (4), phase machine (5), offline mode (12) |
| Completed on mocked data | Home (11), shelters, flood zones and reports (8, 10), forecast (6), ESP32 values (7) |
| Needs refinement | Photographic water on user cameras; `/ingest` signature optional (open to spoofing); `POST /reports` has no write token; `/predict` has no input range validation; Home forecast card contradicts itself; `/shelters/{bad id}` returns 200 with an error body; backend crashes on Python 3.9 (needs 3.12); a water ratio of 1.022 can appear; navigation hardcodes "Jalan Raja Muda"; touch targets under 44 px on Home, Map, Reports, Profile |
| Redundant or orphaned | Legacy Keras ANN and the rainfall CSV; the GRU model (nothing loads it); `terrain.json`; `/studio` house viewer and its dead link; `/twin/state` (duplicates `/predict`, consumer unconfirmed); possibly `geminiVisionService.ts` and `telegramService.ts` (not read); stale `docs/architecture/FEATURES.md` |
| To be implemented | Real rainfall and river input; persistence and hosting; learned water segmenter; township and building model; estate-manager view; resilience metrics; alert subscriptions; Bahasa Malaysia; feedback loop |

## 4. Unfinished work, ranked by what the core needs (sense, warn, evacuate)

1. Real rainfall and river input replacing `demoScenario.ts`.
2. Security and hosting: `/ingest` auth, report write token, `/predict` validation, Python 3.12, hosted backend, persistence.
3. Township layer: boundary, cameras, shelters and zones for one SDP-style township, with a selector.
4. Building and basement risk panel and a read-only estate-manager page.
5. Forecast honesty and wiring: fix the contradictory card, load the GRU behind a fallback with a "synthetic weights" label, resolve the 0.30 m vs 1.50 m scale mismatch.
6. Resilience metrics dashboard and CSV/PDF export.
7. Resident layer: subscribe by township, Bahasa Malaysia, alert feedback, report status, touch targets.
8. Learned water segmenter (needs labelled data).
9. Redundant code cleanup and doc rewrite.

## 5. Six-day plan (one feature per day, 20-25 Oct; proposal due on day 4)

| Day | Feature | SDP fit |
|---|---|---|
| 1 | Live weather feed (Open-Meteo / GloFAS) replacing the demo rainfall and river numbers, plus the `/ingest`, report-token and `/predict` fixes and a hosted backend | Safety, climate resilience |
| 2 | Township layer: one JSON file, township selector, map scoped to it | Township scale |
| 3 | Building and basement risk panel and estate-manager page | Safety and security |
| 4 | Resilience dashboard and export, with a "loss avoided" estimate that shows its formula and is labelled illustrative | Impact, commercial value |
| 5 | Resident layer: subscribe by township (Telegram), Bahasa Malaysia toggle, "was this alert useful?", report status | Accessibility and inclusion |
| 6 | Forecast hardening (fix contradictory card, GRU behind a fallback with an honest label), README/About rewrite, end-to-end demo rehearsal | Feasibility, evidence |

Risks: Open-Meteo/GloFAS access is untested (`nb1_data.py` has never been run); days 3 and 4 are the likeliest to slip; any "loss avoided" figure needs a source or an "illustrative" label.
