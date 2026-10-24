# Frontend makeover plan (branch `frontend-makeover`)

Source of truth for the look: `D:\FloodWay\docs\design\04-final-design.md` (B Clarity First + parts of C). Source of fixes: `AGENT-BRIEF-FRONTEND-UIUX.md` F1-F5. Scope: `frontend/src` only, no backend change. Mobile first (375x812), then 768 and 1440.
Design skills only: brand, design-taste-frontend, ui-ux-pro-max (no SuperDesign).

## Base
Branch cut from `feat/merge-camera-pages` (not the 17-commit-stale `main`) after a WIP commit of the pending edits.

## Steps (each ends with `npm run check` green, a Playwright run, and one commit)
1. **Tokens + shell.** Tailwind 4 `@theme` tokens (ground, surface, ink, risk fg/bg, radii 16/14/12/24, Geist). One `AppShell` (top bar with place + one "Demo - simulated data" chip, 5-tab bottom bar Home/Map/Report/Cameras/Me, desktop sidebar kept). Replace the per-page Sidebar+Header+BottomNav boilerplate. Kill "LifeLine Active", "Citizen Responder", the duplicate IoT chip. Shared UI kit: `Button`, `Card`, `RiskBar`, `Sheet`, `Chip`, `Field`.
2. **Welcome / sign-in** (F3): "Continue as demo user" first, inline errors, name shown in header.
3. **Home** (final-home): compact risk bar, "Go to refuge" / "Check my area", Now -> Next 2 hours -> What to do rail, cameras one scroll down, refuge card, sticky action. Skeletons.
4. **Map + Navigation** (F1, F2, F4): copy, legend restyled, bottom sheet, demo-level control folded; real route steps from existing route data; remove fake speed/GPS/Simulate arrival.
5. **Reports** (F1, F3): time-rail list, clear counters, form in bottom sheet, no preselected photo, success state.
6. **Cameras** (F1, F4, F5): sentence heading, tabs FloodWay/JPS, hide CAM ids, developer JSON toggle, wizard plain labels, JPS filter.
7. **Me / Profile** (F3): header card, family contact inline form, Advanced collapse, Sign out.
8. **States**: loading, empty, offline, toast.

## Test suite (built first, runs after every step)
- `npm run check` (tsc + vitest + build).
- Vitest: pure logic (risk copy, route steps, form validation, report grouping).
- Playwright e2e `frontend/e2e/` (`npm run e2e`): every route x widths 320, 375, 414, 768, 1024, 1440. Per route assert: no horizontal overflow, tap targets >= 44px (phone), text >= 12px, inputs >= 16px, no console errors / pageerrors / failed same-origin requests. Interaction specs click every button and link on every page (generic crawler plus page-specific flows: sign-in errors, report submit, add contact, add camera wizard, route start, sheet open/close, tab bar nav, sign out).
- Screenshots to `docs/design/mobile-test/<route>-<width>.png` and `REPORT.md`.
- Backend: `pytest` smoke (untouched backend must stay green); e2e hits live API on 8080 so function calls are exercised.
- Not covered: real-device safe areas, on-screen keyboard.
