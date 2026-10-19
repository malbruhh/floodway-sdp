# FloodWay: feature summary and SDP alignment plan

Read this first in a new chat. Written 2026-10-18 from a code read plus a live smoke test. Companion to `PROGRESS.md` (status board) and `/AGENTS.md` (rules).

**Open item:** the Sime Darby Properties (SDP) brief ("SDP University Hackathon Briefing with Student Nationwide.pdf", Google Drive id `1ONxlesTjG89nAjVxcWgKoUgOyqyuQijO`) could NOT be read (sign-in required). Everything under "SDP alignment" uses the three themes the user named, not SDP's real targets. Ask the user to paste the PDF text or drop the file in the repo, then re-check the plan.

## 1. What the project is
FloodWay 2.0: flood early warning and evacuation prototype for Kuala Lumpur and the Klang Valley (Sime Darby Property University Hackathon 2026). FastAPI backend (in-memory and file state) plus React 19 / Vite / Tailwind 4 frontend. All data is simulated or AI-generated sample imagery. No external cloud service is called.

## 2. Feature list

### Built and working (verified 2026-10-18)
| Feature | Where |
|---|---|
| Live Vision: water level from camera frames, 4 levels (NORMAL / ADVISORY / WARNING / DANGER), hysteresis, trend, alert cooldown | `backend/app/vision/` |
| 5 online sample cameras (AI-generated 12-rung image ladder) plus 1 offline | `vision/sample_media/`, `seed.py` |
| User cameras by URL or photo upload, calibration wizard, SSRF guard | `/api/v1/vision/cameras*`, `url_guard.py`, `components/live/onboarding/` |
| In-app and Telegram alerts, SOS broadcast and check-in (reports `NOT_SENT` honestly without a token) | `routes/alerts.py`, `routes/sos.py` |
| Evacuation map: 8 demo shelters, 16 flood-prone areas, stored OSM routes, turn-by-turn page | `MapPage`, `NavigationPage`, `kl_shelters.json` |
| Citizen reports plus AI photo check (OpenRouter, Gemini 2.5 Flash; off without a key) | `routes/reports.py`, `routes/ai_check.py` |
| ESP32 sensor ingest, device list, CSV export | `routes/telemetry.py`, `firmware/` |
| Rule-based 2 h forecast (P10/P50/P90), labelled "not a trained model" | `services/forecaster.py` |
| Home, Live, Map, Reports, Profile pages; demo login (Luqman) | `frontend/src/pages` |
| Pitch assets: poster, film, pitch script, public demo script | `docs/product`, `booth/`, `scripts/public-demo.ps1` |
| Tests: backend 130 passed, frontend 123 passed | `backend/tests`, `frontend/src/__tests__` |

### Partial, designed only, or not built
- GRU forecaster: trained on synthetic data, nothing loads it (`models/ml_pipeline`).
- Learned water segmenter (`analysis/yolo_seg.py`): not built. The classical analyser can't read photographic water on user cameras.
- Hosted backend: none (laptop plus Cloudflare tunnel, new URL on each restart).
- Persistence: in-memory and file only. No database.
- Real data: no government camera feeds, no live rainfall or river data.
- 3D digital twin: `/simulation` redirects to `/live`; `/studio` house viewer remains.
- Phone touch targets under 44 px on Home, Map, Reports, Profile.

## 3. Known bugs and fixes (priority order)
1. `backend/.venv` is Python 3.9; backend crashes (`float | None` in `services/phase_machine.py`). Use Python 3.12 (Dockerfile) and recreate the venv. README says 3.13.
2. `/api/v1/predict` ignores its request body (same output for -5 m / 99999 mm/h).
3. Home forecast card contradicts itself after a sensor reading ("starting 3.20 m, no sensor is reporting", "reaches 1.50 m").
4. `/api/v1/ingest` is unauthenticated: any `device_id` can change the global flood state (`sig` optional).
5. `POST /reports` has no write token, and a photo-less report gets a stock image URL.
6. Docs contradict the app: README claims (now rewritten) listed A*, a hosted GRU and cloud vision; About box says routes are "straight-line" while the map says "Roads from OpenStreetMap"; `/navigation` hardcodes "Jalan Raja Muda".
7. `/studio` "Return to Simulation" link is dead.
8. `GET /shelters/{bad id}` returns 200 with an error body (should be 404).
9. A water ratio of 1.022 appears in one reading; cap at 1.0.
10. Rotate the exposed OpenRouter key and Telegram bot token (still open).

## 4. SDP alignment (provisional: themes only)
| Theme | Supported today | Gap |
|---|---|---|
| Smart township and community integration | CCTV-based flood sensing, optional ESP32 nodes, shelter map and routing, citizen reports | No township or building model, no SDP data, no BMS link, KL sample data only |
| ESG, sustainability, carbon | Climate-adaptation and safety value, low-hardware design | No ESG or carbon metrics, no resilience dashboard, unsourced pitch loss figures |
| Tenant and customer experience | Mobile UI, in-app and Telegram alerts, family SOS, reporting | No tenant or property accounts, no Bahasa Malaysia, no feedback channel, accessibility and touch targets |

## 5. Features that can be built in about 6 days
**Day 0-1 foundation:** fix bugs 1-3 and 6; host the backend (Render, Fly or Cloud Run) with `VISION_WRITE_TOKEN` set.

**Day 1-3 smart township:**
- Township layer: a JSON file of boundary, shelters, cameras and flood-prone areas, plus a township selector. Use SDP township names as demo data. Reuses `kl_shelters.json` and the map code.
- Asset-risk panel: per building or basement, show the nearest camera level and a threshold alert (the 110 cm electrical shut-off idea).
- Estate-manager page: cameras, active alerts and open citizen reports for one township (read-only).

**Day 3-4 ESG:**
- Resilience dashboard from existing alert and reading history: events detected, warning lead time, alerts sent, reports resolved.
- "Loss avoided" estimate with a visible formula and assumptions, labelled illustrative. Do not reuse the unsourced pitch figures.
- CSV or PDF export for ESG reporting (extend the `/export.csv` pattern).
- Skip carbon accounting: FloodWay is adaptation, not mitigation.

**Day 4-5 tenant experience:**
- Subscribe to alerts by township or address (existing Telegram path).
- Bahasa Malaysia toggle for alerts and key screens.
- "Was this alert useful?" feedback endpoint, and a report status the resident can follow (received, under review, published).
- Phone touch-target fix.

**Day 5-6 polish:** rewrite README and About text to match the code; run `scripts/check.ps1`; rehearse one end-to-end demo; add a "pilot with SDP" slide.

**Do NOT attempt in 6 days:** real camera feeds, a trained segmenter, GRU wiring. They need data or accounts you won't have, and `AGENTS.md` forbids claiming them.

## 6. Run notes
- Backend: Python 3.12, `pip install -r backend/requirements.txt`, `cd backend; python -m uvicorn app.main:app --port 8080`. Env template: `backend/.env.example`.
- Frontend: `cd frontend; npm install; npm run dev` (5173). `VITE_API_BASE` defaults to `http://localhost:8080`.
- Checks: `powershell -File scripts/check.ps1`.
- `backend/.env` holds secrets. Do not read it into chat.
- The 2026-10-18 smoke test posted one report and one sensor reading (3.2 m, DANGER). Check `backend/data` for leftover state before demoing.
