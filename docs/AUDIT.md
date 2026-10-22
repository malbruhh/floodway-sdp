# FloodWay: system audit (2026-10-21)

A full pass over the backend and frontend code, then each feature compared with deployed systems. Sources are listed at the end of each section. Most are news or project pages, not agency specs; where a fact could not be confirmed it says so.

## 1. How the blocks actually connect

The confusing part: **there are four separate "how high is the water" systems, and they do not talk to each other.**

```
                    ┌──────────────────────────── FRONTEND ────────────────────────────┐
 Vision engine ──WS──> Home hero, Live Vision, map camera hazards, browser notifications
 (5 sample cams)       │                                                              │
   └─ Telegram (one default chat)                                                     │
                                                                                      │
 ESP32 /ingest ─> PhaseMachine ─> /twin/state ──> only the forecast card on Home      │
 (metres)                                         (IoT popover shows hardcoded values)│
                                                                                      │
 AppContext waterLevelM = 1.20 (never changes; floodPhase never read) — dead          │
 Map "scenario" toggle normal/warning/danger (picked by hand) ─> flood areas on map   │
                                                                                      │
 JPS cameras ─> /jps wall + map dots (image only, no level)                           │
 Citizen reports ─> browser memory only (backend POST /reports is never called)       │
                    └──────────────────────────────────────────────────────────────────┘
```

| Block | Feeds | Fed by | Problem |
|---|---|---|---|
| Vision engine (`backend/app/vision/engine.py`) | Home hero, Live Vision, map hazards, Telegram, browser alerts | Sample cameras, user cameras | The only block that drives the app end to end. Good. |
| Telemetry + PhaseMachine (`routes/telemetry.py`, `services/phase_machine.py`) | `/twin/state` forecast | ESP32 `/ingest` | Its level and phase never reach the Home hero, map or alerts. `/devices` and `/export.csv` are not called by the frontend. |
| Forecast (`services/forecaster.py`) | Home forecast card | Telemetry level + rainfall query param (default 95 mm/h, simulated) | Not linked to any camera. Danger line hardcoded 1.50 m. |
| AppContext level (`frontend/src/contexts/AppContext.tsx`) | Nothing | Nothing | Dead: `setWaterLevelM` and `floodPhase` are never used. Third threshold set (0.70 / 1.15 / 1.50). |
| Map scenario (`components/map/FloodProneLayer.tsx`) | Route ranking | User toggle | Not driven by camera or sensor levels. |
| Citizen reports (`AppContext.addReport`) | Report feed only | Report modal | Lost on refresh, not shared between users, do not feed routing or alerts. |
| SOS / check-in | Telegram | Frontend-built text via `/alerts/telegram` | Backend `/sos/broadcast` and `/sos/checkin` exist but are unused (duplicate templates). |

**One-line fix of the mental model:** cameras are the real input today; everything else is either a demo panel or a backend route nobody calls.

## 2. Bugs and inconsistencies found in the code

1. **Per-device thresholds ignored.** `config.py` gives `fw-node-02` warning 1.30 m / danger 1.65 m, but `machines` is `defaultdict(PhaseMachine)` so every device uses 1.20 / 1.50 (`routes/telemetry.py:15`).
2. **Station boots in WARNING.** The seed reading is 1.20 m, exactly the warning line (`telemetry.py:21`).
3. **PhaseMachine de-escalation.** DANGER can jump straight to NORMAL; readings in the ADVISORY band count toward "safe". The `forecast_p50_m` input is never passed in. (The vision `LevelTracker` does this correctly: one step at a time.)
4. **Replay of signed sensor readings.** `MAX_SKEW_SECONDS` is imported but never checked, so a captured signed reading can be resent, and old timestamps are accepted. Default device secrets are in `config.py`.
5. **Three threshold sets** for the same river: backend 1.20 / 1.50, AppContext 0.70 / 1.15 / 1.50, per-device config. Vision uses a 0–1 ratio. Nothing reconciles metres and ratio.
6. **Telegram relay.** The browser writes the message text and may pick any `chat_id`; the server sends it. With no `VISION_WRITE_TOKEN` it is an open relay (rate-limited); with the token set, SOS/check-in in the browser fail until an operator token is typed in Profile. All camera alerts go to one default chat; there is no per-user subscription.
7. **No all-clear.** Alerts fire only on escalation to WARNING/DANGER. Nothing is sent when water drops back.
8. **Alert repeats in the demo.** Sample cameras cycle every 3–4 min; after the 300 s cooldown each WARNING/DANGER crossing sends another Telegram message.
9. **Review desk open to everyone.** Any signed-in user can approve or reject reports (`ReportFeed.tsx:171`). AI-checked reports get status `AI_VERIFIED`, a word judges may read as "verified".
10. **Shelters.** Capacity and OPEN status are static; route ranking ignores capacity, so a full centre can still be suggested.
11. **Browser notifications** work only while the tab is open (no service worker / push).
12. **Dead code:** `fetchTwinState` in `services/api.ts` (its fallback even says DANGER at 1.20 m), backend `/sos/*`, `/predict`, `/devices`, `/export.csv`, `/reports` POST from the UI's point of view.
13. **`scripts/check.ps1` fails on this machine:** it picks `backend/.venv` (Python 3.9) and the 3.12 install has no pytest. The "140 passed" in STATUS.md cannot be reproduced right now. Frontend check passes.

## 3. Feature by feature against real systems

### 3.1 Camera water-level reading (Live Vision)
- **FloodWay:** frames → water ratio between hand-drawn lines → NORMAL/ADVISORY/WARNING/DANGER with hysteresis, median of a 5-frame burst, confidence, trend. Works on AI-generated sample frames only.
- **Real world:** USGS HIVIS (840+ sites); in a USGS field test only 38–92% of images were usable, and 79–99% of usable ones were within ±0.10 ft of the gauge. UPM (Malaysia) CCTV + LiDAR work reports Spearman 0.92 against sensors. Systems map pixels to surveyed elevation and validate against a co-located gauge.
- **Missing / refine:** an explicit "image unusable" state (night IR, glare, obstruction) instead of a forced reading; output in metres or "% to JPS danger level", not just ratio; validation against the nearest JPS station; camera-shift detection.
- Sources: usgs.gov/publications/practical-application-time-lapse-camera-imagery-develop-water-level-data-three · link.springer.com/10.1007/s11069-024-06503-6

### 3.2 JPS camera wall and map dots
- **FloodWay:** 80 Selangor cameras, cached list (120 s) and image proxy (60 s), age and online status shown.
- **Real world:** Public InfoBanjir publishes levels and rainfall (~15 min). Shah Alam council runs its own CCTV. NYC DOT requires a data-sharing agreement for camera reuse.
- **Missing / refine:** link each camera to its nearest JPS river station so image and number sit together; written permission before any deployment (already stated in SUMMARY.md).
- Sources: thevibes.com/articles/news/113002 · nyc.gov/html/dot/html/motorist/atis.shtml

### 3.3 Alert levels and delivery
- **FloodWay:** four levels with hysteresis; in-app, browser notification, Telegram to one chat; 300 s cooldown.
- **Real world:** JPS uses Normal / Waspada / Amaran / Bahaya with **per-station** thresholds (e.g. Sg Rasau danger 3.0 m). NADMA SMS system (Nov 2024) has telcos send free SMS to at-risk areas (5M+ in 2023/24). CAP-standard alerts carry an expiry, and updates/cancels reference the earlier alert.
- **Missing / refine:** per-station thresholds (bug 1), all-clear and expiry (bug 7), area targeting (subscribe to a township, not a global chat), Bahasa Malaysia text, use the JPS level names.
- Sources: berita.rtm.gov.my/?p=664138 · malaymail.com/news/malaysia/2024/11/16/… · docs.api.met.no/doc/metalerts/CAP-v2-profile

### 3.4 Family SOS and check-in
- **FloodWay:** one-tap SOS and arrival check-in posted to Telegram; arrival comes from a simulated drive.
- **Real world:** Meta Safety Check (I'm safe / not in area, friends notified); Google Personal Safety and Life360 escalate automatically when the person does not respond; Malaysia's SaveMe 999 sends GPS to 999 operators.
- **Missing / refine:** a no-response escalation timer, "not in the affected area" option, a "Call 999" button next to SOS (hand-off, not replacement), family group membership instead of one chat.
- Sources: about.fb.com/news/2014/10/introducing-safety-check · support.life360.com/hc/en-us/articles/30958565214359 · nst.com.my/amp/news/nation/2025/11/1316569

### 3.5 Evacuation routing and shelters
- **FloodWay:** pre-computed OSRM routes from fixed demo origins to 8 demo shelters, ranked by number of flood zones crossed; zones come from the manual scenario toggle plus camera hazards.
- **Real world:** JKM has ~10,000 potential PPS but opens them only on NADMA's direction; InfoBencana lists *activated* PPS and evacuee counts. Road closures come from JKR plus public complaints. No confirmed live per-centre capacity feed.
- **Missing / refine:** route only to "activated" centres and show capacity as "unknown / last updated" rather than a live-looking count; skip full centres; feed citizen reports into flood zones; drive the scenario from camera levels instead of a hand toggle; label underpasses as high-risk.
- Sources: malaysia.gov.my/en/topics/jkm-infobencana-portal · bernama.com/bm/news.php?id=2616114 · thestar.com.my/news/nation/2024/12/31/mapping-better-plans-through-data

### 3.6 Citizen reports
- **FloodWay:** photo + depth, optional AI photo check, demo review desk; stored in browser memory only.
- **Real world:** PetaBencana.id (Jakarta) uses depth bands and is consumed as a "last hour" snapshot; research checks reports against nearby rain/gauge data; crowd reports are biased to dense areas.
- **Missing / refine:** actually save to the backend (the route exists), expiry (e.g. hide after 3 h), depth bands, cross-check against the nearest camera level, rename `AI_VERIFIED` to "AI-checked", reviewer role.
- Sources: github.com/urbanriskmap/petabencana-docs · vulcanpost.com/773950/bencanabanjir-malaysia-crowdsource-database-flood-report

### 3.7 ESP32 sensor ingest
- **FloodWay:** HMAC-signed distance readings, 5-sample median, mount-height conversion, ONLINE/STALE after 10 min.
- **Real world:** FloodNet NYC: ~US$200 ultrasonic sensors, solar, LoRaWAN, ~1 reading/min, 265+ sensors. JPS telemetry ~15 min.
- **Missing / refine:** replay protection (bug 4), per-device thresholds (bug 1), battery and signal in the payload (today the popover is hardcoded), and wiring the sensor phase into the Home hero and alerts so the sensor is not a side panel.
- Sources: repository.library.noaa.gov/view/noaa/68675 · engineering.nyu.edu/news/new-york-citys-flood-sensors-inspire-global-networks-monitor-street-level-flooding

### 3.8 Forecast
- **FloodWay:** hand-written formula, P10/P50/P90, labelled "not a trained model". Rain input simulated.
- **Real world:** JPS PRABN targets 2-day warnings; the Auditor-General found low accuracy for phase 1. Klang Valley floods are mostly urban flash floods, where lead time is hours. Google Flood Hub covers riverine floods only.
- **Missing / refine:** a real rain input (Open-Meteo; check its non-commercial licence before a commercial pitch), say "hours of lead time from upstream cameras", one backtest on a past event if any data can be found.
- Sources: malaymail.com/news/malaysia/2023/11/22/a-g-report-flood-warning-system-… · androidcentral.com/apps-software/google-flood-hub-expanding-to-80-countries

### 3.9 Resilience dashboard / losses avoided (not built)
- **Real world:** the Global Commission on Adaptation says 24 h notice can cut damage by 30%. **PreventionWeb traces that figure to a 1970 note: treat it as contested.** UN Early Warnings for All: lower disaster mortality with full warning coverage. Malaysia's NSRF adopts IFRS S1/S2 from FY2025; flood is a physical risk under S2. Sime Darby Property has assessed township flood risk.
- **Refine the plan:** show the loss estimate as a range with source and caveat; count only avoidable losses (cars, contents, basement equipment); map outputs to IFRS S2 metrics (assets exposed, incidents per year).
- Sources: preventionweb.net/quick/80529 · spglobal.com/…/getting-ready-for-nsrf-… · kenanga.com.my/market-insights/esg-thematic-reports/urbanmetry-understanding-floods-with-big-data

### 3.10 Township and estate manager (not built)
- **Real world:** MS 2426:2011 covers basement car park flood mitigation. Bandar Bukit Raja (SDP township) residents report about three flash floods a year and say its retention ponds are not enough.
- **Refine the plan:** per-level runbook for the estate manager (move cars out of the basement at WARNING, close flood gates, isolate the electrical room at DANGER), with a named owner per step. Bandar Bukit Raja is a documented pilot candidate.
- Sources: theedgemalaysia.com/node/734847 · freemalaysiatoday.com/category/nation/2024/05/24/…

## 4. What to do, in order

Before the 23 Oct submission (small, high value, no new features claimed):

| # | Item | Size | Why |
|---|---|---|---|
| 1 | Fix `check.ps1` / install pytest in Python 3.12 so the test count is real | Tiny | Evidence 10%: the claim in STATUS must reproduce |
| 2 | Per-device thresholds in PhaseMachine; timestamp skew check on `/ingest` | Small | Correctness; matches JPS per-station practice |
| 3 | All-clear message when a camera drops back below WARNING | Small | Every real alert system has one |
| 4 | Save reports to the backend (`POST /reports` exists) and rename `AI_VERIFIED` to "AI-checked" | Small | Reports survive refresh; honest wording |
| 5 | Delete dead code: AppContext `waterLevelM`/`floodPhase`, `fetchTwinState`, unused `/sos/*` | Small | Removes the confusing parallel systems |
| 6 | Drive the map scenario from the highest camera level (keep the toggle as override) | Small | Connects cameras to routing on screen |

For the pitch (talking points or next build, in rank order):
1. Resilience dashboard with a sourced, ranged, caveated loss estimate tied to IFRS S2.
2. Estate-manager runbook for one SDP township (Bandar Bukit Raja).
3. Calibrate 3–5 JPS cameras and show metres next to the nearest JPS station.
4. Township alert subscription, Bahasa Malaysia, "Call 999" hand-off, no-response escalation.
5. Shelter "activated / capacity unknown" states and report expiry.

Not verified in this audit: whether Public InfoBanjir has its own camera section, official JPS level definitions, Flood Hub coverage of Malaysian rivers, Open-Meteo licence terms. Backend tests were not run (see bug 13).
