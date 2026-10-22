# FloodWay: status (read this first)

Updated 2026-10-21. Sime Darby Property University Hackathon: proposal, prototype, slides and video are all submitted 23 Oct (slides and video are done); pitch day 14 Nov. The submitted prototype is what judges see: changes after 23 Oct are for the pitch demo only, so do not break the demo path.

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
| Resilience page: events caught, lead time, alerts sent, households routed, CSV export, loss-avoided estimate | Real code and a durable log; inputs are the sample cameras and simulated drives (tagged `simulated`). Loss figure is illustrative |
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

## Before the 23 Oct submission, then for the 14 Nov pitch (ranked by the judging weights)

Weights: Impact and sustainability 25%, Innovation 20%, Feasibility 20%, Strategic fit 15%, Commercial value 10%, Team, evidence and pitch 10%. Each item shows what it scores. Slides and video are done. Only what is built and working in the prototype by 23 Oct can be claimed in them; anything after that is pitch-day extra.

1. ~~Proposal write-up, slides and demo video~~ done (impact case, honesty lines, demo recording). Re-check the slides against the prototype before submitting: every claim must match what the app does.
2. ~~Resilience dashboard and "loss avoided" estimate~~ done 2026-10-22 (see Done). Follow-up: replace the placeholder assumptions with sourced figures. Mobile bottom nav now has 7 tabs (flex width, "Live Vision" shortened to "Live"); checked at 375 px.
3. **Hand-calibrate 3 to 5 JPS cameras** with a dry reference frame (innovation 20%, feasibility 20%). The only item that turns the demo from generated images into a real reading on a real river. Only counts toward the 23 Oct submission if it works in the prototype by then; otherwise it is a pitch-day demo item.
4. ~~Township layer~~ done 2026-10-22 (see Done). Feeds item 5.
5. ~~Estate-manager page and building/basement risk panel~~ done 2026-10-22 (see Done).
6. **Real rainfall inputs** (feasibility 20%): Open-Meteo and MetMalaysia warnings into the forecast, still labelled a formula.

Done:
- ~~Estate page~~ (2026-10-22): `/estate` (`pages/EstatePage.tsx`, `components/estate/*`, pure logic in `lib/estate.ts`, plan in `docs/PLAN-ESTATE.md`). Township selector; water level from that township's cameras; recent alerts; flood events and median lead time (from the resilience summary); open citizen reports; building/basement risk panel (nearest illustrative flood area vs the camera-driven scenario; a basement raises one level; ground-floor height never lowers it; inputs saved in the browser). No new backend route. Desktop sidebar only, not in the 7-tab mobile nav. `Scenario`, `stateOf` and `radiusOf` moved to `lib/floodScenario.ts` (Leaflet-free); `FloodProneLayer` re-exports them. Risk is a rule-based estimate, not an engineering assessment. Backend contract test: `backend/tests/test_estate_contract.py`.
- ~~Township layer~~ (2026-10-22): `data/townships.json` (id, name, centre, zoom, bbox; 3 KL townships plus a KL-wide entry), `lib/townships.ts` (`townshipContents` picks origins, flood areas, shelters and cameras inside the bbox, so each kind keeps one list). Map has a Township selector that flies to the area and shows counts; it does not yet filter the markers or routes. Boundaries are rough boxes, not surveyed.
- ~~Resilience dashboard~~ (2026-10-22): `/resilience` page, `backend/app/vision/events.py` (JSONL event log in `data_dir/events.jsonl`, episode and lead-time maths, `engine_start` marker closes open episodes as "interrupted"), `backend/app/routes/resilience.py` (`GET /api/v1/resilience/summary`, `GET /export.csv?kind=episodes|alerts|routes`, `POST /route-events` with write token, rate limit and 10 min dedupe). The dispatcher records sent, failed and suppressed per channel; Telegram HTTP errors now count as failed. Frontend logic is in `lib/resilience.ts`. Route starts and arrivals are logged from the Map drive and the navigation page. All events are tagged `simulated` on the demo. Definitions are in the `events.py` docstring. Loss avoided = episodes with lead time at least N min x households x response rate x value, with editable placeholder inputs.
- ~~JPS camera layer~~: `backend/app/services/jps_client.py` (cache, image proxy, host lock), `/api/v1/jps/*`, `/jps` page, map dots. Map dots were fetched but not seen on screen: zoom the Map out to Selangor and check.
- ~~Fix 1~~ test run is real: `backend/.venv` is Python 3.12, `asyncio_mode` line removed from pytest.ini (no async tests), check.ps1 green.
- ~~Fix 2~~ per-device sensor thresholds, `/ingest` rejects stale (400) and replayed (409) readings, PhaseMachine steps down one level at a time, forecaster takes the device danger line. Seed reading is now 0.80 m.
- ~~Fix 3~~ all-clear event (`kind: "all_clear"`) when a camera steps from WARNING/DANGER to below WARNING: sent to Telegram without cooldown, shown green in Recent alerts and the toast.
- ~~Fix 4~~ citizen reports save to `POST /api/v1/reports` (write token, rate limit, field limits, client may only claim UNDER_REVIEW or AI_VERIFIED, no photo stored server-side); the browser falls back to device-only with a visible note.
- ~~Fix 5~~ dead code removed: AppContext `waterLevelM`/`floodPhase`, `fetchTwinState`, backend `/sos` routes and notifier SOS/check-in templates (and their test), unused config values.
- ~~Fix 6~~ Map flood scenario follows the highest camera level (`scenarioFromLevel`); manual Normal/Warning/Danger still overrides, an Auto button returns; camera level changes no longer reset a drive in progress.
- ~~Cheap fixes~~ (2026-10-21): `/ingest` needs the HMAC signature, `/predict` range-checked, unknown shelter returns 404, Home forecast card no longer says "no sensor is reporting" about a seeded value.

After submission, if time: Bahasa Malaysia toggle, alert feedback, touch targets under 44 px, hosting, GRU wiring, learned water segmenter.

## Known problems

- Navigation hardcodes "Jalan Raja Muda"; the Home route is a straight-line detour, the Map route is road-based.
- Leaked OpenRouter key and Telegram bot token are still not rotated.
- `models/ml_pipeline` (GRU, synthetic data) and `models/legacy_ann` are not used by the app.

## Run and check

- Backend: `cd backend; python run.py` (Python 3.12, port 8080). Env template: `backend/.env.example`. Never read `backend/.env` into chat.
- Frontend: `cd frontend; npm install; npm run dev` (port 5173).
- All checks: `powershell -File scripts/check.ps1`. Last run (2026-10-22, after the Estate page): backend 204 passed, frontend 174 passed and build passes.
- Demo script and "what is real" table: `docs/ops/DEMO_RUNBOOK.md`.
