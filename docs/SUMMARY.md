# FloodWay
## 1. What should be submitted

Judging weights: Impact and sustainability 25%, Innovation 20%, Feasibility 20%, Strategic fit 15%, Commercial value 10%, Team, evidence and pitch 10%. (Check dates on the [official page](https://www.simedarbyproperty.com/universityhackathon/); one news source gives different ones.)

**Suggested slide and video flow (about 5 minutes):**
1. Problem: urban flash floods give little warning; residents and estate managers see too late.
2. Sense: real JPS Selangor river cameras on one map (live demo of the camera wall).
3. Read: camera frame to water level against calibrated lines (Live Vision demo, labelled sample).
4. Warn: alert to phone and family check-in on Telegram.
5. Evacuate: route to shelter that avoids flooded roads.
6. Township view (proposed): one SDP township, building and basement risks, estate-manager page.
7. Impact (proposed): resilience dashboard for ESG reporting.
8. Roadmap and ask: pilot with SDP on a few cameras, then scale.

## 2. Features and status

Status: **Already** = works in the code today. **Needs refinement** = exists but simulated, incomplete or buggy. **Proposed** = not built; the roadmap we show before a real deployment.

| #   | Feature                                                                                                                                                                           | Status                                                                                                                          | SDP fit                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | JPS Selangor camera wall (80 cameras, by district) and map dots, real public snapshots, image only                                                                                | Already                                                                                                                         | People: safety. Real data           |
| 2   | Live Vision: camera frame to level (NORMAL / ADVISORY / WARNING / DANGER), trend, alerts                                                                                          | Already on 5 AI-generated sample cameras. Needs refinement for JPS photos (dry reference frame and hand calibration per camera) | Planet: climate resilience          |
| 3   | Alerts: in-app, browser, Telegram; family SOS and arrival check-in                                                                                                                | Already (Telegram needs a bot token)                                                                                            | People: safety                      |
| 4   | Evacuation map and turn-by-turn, route bends around flood zones                                                                                                                   | Already. Needs refinement: 8 demo shelters, 16 hand-placed flood areas, one hardcoded street name                               | People: safety, mobility            |
| 5   | Citizen flood reports with optional AI photo check                                                                                                                                | Already. Needs refinement: write protection, moderation                                                                         | People: community                   |
| 6   | Home dashboard (risk, forecast, river trend, capacity)                                                                                                                            | Needs refinement: numbers are simulated                                                                                         | People: digital living              |
| 7   | 2-hour forecast                                                                                                                                                                   | Needs refinement: a formula, labelled "not a trained model"                                                                     | Planet: climate resilience          |
| 8   | ESP32 sensor ingest and CSV export                                                                                                                                                | Needs refinement: require the signature                                                                                         | Planet: water                       |
| 9   | Real rainfall and river inputs (JPS stations, Open-Meteo, MetMalaysia warnings)                                                                                                   | Proposed                                                                                                                        | Evidence, feasibility               |
| 10  | Calibrated AI water level on a pilot of 3 to 5 JPS cameras, cross-checked with the nearest JPS river station                                                                      | Proposed                                                                                                                        | Innovation                          |
| 11  | Township layer: one SDP township (boundary, cameras, shelters, flood areas) with a selector                                                                                       | Proposed                                                                                                                        | Strategic fit, township scale       |
| 12  | Estate-manager page and building or basement risk panel (for example 110 cm electrical shut-off)                                                                                  | Proposed                                                                                                                        | People: safety and security         |
| 13  | Resilience dashboard: events detected, warning lead time, alerts sent, reports resolved; CSV or PDF export; "loss avoided" estimate with a visible formula, labelled illustrative | Proposed                                                                                                                        | Impact, commercial value            |
| 14  | Bahasa Malaysia, alert subscription by township, "was this alert useful?", report status, touch-target fixes                                                                      | Proposed                                                                                                                        | People: accessibility and inclusion |
| 15  | Learned water segmentation for any camera                                                                                                                                         | Proposed (needs labelled frames)                                                                                                | Innovation                          |
| 16  | Hosting, persistence, hardened write routes                                                                                                                                       | Proposed                                                                                                                        | Feasibility                         |

## 3. Public data we use or plan to use

| Source | What we take | State |
|---|---|---|
| JPS Selangor camera API (`CCTVS/GetCCTVsByDistrict`) | Camera name, position, online status, last update, snapshot image | **Used and checked.** 93 listed, 80 shown (11 have no position, others disabled) |
| JPS Selangor rainfall and river summaries | Station counts by status (95 river stations, 199 rainfall stations) | Checked, **counts only**, not used yet |
| JPS station details, sirens, flood hotspots | Per-station values, siren status, hotspot lists | Named in the JPS site's own code; not yet verified (a hotspot query for 2024 returned an empty list) |
| MetMalaysia warnings via data.gov.my (`api.data.gov.my/weather/warning`) | Official weather warnings | Checked reachable; not used yet |
| Open-Meteo | Hourly rain and forecast for a point | Checked reachable; not used yet |
| OpenStreetMap | Map tiles, road routes (computed in advance) | Used |

	Rules we follow: read-only requests, one cached backend call instead of one per visitor, refresh no faster than every 60 to 120 seconds, clear attribution on screen, no credentials, no reuse of keys found on JPS pages. JPS publishes no terms for this API, so we ask permission before any real deployment.

## 4. What to say, and what not to say

- Say: "real public JPS Selangor snapshots", "estimate", "prototype", "sample cameras are AI-generated".
- Do not say: JPS verifies or endorses FloodWay, the forecast is a trained model, any accuracy figure, or that the five sample cameras are real.
- Every JPS image shows its age; a stale camera is shown stale, not hidden.

## 5. Known risks

- The JPS API is unofficial and can change or disappear without notice.
- Reading water level from real photos is unproven: night infrared frames, lighting and moving plants break the simple method. We pilot a few cameras and label the result an estimate.
- `backend/.venv` is Python 3.9 and cannot run the backend; use Python 3.12.
- The OpenRouter key and Telegram bot token were once exposed and must be rotated.

## 6. Where things are

- Run it and read about it: [README.md](../README.md)
- Technical status board for engineers and AI agents: [STATUS.md](STATUS.md)
- Demo script and the real-versus-simulated table: [ops/DEMO_RUNBOOK.md](ops/DEMO_RUNBOOK.md)
