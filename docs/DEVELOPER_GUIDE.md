# FloodWay: Developer Guide (reverse-engineered)

Read `AGENTS.md` and `docs/ai/PROGRESS.md` too. They are the project's own source of truth. Some older docs under `docs/architecture/` are from an earlier version, so check them against the code.

## 1. What it is, honestly

A flood early-warning demo for Malaysia (Sime Darby Property University Hackathon 2026). Camera images go in, a water level comes out (NORMAL / ADVISORY / WARNING / DANGER), and the app alerts people and routes them around flooded roads.

What is real and what is not (the README oversells this; the code and `AGENTS.md` are the truth):

| Claim in README | Reality in code |
|---|---|
| GRU forecaster | `backend/app/services/forecaster.py` is a hand-written formula. The GRU in `models/ml_pipeline` is trained on synthetic data and nothing loads it. |
| Live CCTV | The 5 sample cameras are AI-generated images, labelled SAMPLE/PLAYBACK. Never call them real or live. |
| Water detection | OpenCV classical analyser plus a reference-diff analyser for the sample cameras. A YOLO analyser is a stub waiting for labelled data. |

## 2. Layout

```
backend/    FastAPI (Python 3), port 8080
  app/main.py            app + routers + CORS
  app/routes/            telemetry, twin, sos, shelters, predict, reports, alerts, ai_check
  app/services/          forecaster (formula), notifier (Telegram), phase_machine, shelters_data
  app/vision/            Live Vision, the core of the project (section 3)
  app/security.py        require_write_token + RateLimiter
  tests/                 pytest (~130 tests)
frontend/   React 19 + Vite 7 + Tailwind 4 + TypeScript strict, port 5173
  src/App.tsx            routes
  src/pages/             Welcome, Home, Map, LiveVision, Report, Navigation, Profile, SignUp
  src/components/live/   Live Vision UI (alerts, analysis, cameras, feed, onboarding)
  src/components/map/    Leaflet map + evacuation
  src/services/          api.ts (REST), vision/ (REST + WebSocket + store), auth.ts, telegramService.ts
  src/lib/               pure logic (routing, hazards, levels, formatting). Easiest place to add tests.
  src/hooks/vision/      state hooks for the Live page
  src/__tests__/         vitest
models/     ml_pipeline (GRU, synthetic), legacy_ann (old Keras model on datasets/ CSV)
firmware/   ESP32 sensor sketch (legacy IoT path, not used by the vision demo)
booth/      promo film projects (Node + Chrome render), not part of the app
docs/       specs, pitch, poster, ops runbook
scripts/    check.ps1 (full check), public-demo.ps1 (Cloudflare tunnel demo)
```

## 3. Live Vision pipeline (backend/app/vision)

One asyncio task per camera, in `engine.py`:

```
sleep(interval) -> grab burst of frames (sources/) -> analyse each (analysis/)
  -> median (analysis/temporal.py) -> ratio -> level with hysteresis (levels.py)
  -> store reading -> push to WebSocket subscribers -> alert on escalation (alerts.py)
```

- `sources/`: where frames come from. `synthetic`, `frameset` (the sample image ladder), `snapshot` (HTTP JPEG URL), `stream`, `still` (uploaded photo). `factory.build_source` picks one. `url_guard.py` blocks SSRF on user-supplied URLs.
- `analysis/`: `WaterAnalyzer` implementations. `classical.py` (smooth vs textured), `reference_diff.py` (diff against a dry frame; used by sample cameras), `yolo_seg.py` (optional). `waterline.py` has the shared mask-to-ratio maths. Pick one via `VISION_ANALYZER`.
- `levels.py`: pure logic, no I/O. A camera has a `Calibration` (an ROI polygon and 3 drawn lines: normal / warning / danger). The water ratio is mapped to 0..1 "bank height" and thresholded. `DANGER_AT = 0.97`. Do not change thresholds to make a test pass (project rule).
- `seed.py` registers the 5 sample cameras at startup (`VISION_SEED_SAMPLES=1`). `bootstrap.py` builds the engine and the FastAPI lifespan.
- `routes.py`: `/api/v1/vision/*` (cameras CRUD, upload, preview, test, analyze, readings, frame.jpg, alerts) and `WS /ws`. Message types: snapshot, reading, alert, status, camera, camera_removed.

Frontend mirror: `services/vision/visionApi.ts` and `visionSocket.ts` feed `visionStore.ts`, `hooks/vision/useVisionStore.ts` exposes it, and `LiveVisionPage` composes `components/live/*`. With no backend, `lib/vision/samplePhoto.ts` shows the matching sample photo, and `VITE_VISION_MOCK=1` uses `mockVision.ts`.

## 4. Other backend routes

Thin and mostly in-memory demo code. `reports.py` (citizen reports), `shelters.py` (reads `data/kl_shelters.json`), `sos.py` and `alerts.py` (Telegram via `notifier.py`), `ai_check.py` (citizen photo check via OpenRouter, disabled without a key), `twin.py`, `telemetry.py` and `predict.py` (legacy IoT/forecast demo).

## 5. Security model

- Write endpoints use `Depends(require_write_token)`. If `VISION_WRITE_TOKEN` is set, the request needs `Authorization: Bearer <token>`. If it is unset (local dev), writes are open and a warning is logged. The frontend keeps the token in memory only (`services/auth.ts`).
- Secrets only in `backend/.env`. Anything `VITE_*` ends up in the public bundle, so never put secrets there.
- Any new route that accepts a file or writes state must use the write-token dependency.
- Frontend user auth (`contexts/AuthContext.tsx`) is a demo login. The guard rails in `AGENTS.md` mention Firestore, but there is no Firestore in this checkout, so verify before relying on that.

## 6. Run it

```powershell
# backend (Windows)
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
.venv\Scripts\python.exe run.py            # http://localhost:8080  (docs at /docs)

# frontend
cd frontend
npm install
copy .env.example .env                      # VITE_API_BASE=http://localhost:8080
npm run dev                                 # http://localhost:5173

# everything: tsc + vitest + build + pytest
powershell -File scripts/check.ps1
```

## 7. Contribution workflow and rules

1. Branch from `dev` (not `main`). Keep changes small and touch only the files the task needs.
2. Run `scripts/check.ps1` before you push, and report the real output.
3. Update `docs/ai/PROGRESS.md` (status row, changelog line, file map) when you finish.
4. Honesty rules: label sample media as sample, never claim a cloud AI service is used, never invent accuracy numbers, never put agency logos in generated media.
5. Do not break: `RequireAuth`/`ProtectedRoute` in `App.tsx`, the vision thresholds, the write-token dependency, and the "no secret in the bundle" rule.
6. Style: TypeScript strict, React function components, named exports, `@/` alias, Tailwind 4. Python with type hints.

## 8. Good first contributions

- Phone touch targets under 44 px on Home, Map, Reports, Profile (listed as open in PROGRESS.md).
- A learned water segmenter for `analysis/yolo_seg.py` (needs labelled frames).
- Backend tests for the thin routes (`reports`, `sos`, `alerts` have some; `twin` and `telemetry` are light).
- Persist reports and cameras (reports are in-memory; user cameras are stored under `VISION_DATA_DIR`).
- Wire the forecaster to a real model or remove the claim from the UI.

## 9. Known gotchas

- Windows paths in the docs; the backend venv is `backend\.venv`.
- The public demo is a laptop-hosted tunnel (`scripts/public-demo.ps1`). It breaks on every restart.
- `docs/_to-delete/` is a quarantine folder and is not referenced anywhere.
- PROGRESS.md notes that the OpenRouter key and Telegram token were once exposed in the bundle and need rotating. Check that your `.env` values are your own.
