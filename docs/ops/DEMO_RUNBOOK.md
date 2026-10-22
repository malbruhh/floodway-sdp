# FloodWay demo runbook

For the Sime Darby Property University Hackathon: proposal, prototype, slides and video submitted 23 Oct, pitch day 14 Nov. Written from the app as it is on branch
`demo-polish`. Everything here was checked against the running app; where something was not, it says so.

---

## 1. What is real, what is simulated, what is not built

Say this plainly. A judge who asks "is that real?" must get a straight answer.

| | Feature | What to say |
|---|---|---|
| **Real** | Camera water-level analysis pipeline | The software is real: it captures frames, finds the water, converts the waterline to a level, applies hysteresis, raises alerts and pushes updates over a websocket. It runs on images. |
| **Real** | User-added cameras | You can add a snapshot or stream URL, draw the water zone and three lines on the live frame, test it and save it. Private addresses are blocked. Cameras survive a restart. |
| **Real** | Offline behaviour | If the server dies the page says so within a second, keeps retrying, and recovers on its own when the server returns. |
| **Real** | Alerts, routes bending around zones | A new warning raises a toast, a browser notification and an alert entry. The map route is bent around camera flood zones. The route is approximate (see below). |
| **Simulated** | The five sample cameras and their pictures | AI-generated base photos with a **drawn water overlay**. They move on a timer. They are labelled SAMPLE. They are not real footage and not from any agency. |
| **Simulated** | River level, rainfall, sensor counts | Demo scenario numbers (`frontend/src/config/demoScenario.ts`). The header says "simulated". |
| **Simulated** | The forecast | A hand-written formula on a simulated starting level. **Not a trained model, not validated.** The page says so permanently. |
| **Simulated** | Shelters, flood-prone areas, citizen reports | Demo data (the 16 flood-prone areas are hand-placed around known low spots, not a DBKL/JPS map; the 8 relief centres are not an official register). The two starter reports and their photos are examples, not incidents at the places named. |
| **Real data, simulated drive** | Evacuation route (Map) | Road geometry and turn steps come from OpenStreetMap through the public OSRM server, computed in advance and stored. The route chosen avoids the flood areas it can; the car on screen is a sped-up simulation, not a tracked position. No live traffic. |
| **Approximate** | Evacuation route (Home) | A straight line bent around camera flood zones. Not road-aware. The UI says "approximate". |
| **Real, if wired** | JPS Selangor public camera snapshots | Real images from an unofficial public API (see `docs/STATUS.md`). Label them "JPS Selangor public snapshot". AI level only on hand-calibrated cameras. The five sample cameras are still not real or government feeds. |
| **Real code, simulated inputs** | Resilience page (`/resilience`) | Events, lead times, alerts sent and households routed are counted from a durable event log (`data/events.jsonl`, survives restarts). On the demo the events come from the sample cameras and the in-app drives, so every row is tagged `simulated`. "Alerts sent" counts only external channels (Telegram); with no bot token it reads 0. The loss-avoided figure is an **illustrative** formula with editable placeholder assumptions, not a measured saving. |
| **Not built / not claimed** | Verification by an agency, certification, any external cloud AI service | Nothing verifies reports. No external cloud service is called by this demo. |
| **Not built / not claimed** | Real IoT sensors in the demo | The code can read a USB sensor, but the demo shows simulated values. |

**Accuracy figures.** 95.34% is segmentation pixel accuracy on the model's test set. It is **not** forecast accuracy. 100%
route avoidance is a simulation result only. The classical analyser's "20 of 20" on the sample frames proves the pipeline
runs; it does **not** prove it reads realistic water, because those frames are a drawn rectangle (see section 6).

**Never say:** "live government CCTV", "verified by JPS / NADMA / APM", "powered by a cloud AI service" (the forecast is a
formula), "AI verified" for a report whose AI check did not run, "certified".

---

## 2. Start the demo

```
# backend (one worker only)            cd backend ; python run.py                 -> http://localhost:8080
# frontend                             cd frontend ; npm run dev -- --host --port 5173
# one-command check before you leave   powershell -File scripts/check.ps1
```

`backend/.env` should have `VISION_SEED_SAMPLES=1` (cold start shows five cameras). Leave `VISION_WRITE_TOKEN` empty for a
local demo. Set it for any public deployment (see section 7).

Open the app. The demo user is signed in already; "Explore Demo as Citizen" on the welcome page does the same.

---

## 3. Five-minute pitch: click path

1. **Welcome page.** Read the "About this demo" box out loud in one sentence: sample imagery, simulated numbers, nothing verified
   by an agency. (30 s)
2. **Home.** The red or amber block is the overall level, computed from the cameras. Point at "Data age: Fresh" and the chip
   "Sample cameras (simulated)". Point at the single button "Go to nearest refuge". (45 s)
3. **Live Vision.** Open it from the cameras card. The most urgent camera is selected. Say what the three lines mean (normal,
   warning, danger) and that the AI converts the waterline into a share of bank height. Wait for a level change: the toast, the
   browser notification and the alert entry appear on their own. (90 s)
4. **Demo loop** (Klang camera). Press "Demo loop" to show the 15 s rise. Say the loop is a labelled sample, not tied to the readings. (20 s)
5. **Show evacuation routes.** The map opens focused on that camera. Point at the flood zone, the approximate route, and read
   the legend (collapsed, tap to open). Pick a start point, switch the scenario to Danger, show that Route A crosses the fewest flooded areas, press Start turn-by-turn and say the drive is simulated. (60 s)
6. **Reports.** The demo-data note is at the top. Say reports are unverified unless marked, and that no agency uses the demo review desk. (30 s)
7. **Close** with the table in section 1: real, simulated, not built. (15 s)

## 4. Fifteen-minute semi-final: add

- **Add a camera.** Use a public snapshot URL you tested the day before (a plain JPEG). Draw the zone and lines with the
  starter-zone button, run the test, save. Show the new camera analysing.
- **Cold restart.** Stop and restart the backend with the page open. The page says "Server unreachable, retrying", then
  recovers by itself. Your added camera is still there. (Samples are re-seeded; readings restart.)
- **Honesty slide.** Show `check_frames.py` and `check_realism.py`. Say the first passes and the second does not, and why. That
  is the strongest credibility move you have.
- **Write protection.** Say the server can require an operator token for changes and show the 401 from `curl` if asked.

## 5. Pre-load and fallbacks

**Before every session:** backend running with seeded cameras; one browser tab each on `/home`, `/live`, `/map`; zoom 100%;
notifications allowed for the site; a screen recording of the full five-minute path saved locally.

| If this fails | Do this |
|---|---|
| Wi-Fi drops | The app runs locally. Map tiles will not load (OpenStreetMap), so use the screenshots in `docs/screenshots/demo-after/`. Fonts fall back to the system font. |
| Map tiles blocked | OpenFreeMap is a keyless alternative (check its terms), set in `frontend/src/config/mapConfig.ts`. Or show the screenshots. |
| Backend down | The pages show "Backend unreachable" and run on labelled sample data. Say so; do not pretend it is live. Restart it. |
| Video does not play | The "Demo loop" button is hidden when the file is missing. Show the four level frames instead. |
| Telegram message fails | Do not demo the send live. Show the on-screen alert. |

---

## 6. Known weaknesses (so nobody is surprised)

1. **The sample water is a drawn rectangle.** The water-level frames Gemini produced for Plan A are the NORMAL photo with a flat
   rectangle drawn over the channel. It is visible in thumbnails and in the demo loop. `check_realism.py` flags 15 of 15.
   Regenerate them with a real image-edit step (instructions are in `docs/PLAN_A_GEMINI_MEDIA.md`, "Defect found"). Until then, be
   upfront that the water overlay is synthetic.
2. **The analyser is validated only on those synthetic scenes.** Do not claim real-world accuracy.
3. **`/studio` (3D)** logs a `THREE.Clock` deprecation from inside a library. Harmless; not fixable in app code.
4. **IoT ingest** (`/api/v1/telemetry/ingest`) now rejects unsigned readings (401) for devices with a secret. The default device
   secrets are still in `backend/app/config.py`. Do not expose it publicly.
5. **Report photos** are example photographs that do not show the places named. Replace them before any public showing.
6. **Routes are stored, not live.** Only the 7 start points and 8 relief centres have road routes; there is no traffic. Alternatives come from OSRM and some pairs have only one.

## 7. Before any public deployment

- Set `VISION_WRITE_TOKEN` in `backend/.env`. Enter it under Profile, Operator access.
- **Rotate the secrets that were in the browser build:** the Telegram bot token (BotFather) and the OpenRouter key. They were
  `VITE_` variables, so any earlier build contained them. Put the new values in `backend/.env` only, and delete the old
  `VITE_TELEGRAM_*` and `VITE_OPENROUTER_*` lines from `frontend/.env`.
- Set the Open Graph image to an absolute URL in `frontend/index.html`.
- Check the OpenStreetMap tile usage policy.
