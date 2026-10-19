# FloodWay: status (read this first)

Updated 2026-10-19. Sime Darby Property University Hackathon: proposal 23 Oct, prototype and final submission 11 Nov, pitch day 14 Nov. A working prototype is enough; it does not need to be a finished system.

**What it is:** a flood early-warning and evacuation prototype for the Klang Valley. Cameras give a water level, the app alerts residents and routes them to shelter around flooded roads. FastAPI backend (in-memory and file state) and a React 19 / Vite / Tailwind 4 frontend.

## What works, and what is simulated

| Feature | State |
|---|---|
| Live Vision: camera frame to level (NORMAL / ADVISORY / WARNING / DANGER), trend, alerts, websocket | Works, on 5 AI-generated sample cameras |
| JPS Selangor camera wall (`/jps`) and map dots: real public snapshots, status and age, image only | Works (built 2026-10-19; 80 cameras shown, 77 online when checked). Needs the backend running; no AI level |
| Add your own camera (URL or photo), calibration wizard | Works; reads flat synthetic water only, not photos of real water |
| In-app, browser and Telegram alerts; family SOS and check-in | Works (Telegram needs a bot token, else `NOT_SENT`) |
| Evacuation map and turn-by-turn | Works; 8 demo shelters, 16 hand-placed flood areas, stored OpenStreetMap routes |
| Citizen reports and AI photo check | Works; AI check needs `OPENROUTER_API_KEY`, else "not run" |
| ESP32 sensor ingest, CSV export | Code works; demo shows simulated values |
| Forecast | A formula, labelled "not a trained model" |
| Home dashboard numbers | Simulated (`frontend/src/config/demoScenario.ts`) |

## Live JPS Selangor feed: how it fits

The JPS Selangor public API (`infobanjirjps.selangor.gov.my/JPSAPI/api/`) is **real and reachable** (checked 2026-10-19): `CCTVS/GetCCTVsByDistrict/{id}` returns id, name, lat/lon (as strings), `isOnline`, `lastUpdate`, `imageUrl` (plain `http` JPEG, about 60 KB). Rainfall and river summaries return **counts only** (e.g. 95 river stations, 1 warning), not metres or mm.

| Need | Today | What the JPS feed changes |
|---|---|---|
| Real data instead of simulated | None | Cameras, camera status and station counts are real |
| Fetching a snapshot URL | `SnapshotSource` already does it (public hosts pass the SSRF guard; `provider="public"` and `feed_refresh_s` already exist) | Reuse it; add one `jps_client` that caches the list and proxies images |
| Browser access | n/a | Must go through our backend: the API's CORS allows only their own origin, and the images are `http` (blocked as mixed content on an `https` site) |
| Reading water level from the photo | Fails on real photos (classical analyser); `ReferenceDiffAnalyzer` needs a dry reference frame and a hand-drawn calibration per camera | **Not solved.** Show every JPS camera as image plus status; give an AI level only to 3 to 5 cameras you calibrate by hand |
| Rainfall and river numbers into the forecast | Simulated | Summary endpoints give counts only; per-station endpoints are unchecked. Use the counts as a river-status panel; keep the forecast labelled a formula |
| Stale and bad data | n/a | Show age of last frame; drop cameras with `isEnabled` false or lat/lon 0,0 |
| Permission | n/a | Undocumented API, no stated terms: attribute "JPS Selangor public snapshots", poll no faster than every 60 to 120 s, say in the proposal that access is unofficial |

## Fix before the 23 Oct proposal (in order)

1. ~~JPS camera layer~~ done: `backend/app/services/jps_client.py` (cache, image proxy, host lock), `/api/v1/jps/*`, `/jps` page, map dots. Map dots were fetched but not seen on screen: zoom the Map out to Selangor and check.
2. Hand-calibrate 3 to 5 JPS cameras with a dry reference frame so at least a few show a real AI level.
3. Township layer: one JSON file of boundary, cameras, shelters and flood areas, with a selector.
4. Estate-manager page (alerts and open reports for one township) and a resilience dashboard (events, lead time, alerts sent), plus a "loss avoided" estimate that shows its formula and is labelled illustrative.
5. Cheap fixes a judge could trip on: require the signature on `/ingest`, range-check `/predict`, fix the Home forecast card that contradicts itself, return 404 for an unknown shelter.
6. Proposal write-up and a short screen recording of the demo path.

After 23 Oct if time: Bahasa Malaysia toggle, alert feedback, touch targets under 44 px, hosting, GRU wiring, learned water segmenter.

## Known problems

- `backend/.venv` is Python 3.9 and cannot run the app (`float | None`). Use Python 3.12.
- `POST /reports` has no write token; a photo-less report gets a stock image.
- Navigation hardcodes "Jalan Raja Muda"; the Home route is a straight-line detour, the Map route is road-based.
- Leaked OpenRouter key and Telegram bot token are still not rotated.
- `models/ml_pipeline` (GRU, synthetic data) and `models/legacy_ann` are not used by the app.

## Run and check

- Backend: `cd backend; python run.py` (Python 3.12, port 8080). Env template: `backend/.env.example`. Never read `backend/.env` into chat.
- Frontend: `cd frontend; npm install; npm run dev` (port 5173).
- All checks: `powershell -File scripts/check.ps1`. Last run: backend 130 passed, frontend 123 passed.
- Demo script and "what is real" table: `docs/ops/DEMO_RUNBOOK.md`.
