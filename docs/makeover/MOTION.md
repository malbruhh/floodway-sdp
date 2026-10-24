# Motion system

All motion is defined once in `frontend/src/styles/index.css` (`@theme`: `--animate-*`, keyframes, `--ease-*`) and reused by name. Durations: 140-160 ms exit, 180-300 ms enter. One easing family. `prefers-reduced-motion: reduce` collapses every animation and transition to about 0 ms (global rule at the end of that file).

| Moment | Class / hook | Used by |
|---|---|---|
| Click (press) | global `:active { transform: scale(.97) }` on buttons, links, tabs, summary | every control |
| Hover, focus, colour change | global 150 ms transition on the same controls | every control |
| Open (sheet) | `animate-sheet-in` (phone), `animate-pop-in` (desktop), backdrop `animate-fade-in` | Report sheet, Add-camera wizard |
| Closed | `useExit(open, ms)` keeps it mounted while `animate-sheet-out` / `animate-pop-out` / `animate-fade-out` plays | Sheet, wizard, area menu, map legend, offline banner, alert toast |
| Open menu | `animate-pop-in`, chevron rotates | Area menu, map legend, Advanced, Forecast settings (`details` rise) |
| Page change | `animate-fade-in` on a route-keyed wrapper (opacity only, so fixed children are not trapped) | `AppShell` |
| Lists | `animate-rise` with a 45-80 ms stagger | Reports, camera tiles, Home timeline, alerts, contacts |
| Live update | `useFlash(value)` + `animate-flash` / `animate-pop-in` | Risk bar, Now %, Cameras water %, |
| Pending | `Spinner`, `ProgressBar`, `animate-shimmer` skeletons | Send report, photo check, wizard Next/Save, all skeletons |
| Error | `animate-shake` + `animate-rise` message | Field validation, forecast failure |
| Success | `animate-check` pop, `animate-rise` note | Report sent, contact added, test alert |
| Active tab | icon lifts and scales, stroke thicker | Bottom tab bar |

Tests: `frontend/e2e/motion.spec.ts` (8 tests: enter and exit classes, exit completes, press scale, shake, spinner, offline banner, reduced motion near 0 ms, no sideways scroll while animating).
