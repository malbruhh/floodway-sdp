# AGENTS.md: FloodWay (any AI agent reads this first)

FloodWay: AI flood early warning for Malaysia. Live Vision reads river and drain camera water levels, the map routes around flooded roads. Sime Darby Property University Hackathon 2026 (proposal 23 Oct, final submission 11 Nov, pitch day 14 Nov).

## The loop (every task, every agent)

0. **Read `docs/ai/SDP_ALIGNMENT_SUMMARY.md` first** (feature list, known bugs, SDP alignment plan).
1. **Read `docs/ai/PROGRESS.md`.** It holds the status board, the file map, the guard rails and the open items. Do not start from the old docs.
2. Do the task. Touch only the files it needs. Reuse before you write (stdlib, then installed packages, then new code). Delete dead code you pass.
3. Verify: `powershell -File scripts/check.ps1` (frontend tsc + vitest + build, backend pytest). Report the real output.
4. **Before you stop, update `docs/ai/PROGRESS.md`:** change the status rows you moved, add one line to the Change log (date, what, files, check result), and fix the File map if you added, moved or deleted a file or folder. Long write-ups go in `docs/ai/CHANGELOG.md`.

## Honesty rules (the project's credibility)

- The five sample cameras and their frames are **AI-generated sample imagery**, labelled SAMPLE or PLAYBACK. Never call them real, live or government feeds.
- The demo forecast is a **rule-based formula**, not a trained model. No external cloud service is called by the demo. Do not state accuracy numbers that the repo cannot reproduce. Pitch-deck benchmark figures keep their own source line (Sen1Floods11 validation split, 100 simulated Klang Valley scenarios).
- Never add agency names or logos (JPS, DBKL, JKM, JKR, Bomba, MET) to generated media.

## Guard rails (do not break)

- `isFullyVerified()` in `frontend/src/types/report.ts`, the seed report IDs, `RequireAuth` and `RedirectIfAuthed` in `App.tsx`, Firestore collection names and `firestore.rules`.
- Any backend route that accepts a file or writes state uses `Depends(require_write_token)`.
- Never change vision thresholds (`levels.py`, `DANGER_AT`) or blur frames to make a check pass.
- No secret in the browser bundle (`VITE_*` is public). Never commit `.env`.

## Conventions

TypeScript strict, React 19 function components, Tailwind 4, named exports, `@/` alias. Python 3 with type hints. Details: `docs/architecture/CODING_CONVENTIONS.md`. Windows: backend venv is `backend\.venv\Scripts\python.exe`.
