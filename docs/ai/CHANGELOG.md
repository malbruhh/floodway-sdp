# FloodWay: Development Log (detail)

One-line summaries live in `docs/ai/PROGRESS.md`. Put the long write-up for a change here, newest date first within its group.

## 2026-05-09

### AI Documentation System Created
- Created modular `/docs` directory with 16 focused markdown files
- Created `/CLAUDE.md` root-level AI instruction file
- Documented entire architecture, tech stack, features, database schema
- Documented IoT system, 3D module, API reference, coding conventions
- System designed for low-token AI sessions with selective reading

### Manual Location Pinning for Reports
- Added interactive map picker to `EmergencyMode.tsx`.
- Users can now click "Pin on Map" to manually select coordinates.
- Submission logic prioritizes pinned location over automatic GPS coordinates.
- Files: `src/components/report/EmergencyMode.tsx`, `src/components/report/EmergencyMode.css`

### Navigation Bar Reordering
- Rearranged bottom navigation tabs to: Home, Simulate, Reports, Shelter, Profile.
- Updated `src/components/BottomNav.tsx` and related architecture documentation.

### Camera Black Screen and Glitching Fix on Laptop
- Fixed `useCamera.ts`: added constraint fallback chain (environment → user → any camera)
- Fixed `useCamera.ts`: added `loadedmetadata` event wait before `video.play()` to prevent race condition
- Fixed `useCamera.ts`: **Major Fix** refactored to use `useRef` for stream state, making `startCamera` and `stopCamera` stable. This resolved an infinite loop where updating the stream state caused the `stopCamera` callback to change, triggering the `useEffect` in `EmergencyMode` to restart the camera repeatedly (the "glitching").
- Fixed `EmergencyMode.tsx`: replaced `URL.createObjectURL()` with `FileReader.readAsDataURL()` for proper base64 data URLs
- Files: `src/hooks/useCamera.ts`, `src/components/report/EmergencyMode.tsx`

### IoT Automated Reporting (Session: 48c8fcaf)
- Implemented background listener in `AppContext.tsx` for IoT DANGER status
- Auto-generates FloodReport when water level hits DANGER
- Daily limit: one sensor report per day (prevents spam)
- Re-submission allowed if moderator deletes the previous report
- Dynamic map marker color: blue (normal) → red (DANGER)

## 2026-05-02

### IoT Sensor Integration (Session: 0ef699e6)
- Built `useBluetooth.ts` hook (Web Serial API for ESP32)
- Created `IoTWidget.tsx` — water tank visualization with minimize/expand
- Created `EmergencyAlert.tsx` — full-screen modal with vibration + audio
- Added `IOT_SENSOR_LOCATION` constant in `locations.ts`
- Distance tracking from user to sensor (Haversine)
- 3km proximity check for emergency alerts
- Map auto-focus on sensor location from IoT widget

### Firebase Auth Fix (Session: 17b6fddc)
- Replaced placeholder `.env` values with real Firebase config
- Fixed authentication flow (login → redirect to /home)

## 2026-10-11 (demo-polish, map overhaul)

- `/map` rebuilt for Kuala Lumpur only. New: `frontend/src/data/{klDemo.ts,kl_shelters.json,klRoutes.json}`, `lib/routing.ts`, `components/map/{FloodProneLayer,BottomSheet,MapPanel,NavigationHud,ArrivalDialog,mapIcons}.tsx`, `hooks/{useDriveSim,useMediaQuery}.ts`.
- Shelters: backend `app/data/kl_shelters.json` is the single source (`shelters_data.py` loads it); the frontend keeps an identical copy for its offline fallback and `tests/test_shelters.py` fails if they differ. Invented phone numbers removed.
- Routes: `node scripts/build_kl_routes.mjs` asks the public OSRM server for 7 origins x 8 centres (about a minute) and writes `klRoutes.json` (172 kB, lazy-loaded). Re-run it if the start points or centres change.
- Fixed: starting turn-by-turn on a phone did not show the map (the old layout needed the Interactive Map tab). The sheet now drops to its peek height.
- Fixed: the arrival dialog said a Telegram message was dispatched whatever happened; it now shows the real result.
- The old hard-coded Shah Alam route, waypoints, roadblocks, "1.2 km" and step text are gone.

## 2026-10-11 (demo-polish)

### Plan B executed: demo readiness pass
- Home redesigned as a command centre; every number is computed from data or labelled simulated. Old Home components removed.
- Honesty pass: removed fabricated verification and certification claims (JPS, NADMA, APM), the fake "live CCTV" modal,
  invented AI verification fallbacks, and an auto-VERIFIED report endpoint. Forecast labelled as a formula.
- Secrets: Telegram token and OpenRouter key moved server-side; the build no longer contains them. Write endpoints (cameras, alerts,
  SOS, AI check) accept an operator token (`VISION_WRITE_TOKEN`). `/sos/*` was an open, unescaped Telegram relay and is fixed.
- Backend: `POST /cameras` returned 500 (fixed earlier), shelters and reports mapped from snake_case, sample cameras backed by photos.
- Tooling: `scripts/check.ps1`, `npm run check`, `npm run layout-check` (overlaps, horizontal scroll, text under 12 px), vitest.
- Known defect: the Plan A water frames are a drawn rectangle (`sample_media/check_realism.py`). See `docs/DEMO_RUNBOOK.md`.
- Docs: `docs/DEMO_AUDIT.md`, `docs/PLAN_A_GEMINI_MEDIA.md`, `docs/PLAN_B_SYSTEM_UPGRADE.md`, `docs/DEMO_RUNBOOK.md`.

## 2026-10-11

### Live Vision polish pass (branch `live-vision-polish`)
- Audited the Antigravity Live Vision integration against the running app; findings and evidence in `docs/LIVE_VISION_AUDIT.md`.
- Layout now follows the width of the page's content area (Tailwind container queries), fixing overlapping columns at 1024px and the crushed feed at 1366px; sidebar starts as an icon rail on /live below 1536px.
- Store recovers from sample data when the server comes up (the "Showing sample data" banner used to stick until reload).
- Backend: `POST /cameras` returned 500 and new cameras were never analysed (task spawned off the event loop); fixed with a regression test. Added `VISION_SAMPLE_CLOCK_OFFSET_S` (testing aid, backend only).
- Map: evacuation routes bend around Live Vision WARNING/DANGER zones.
- Removed the unreachable 3D SimulationPage and components/simulation; /studio is lazy-loaded so three.js no longer loads on every page.
- Wizard: focus trap, full-height phone sheet, non-overlapping calibration pills. Contrast raised to WCAG AA.
- Files: frontend/src/pages/LiveVisionPage.tsx, frontend/src/components/live/**, frontend/src/lib/vision/**, frontend/src/hooks/vision/**, frontend/src/services/vision/visionStore.ts, frontend/src/components/map/ShelterMapView.tsx, frontend/src/App.tsx, backend/app/vision/{engine,config,seed}.py.

## 2026-10-12

### Poster: advisor edits and an editable PowerPoint
- Removed the "Prototype" footer at the advisor's request. The Sen1Floods11 source line for 95.34% and 86.96% moved into the Proof card (AGENTS.md honesty rule); the 100% figure keeps "in 100 simulated scenarios".
- `scripts/poster-to-pptx.mjs`: reads the rendered poster (boxes, text runs, images, icons) and writes a native one-slide PowerPoint with pptxgenjs (`scripts/pptx-tool/`). Verified by exporting the slide from PowerPoint over COM: validation passes, QR decodes, mean pixel difference to the HTML poster 11/255.
- Installed Outfit, Inter and JetBrains Mono for the current Windows user so PowerPoint renders the deck with the poster fonts.

### Preliminary-round pack (briefing call, poster, script)
- Transcribed the briefing recording with Whisper `base` (English). `medium` stopped at 16% after 13 minutes, so it needs about an hour. Transcript in `docs/product/preliminary-round/transcript/`.
- New folder `docs/product/preliminary-round/`: `MEETING_SUMMARY.md` and `.pdf`, `PITCH_SCRIPT.md` (moved from `docs/product/` and rewritten for one slide and three speakers; the old one is in `docs/_to-delete/pitch-script-old/`), `poster/` (moved from `docs/product/poster/`), `transcript/`.
- Landscape poster: sections labelled 1 Problem, 2 Solution, 3 Impact; affordability line; QR code to the demo site (decodes to that URL). Overflow check passes.
- `scripts/render-poster.mjs` and `capture-poster-shots.mjs` point at the new poster folder.
- The Cloudflare build is stale and has no backend (see PROGRESS.md).

### Media V2: photographic ladder, reference-diff analyser, clean feed (branch `live-ui-upgrade`)
- Gemini produced 60 frames (5 cameras x 12 rungs, r000 to r110). `export_ladder.py` made the 640x360 JPEGs, 960x540 WebPs and the four legacy copies. The classical analyser read 0 on every frame (water texture std 13 to 54 against a cut of 4.5).
- Tried a colour segmenter (10 of 60 rungs read right) and a dry-reference difference with the old zones (28 of 60). Re-fitted the zones from the change masks, searched each camera's bed row, then added `row_fraction` (0.25) and `gap_rows` (60, for the drain's lid) to `waterline.ratio_from_mask` (defaults 0.5 and 0, so the classical analyser is unchanged). `check_ladder` now PASSES.
- `ReferenceDiffAnalyzer` (`analysis/reference_diff.py`) is attached per camera (`CameraRecord.analyzer`, `register_synthetic(..., analyzer=)`) for the sample cameras only; readings report `model: reference-diff-v1`. User cameras keep the classical analyser.
- `FrameSetSource` takes a 12-rung ladder and serves `nearest_rung(ratio)`; `seed.load_ladder` loads it.
- `DEFAULT_OVERLAYS` is now `{ roi: false, lines: true, mask: false, waterline: true }`.
- Tests: backend 130 (new `test_reference_diff.py`, ladder and analyser tests in `test_sample_media.py`), frontend 120. Verified in a browser against a second backend on :8081 (the dev backend on :8080 was an older process): Klang at 102% shows brown water at the bank top, matching the Danger line, with no box.
- Poster screenshots recaptured and both posters re-rendered.

### Live Vision UI/UX upgrade (branch `live-ui-upgrade`, Plan C: `docs/PLAN_C_LIVE_UIUX_UPGRADE.md`)
- Photo upload for the camera wizard: `POST /api/v1/vision/cameras/upload` (raw JPEG/PNG body, 5 MB cap counted while streaming, magic-byte type check, decoded and re-encoded to JPEG so EXIF/GPS is dropped, scaled to 1920 px, write-token protected). New `upload` source type backed by a stored still (`sources/still.py`); the stored file is deleted with the camera and unreferenced uploads are pruned after 24 h. Frontend: "Upload a photo" source option, client-side type/size check, PHOTO label.
- Sample water frames regenerated without an AI model: `backend/app/vision/sample_media/make_water.py` builds watch/warning/danger from each NORMAL photo (water mirrored up, smoothed to murky band, soft wavy top). `check_realism` 0/15 flagged (was 15/15); `check_frames` 20/20; the strict-xfail on the realism test was removed. Demo loop `klang-rise.mp4` and the public webp copies rebuilt from the same generator. Sample feeds keep the "simulated" label.
- Live page: one countdown (ring in the feed header), water pill off the danger line, selected camera chip scrolls into view.
- iPhone-style phone UI: large title, system font stack, sliding segmented controls (source tabs, radius), translucent tab bar, safe-area padding via `--nav-h` and `viewport-fit=cover`, `dvh` heights, 44 px touch targets on Live, header and tab bar. Applies to all pages that use the shared header, tab bar and page title.
- Tests: backend 119 passed + 1 expected xfail (12 new in `tests/test_upload.py`); frontend 119 passed (4 new in `photoUpload.test.ts`); `layout-check` clean on `/live` and the four other main routes at 360, 390, 1024 and 1366.
- Files: backend/app/vision/{engine,routes,schemas,config}.py, backend/app/vision/sources/{factory,still}.py, backend/tests/test_upload.py, frontend/src/components/live/**, frontend/src/components/layout/{Header,BottomNav}.tsx, frontend/src/components/dashboard/IoTHeaderPopover.tsx, frontend/src/pages/{LiveVision,Map,Navigation}Page.tsx, frontend/src/styles/{index.css,tokens.ts}, frontend/index.html.

### Logo, Live media, poster and pitch (branch `live-ui-upgrade`)
- Logo: the uploaded FloodWay wave was traced into a vector (`frontend/public/logo.svg`, `logo-white.svg`, PNG exports) and replaces the lucide "Waves" brand tile in the sidebar, mobile header, reports page and welcome page via `components/brand/FloodWayLogo.tsx`; new favicon; OG card (`scripts/make_og_image.py`) uses it.
- Live media: removed the flat tan bar drawn on the NORMAL frames (klang, gombak, smart, batu, drain) by inpainting; rebuilt all water frames, the rise loop and the webp copies from the cleaned frames. `check_realism` 0/15, `check_frames` 20/20. The Drain scene is still the crude drawing (bar removed): free local SD-Turbo could not produce a usable replacement. See `scripts/generate_image.py` (SD-Turbo, CPU, non-commercial licence).
- Pitch: `docs/PITCH_SCRIPT_PRELIM.md`, 575 spoken words, about 4:25 at 130 wpm.

---

## Format for Future Entries

```markdown
## YYYY-MM-DD

### [Change Title]
- What was changed
- Why it was changed
- Files affected
- Session ID (if applicable)
```
