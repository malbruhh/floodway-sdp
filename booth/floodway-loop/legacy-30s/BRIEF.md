# MASTER BRIEF

## Purpose and audience
A 30-second loop for a booth TV and social. Primary audience: ordinary Malaysians (commuters, delivery riders, parents, elders) who must understand in 3 seconds what FloodWay does for THEM. Secondary: competition judges glancing across an aisle. It must feel like a premium consumer product film: calm confidence, one idea per beat, generous holds, precise easing. Bold colour-block scene changes and giant kinetic type, Bold kinetic energy, but never frantic.

## Format and architecture (non-negotiable)
- 1920x1080 virtual canvas, letterboxed to 16:9. Exactly 30.000 s (900 frames at 30 fps for export).
- window.renderFrame(t), t in [0, 30): a pure function of time. No accumulated state, no Date.now in drawing logic, seeded PRNG (mulberry32).
- Offline and self-contained: inline CSS/JS/SVG, CSP "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:". Runs from file://. Embed Outfit (SIL OFL) as base64 woff2, weights 400/600/800, subset to Latin (fetch it with npm inside booth/floodway-loop/ at build time only). Fallback stack: "Outfit","Inter","Segoe UI",system-ui,sans-serif. Tabular numerals for numbers.
- 60 fps on an integrated GPU: animate only transforms, opacity and stroke-dashoffset. CSS 3D (perspective/rotateY/rotateX) is allowed on the phone wrapper only. Static gradients are fine; no animated blur, filters or shadows. Write-through attribute cache so unchanged values never touch the DOM.
- Seamless loop: frame(29.98) flows into frame(0). Any continuous motion (rain streaks, drift) must be periodic with a period that divides 30 s.
- Controls: F fullscreen, Space pause, Left/Right scrub 1 s, ?t=12.5 jump, ?debug timecode + scene overlay. Hide the cursor after 2 s.
- CONFIG object at the top (see Claims policy).

## Visual identity
- Navy #071426, cyan #1677FF, water blue #38BDF8, amber #F59E0B (rising / caution), emerald #10B981 (safe / go), red #DC2626 (flooded road segments only), platinum #F8FAFC, slate #94A3B8.
- Each scene owns one dominant colour block (Wrapped-style), joined by circular wipes done with a scaled solid circle.
- TV legibility (viewed from 2 to 4 m): hero titles >= 120 px, persona/scene lines >= 64 px, labels >= 36 px, nothing under 28 px, 5% safe margins. On-phone UI text must stay readable when the phone fills about 70% of the frame height.
- Do not use third-party cloud-provider branding. No third-party logos, marks or copied assets.

## The hero phone
- A generic modern smartphone drawn in SVG/CSS: rounded bezel, pill cutout, no logo. Logical screen 390x844 scaled into the device.
- The screens are the REAL FloodWay UI recreated in code. First locate the FloodWay app source in this repo (digital twin, shelter map, SOS / Family Ping) and mirror its real layout, labels, colours and copy. For fidelity checks, use Playwright to capture reference screenshots of https://floodway.pages.dev/ at 390x844 into booth/floodway-loop/ref/ (dev-time only, never embedded). If a screen or feature is not in the repo, still build it in the app's real visual style, but list it under FEATURES NOT FOUND IN REPO.
- Phone choreography: rises with a slight 3D tilt (S2), pushes in (S3), eases back (S4), zooms to the button (S5), slides left (S6), re-centres large (S7).

## The people
Four illustrative personas as flat geometric SVG figures (simple shapes, dignified, diverse, no caricature): Aisyah (driving home), Kumar (delivery rider on a bike), Mei Ling (mall car park with two kids), Nenek (ground floor, alone). Tag "Illustrative personas" in a corner while they appear.

## Tone
Calm, capable, empowering, Malaysian English, short lines. Never: "trapped", "drowning", casualty numbers, rescue-scene imagery, or blame.

## Storyboard (30.0 s)
S1  0.0-3.6  THE PEOPLE. Navy block, diagonal periodic rain streaks already running at t=0. Four persona cards flip in, about 0.8 s each, giant type: "Aisyah, driving home." / "Kumar, on the bike." / "Mei Ling, mall car park, two kids." / "Nenek, ground floor, alone." Each figure lit by their phone. Cards fan out and settle on: "Same rain. Different risks."
S2  3.6-7.5  THE HERO. Circular wipe to deep navy. The phone rises from below with a slight 3D tilt and settles frontal. Lock screen shows a push card: "FloodWay: flood risk rising near you. Tap for your safest route." Wordmark "FloodWay" assembles with masked letter reveals. Tagline: "Know before you go."
S3  7.5-12.5  WATCH THE WATER. Push into the phone. Digital-twin view: a simple street/building cross-section, a water plane rising, a gauge in metres. At 0.3 m the green button "Navigate to Safe Shelter (PPS)" slides up with one soft pulse. Side type: "See the water level." then "Then see where to go."
S4  12.5-17.5  GET OUT THE SMART WAY. Phone eases back. Shelter map: roads, red flooded segments, a PPS pin. The green route line draws itself around the red segments, an ETA chip lands. Type: "A route that avoids flooded roads."
S5  17.5-22.0  TELL YOUR PEOPLE. A finger-tap ripple on the SOS / Family Ping button. Three family avatars appear and their status ticks turn green one by one. Type: "One tap. Let your family know."
S6  22.0-26.0  HOW IT WORKS (fast). Phone slides to the left third. Right side: a 3-node chain from CONFIG.CHAIN, default "Rain and water data" -> "Forecast service" -> "Your route and alerts", plus a pill "Community reports, AI-checked". If any CONFIG.CLAIMS entry is enabled, show it as a small metric strip under the chain.
S7  26.0-30.0  HOME SAFE + LOOP. The four persona cards return, each flipping to a green "Home safe" state. Hero phone re-centres. Line: "One glance to know if you're safe. One tap to find shelter." Then wordmark, SITE_URL, "". In the last 1.0 s everything exits to the exact S1 opening state (navy, rain running, no cards) so the loop is invisible.

## Claims policy (hard)
- The ONLY numbers allowed on screen are: 0.3 m, the on-screen gauge values that mirror the app's real twin, ETA values that mirror the app's real routing UI, and any CONFIG.CLAIMS entry with show:true AND a non-empty evidence string.
- CONFIG.CLAIMS defaults (all hidden until the team supplies evidence):
  { id:"latency", text:"<20 ms inference", show:false, evidence:"" }
  { id:"miou", text:"92.4% waterline mIoU", show:false, evidence:"" }
  { id:"horizon", text:"60-minute forecast horizon", show:false, evidence:"" }
  { id:"rf", text:"74.55% flood-risk accuracy (Random Forest, JPS rainfall data)", show:false, evidence:"" }
- Forbidden anywhere, including code comments: "Zero-IoT", "$0", "zero hardware", "99.4", "deepfake", "110 cm", "trapped", "guaranteed", "saves lives", any implication of JPS/MetMalaysia/NADMA endorsement, and any real road or mall presented as flooded.
- While S1-S5 are on screen show two small tags: "Illustrative dramatization" and "Always follow official warnings (MetMalaysia / JPS)".
- Silent by default. No audio in this phase.
