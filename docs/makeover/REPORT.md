# Frontend makeover: test report (branch `frontend-makeover`, 2026-10-23)

Run: Playwright (installed Chrome, emulated phones with touch, reduced motion on) against the dev servers (frontend 5173, backend 8080). Result of the last full run: **91 passed, 0 failed** (`npm run e2e`). Also green: `npm run check` (tsc, 168 vitest tests, build) and backend `pytest` (160 passed).
Screenshots of every route and width: `docs/design/mobile-test/<route>-<width>.png` (54 files).

## Route x width (all checks pass)
Checks per cell: page renders; no console error, uncaught exception or failed/4xx request to our servers; no horizontal scroll; no text under 12 px. At widths under 760 also: every tap target at least 44 px, every text input at least 16 px.

| Route | 320 | 375 | 414 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| `/` Welcome | pass | pass | pass | pass | pass | pass |
| `/home` | pass | pass | pass | pass | pass | pass |
| `/map` | pass | pass | pass | pass | pass | pass |
| `/reports` | pass | pass | pass | pass | pass | pass |
| `/live` (Cameras) | pass | pass | pass | pass | pass | pass |
| `/live?source=jps` | pass | pass | pass | pass | pass | pass |
| `/estate` | pass | pass | pass | pass | pass | pass |
| `/profile` | pass | pass | pass | pass | pass | pass |
| `/navigation/shelter-01` (redirects to the map route) | pass | pass | pass | pass | pass | pass |

## Interaction specs (375 x 812, touch)
- **Click-every-control crawler**, one per route: clicks each visible button and link in turn; no page error, no console error, stays on our origin.
- **Welcome:** empty form shows inline errors; bad email explained; own name signs in and shows on Me; demo user goes to Home.
- **Home / Cameras:** camera tile opens that camera; level-lines switch; raw AI output folded under "For developers"; JPS tab spells out JPS and says the rest are photos only; add-camera wizard opens, validates, closes; blocked-notification note can be dismissed; no camera ids, "% of bank", "Reference lines" or "Human review" text.
- **Map:** refuge link lands on the map with that centre; Start route shows the simulated drive and Cancel stops it; no "Route A" or "Crosses N"; choosing a river level by hand turns Auto off; legend opens.
- **Reports:** time groups, plain counters; form opens from a Home link, starts with no photo, shows inline errors; a report can be sent, confirmed and appears in the list; example photo and photo check report honestly (opinion or "unavailable"); Escape closes the sheet; Review desk Approve moves a report.
- **Me:** signed-in name shown, no old jargon, Advanced folded; add a family contact with validation, success and persistence across reload; remove a contact; sign out sticks after reload.
- **States:** offline banner appears and clears; Home shows skeletons while data loads; forecast failure gives a retry card, not numbers; sidebar on desktop, bottom tabs on phone.

## Defects found and fixed during the run
| Defect | Fix |
|---|---|
| Bottom tab bar covered the Add-camera wizard buttons (z-index) | Wizard and toasts above the bar (`z-[900]`, `z-[800]`) |
| Sideways scroll at 1024 on Cameras: hidden text inside the camera strip escaped its scroller | Scroller made `relative` |
| Inputs under 16 px (Welcome, Map, Estate, Me) | 16 px fields everywhere |
| Tap targets under 44 px (logo link, legend, sheet handle, filters, report buttons) | 44 px minimum |
| Text under 12 px on the Map township picker | 12 px minimum |
| Sign out came back after reload (default demo user) | `floodway_signed_out` flag |
| Fake navigation page (speed, GPS claim, Simulate arrival) | Removed; refuge links open the map route |

## Not covered, say so honestly
- **Emulation is not a real device.** Safe-area insets, the on-screen keyboard over the pinned Send button, and touch scrolling on the map are untested.
- Dark mode is not built. Desktop (768 and up) passes the checks but was not redesigned beyond a two-column Home.
- Only a happy-path check of the Add-camera wizard (steps 2 and 3 not driven end to end).
- `npm run map-fps` and the extended `layout-check` script were not re-run.
- Blocked on backend (frontend shows honest wording instead): route polyline and steps in the API, hysteresis count for "stays on Warning until 3 readings", `ai_check_available` flag, contacts CRUD and Telegram `configured`, JPS district filter and thumbnails. Family contacts are stored in the browser only.
