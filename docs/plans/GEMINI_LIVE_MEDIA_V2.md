# Live Vision Media V2 Implementation Plan

> **STATUS 2026-10-12: executed.** Gemini delivered all 60 frames and Claude ran Part 2. Deviation in Task C3: `STD_SMOOTH` was not tuned, because the measured water texture (std 13 to 54) is far above any usable cut, so the plan's own stop rule applied. Instead the sample cameras use `ReferenceDiffAnalyzer` (change against a dry frame), the zones in `calibration.json` were re-fitted to the new photos, and `waterline.py` gained `row_fraction` and `gap_rows`. Results and limits: `backend/app/vision/sample_media/README.md`.

> **For agentic workers:** Part 1 (sections 0 to 9) is for **Gemini 3.8 Flash (high)** in Antigravity. Part 2 (section 10) is for **Claude Code**, after Gemini reports. Steps use checkbox (`- [ ]`) syntax. Update `docs/ai/PROGRESS.md` when a task is done.

**Goal:** Replace the 20 smudged, pasted-looking sample frames with a 12-rung ladder of photorealistic frames per camera (60 frames), where the water surface in each frame sits at the height the app says it does.

**Architecture:** Each of the 5 sample cameras gets one fixed photographic view. The image tool renders 12 versions of it, 0.10 of bank height apart (rungs `r000` to `r110`), changing only the water. The app then shows the rung nearest to the current reading, so the picture and the "81% of bank" number agree. Helper scripts (already in the repo) export, verify and animate the set.

**Tech Stack:** Gemini image generation and editing (Nano Banana class tool exposed in Antigravity), Python 3 with OpenCV (backend venv), ffmpeg 8 (installed), FastAPI backend, React 19 and Vite frontend.

**Spec:** The user's request of 2026-10-12 (see section 1) and the analyser maths in `backend/app/vision/levels.py` and `backend/app/vision/analysis/waterline.py`.

## Global Constraints

- Every image is **AI-generated sample imagery**, never a real feed. Say so in `sample_media/README.md` and in each file's metadata comment.
- No agency name, crest, logo, uniform, livery, flag, readable plate, readable sign, identifiable face, timestamp, watermark or on-screen text inside any image. The app draws its own labels.
- Output sizes: master PNG **1280x720**; backend JPEG **640x360** (at most 300 KB); frontend WebP **960x540** (at most 150 KB).
- Same camera, same framing, same light in all 12 rungs of one camera. Only the water changes.
- Gemini writes only to `backend/app/vision/sample_media/`, `frontend/public/media/live/` and `docs/screenshots/media-check/`. Everything else is a request in the report.
- Never change `levels.py`, the analyser, thresholds or calibration maths to make a check pass. Never blur, smooth or tint a frame to satisfy the analyser.
- No API key, no paid service, unless the user supplies one in the session.
- Branch: `live-ui-upgrade`. Do not commit; leave the working tree for review.

## Review Focus

The inputs and failure modes most likely to bite, each pinned to a task below.

- **Image tool redraws the whole scene per rung** (trees move, walls change). Pinned by `check_ladder.py` drift in Task G4.
- **Water looks like a smudge or a flat colour patch.** Pinned by `check_realism.py` and the human review in Task G5.
- **The reading does not rise with the rungs** (two rungs look alike, or one is too high). Pinned by `check_ladder.py` order and error in Task G4.
- **Photoreal ripples defeat the classical analyser** (it wants smooth water, `STD_SMOOTH = 4.5`). If this happens, Gemini reports it and Claude adapts the analyser (Task C3). Gemini must not blur the water to cheat.
- **One camera's scene is wrong for its job** (the Drain scene is a cartoon today). Pinned by the scene brief in section 4 and the review in Task G5.
- **File size or naming drift** breaks `test_media_files_stay_within_the_size_limits` or the legacy names. Pinned by `export_ladder.py` in Task G4.

---

## 0. Copy-paste block for Gemini

```
ROLE: You create AI-generated sample photographs for the FloodWay flood demo (Malaysia). You do NOT change application code.

READ FIRST: sections 1 to 5 of docs/plans/GEMINI_LIVE_MEDIA_V2.md.

DO, IN THIS ORDER
1. Start with camera CAM-KLANG (it also becomes the demo video), then DRAIN, SMART, GOMBAK, BATU.
2. For each camera follow Tasks G1 to G6 (section 6). Save masters to backend/app/vision/sample_media/master/{cam}-r{NNN}.png.
3. Run the three scripts in section 7 from backend/. Report the real numbers. Do not edit the scripts' thresholds.
4. Build the Klang loop with make_loop.py (section 8).
5. Take the verification screenshots (section 8.2).
6. Reply with the report in section 9.

HARD RULES
- Use your image generation / image editing tool. If you have none, STOP and say so. Do NOT draw water in code, paste rectangles, or blur patches.
- Water is photographic: it meets the walls along an irregular wet line, it is turbid brown, it has ripples, foam and reflections.
- All 12 images of one camera share one viewpoint. If your tool drifts the background, composite per section 6 Task G3.
- No text, logos, plates, faces, watermarks, timestamps. No agency branding.
- Write only to: backend/app/vision/sample_media/, frontend/public/media/live/, docs/screenshots/media-check/.
```

---

## 1. What the user reported, and what the code shows

| # | User said | Cause (verified) |
|---|---|---|
| 1 | "Images are bad and do not match the threshold of rising water." | The app has only **4 photos per camera** (`sources/frameset.py` `FrameSetSource`, `level_for_ratio`). A reading of 81% shows the WARNING photo, whose waterline is nowhere near 81%. The picture and the number disagree by up to 35 points. |
| 2 | "Why is there a box inside the image?" | Two causes. (a) The **water in the frames is a smudged patch** made by `make_water.py` (mirrored, blurred band), and in the Drain scene it is a rectangle over a vector drawing. (b) The page **draws its own overlays on top by default**: `DEFAULT_OVERLAYS = { roi: true, lines: true, mask: true, waterline: true }` in `frontend/src/components/live/feed/OverlayToggles.tsx:12`. `roi` is the dashed white zone outline and `mask` is the teal fill of the detected water. Together they look like a box in the picture. |
| 3 | "Recreate the media so it looks like a real camera." | Section 4 onward. |

Evidence: a 5 x 4 montage of the current frames (blur smears on every WATCH, WARNING and DANGER frame; water never climbs the walls; the SMART tunnel water stops short of the arch; Drain is a flat vector scene with a blurred rectangle).

---

## 2. The ladder: what "the water is at 0.60" means in a picture

The analyser (`waterline.py`) takes the **topmost image row where at least half of the zone's width is water**, and converts it to a ratio against the zone bottom (the bed) and the danger line (the bank top):

```
ratio = (bed_y - water_y) / (bed_y - danger_y)        0 = bed, 1 = bank top
```

With the current calibration (`bed_y = 0.94`, `danger_y = 0.48`, `normal = 0.82`, `warning = 0.65` as fractions of image height) the target waterline row for rung `r` is `y = 0.94 - 0.46 * r`:

| Rung file | Nominal ratio | y (fraction) | Row in 640x360 | Row in 1280x720 | Level the app shows |
|---|---|---|---|---|---|
| `r000` | 0.00 | 0.940 | 337 | 676 | NORMAL (dry bed, a trickle) |
| `r010` | 0.10 | 0.894 | 321 | 643 | NORMAL (**legacy `normal`**) |
| `r020` | 0.20 | 0.848 | 304 | 610 | NORMAL |
| `r030` | 0.30 | 0.802 | 288 | 577 | ADVISORY |
| `r040` | 0.40 | 0.756 | 271 | 544 | ADVISORY (**legacy `watch`**) |
| `r050` | 0.50 | 0.710 | 255 | 510 | ADVISORY |
| `r060` | 0.60 | 0.664 | 238 | 477 | ADVISORY (just under WARNING at 0.63) |
| `r070` | 0.70 | 0.618 | 222 | 444 | WARNING |
| `r080` | 0.80 | 0.572 | 205 | 411 | WARNING (**legacy `warning`**) |
| `r090` | 0.90 | 0.526 | 189 | 378 | WARNING |
| `r100` | 1.00 | 0.480 | 172 | 345 | DANGER, water at the bank top (**legacy `danger`**) |
| `r110` | 1.10 | 0.434 | 156 | 312 | DANGER, overtopping |

Level boundaries (from `levels.py`): ADVISORY at 0.26, WARNING at 0.63, DANGER at 0.97. The app draws Normal at row 294, Warning at 233 and Danger at 172 (640x360).

**Important:** the row is where the water surface meets the **channel walls or banks** in the scene, in the zone the analyser looks at (`calibration.json` `roi`). In a view that recedes into the distance the far water is higher in the picture than the near water; that is correct. What matters is that the **zone** reads the right ratio (Task G4 checks this with the real analyser).

If a camera's geometry cannot hit these rows, Gemini may **re-fit that camera's `roi` and `lines` in `calibration.json`** to the physical channel (bed row, bank-top row) and recompute the rows with the same formula. It must say so in the report. It may not change `levels.py` or `DANGER_AT`.

Legacy names stay: `{cam}-normal.jpg`, `-watch.jpg`, `-warning.jpg`, `-danger.jpg` are **byte-identical copies** of `r010`, `r040`, `r080`, `r100`. `export_ladder.py` makes them. This keeps `check_frames.py`, the report modal (`LiveCCTVModal.tsx` reads `-normal.webp`) and the vector fallback working.

---

## 3. Honesty and content rules (mandatory)

1. Put the phrase **"AI-generated sample imagery. Not real camera footage."** in `sample_media/README.md`, in the loop's description and in each WebP's comment.
2. The app labels cameras `SAMPLE` and the loop `PLAYBACK`. Draw no label into any image.
3. No agency name, crest, uniform, vehicle livery, flag or sign with a government name.
4. No readable number plates, names, phone numbers or street signs. Signs are blank or unreadable.
5. No identifiable people. If a person appears: tiny, back turned, no face.
6. Generic Malaysian urban channels, drains and culverts. Do not copy a recognisable landmark.
7. Do not describe any frame as real or live in any file.

---

## 4. The five cameras (scene briefs)

Shared look for all five: fixed CCTV or pole-mount camera, slightly wide lens, no fisheye, 16:9. Tropical overcast monsoon daylight, soft shadows, mild haze, no night, no infrared, no rain streaks on the lens. Real concrete texture (stains, hairline cracks, moss at the base, wet darkening). Sparse tropical greenery (palms, ferns, grass, creepers). Light litter. Natural sensor grain, very slight JPEG softness.

| Cam id | App name | Scene | Camera position | What changes from r000 to r110 |
|---|---|---|---|---|
| `sample-klang-jamek` (`klang`) | Sg. Klang @ Masjid Jamek | Deep concrete river channel with stepped, stained walls, a pedestrian footbridge deck across the top of the frame, palms on both banks, distant low-rise skyline in haze | Elevated, on the bridge, looking down-river, slight downward tilt. **Keep the existing `klang-normal` photo as the r010 anchor** if it passes the review; it is the best frame in the set | Shallow brown stream between sandbars, then water filling the channel floor, lapping the wall steps, then reaching the top of the walls and spilling toward the grass |
| `sample-gombak-tun-razak` (`gombak`) | Sg. Gombak @ Jln Tun Razak | Side-on straight concrete channel wall with a **staff gauge** (a white and red measuring rod bolted to the wall, digits too small to read), vegetation above, an elevated road and towers far behind | Side-on, eye level, 20 m from the wall | Water climbs the wall and the gauge: the lower gauge marks go under at r030, the middle at r070, the top at r100 |
| `sample-smart-tunnel` (`smart`) | SMART Tunnel entrance | Large concrete culvert or tunnel inlet with a dark arched mouth, wing walls, a stepped concrete apron in front, a guard rail and trees beside it. No signage | Low, from the road side, looking into the inlet | Thin runoff on the apron, then a pool filling the apron, then water rising to the lip of the arch (r100) and flowing into the mouth, with the arch darkening where it is submerged |
| `sample-batu-sentul` (`batu`) | Sg. Batu @ Sentul | Riverside walkway: low concrete parapet along the bottom of the frame, a broad concrete-lined river beyond with grassy lower banks, thick tropical trees and hazy towers behind | Low angle, close to the walkway rail | Low water with exposed bank, then the lower bank covered, then the river brimming at the parapet line (r100) with brown rapids |
| `sample-kampung-baru-drain` (`drain`) | Kampung Baru Drain | **Replace the cartoon.** A narrow urban concrete box drain (about 2 m wide) running between the back walls and fences of older low-rise Malay houses, with a heavy metal grating covering part of the near end and a utility pole and cables above. No signs | High pole mount, looking down the drain at about 35 degrees | A dry or trickling floor, then brown water filling the drain, wetting the walls up to the upper lip, then overtopping the near edge (r100 and above), with debris caught on the grating |

**Why the Drain needs the most care:** the user's screenshots show it as a flat grey cartoon with a green circle at each side and a blurred rectangle. The new scene must read as a photograph at thumbnail size (100x60). Give the water strong contrast against the concrete (brown against light grey) so the waterline is visible at a glance.

---

## 5. Prompt kit

### 5.1 Water realism checklist (include in every prompt, and use in review)

Water is: turbid café-au-lait to chocolate brown (browner as it rises), with sediment swirls; rippled with small standing waves, longer ripples in the direction of flow; foamy at walls, pillars and the grating; carrying a little debris (palm frond, plastic bottle, branch, polystyrene) that is larger at higher rungs; reflecting the grey sky as soft streaks; meeting walls along an **irregular, slightly wavy wet line** with a darker wet band on the concrete just above it (the tide mark); hiding submerged features progressively (steps, gauge marks, drain outlets, the tunnel invert); in correct perspective (the surface recedes to the vanishing point, never a flat overlay).

Water is **not**: a translucent tinted rectangle, a blurred smear, a uniform colour, a perfectly straight horizontal line across the frame, a ghosted double edge, a wet halo on walls above the line, or water on sky, trees or fences.

### 5.2 Master prompt for the r010 frame of each camera

```
A real-looking photograph from a fixed CCTV-style camera, 16:9, wide lens, of {SCENE}, taken from {CAMERA_POSITION}.
Malaysian urban setting, tropical overcast monsoon daylight, mild haze, soft natural shadows.
Weathered stained concrete, moss at the base, sparse tropical vegetation, a little litter.
Water level: low. A shallow brown stream occupies the bottom of the channel, about one tenth of the wall height.
Photographic realism, natural sensor grain, no illustration or CGI look, no text, no logos, no signs, no number plates,
no people, no watermark, no timestamp, no on-screen display.
```

### 5.3 Edit prompt for every other rung

Use the r010 master (or the previous rung) as the image input. Send a mask of the channel if the tool accepts one.

```
Edit this photograph. Keep the camera position, framing, lens, lighting, sky, vegetation, buildings, walls and every
object exactly as they are, pixel for pixel outside the water. Change only the water.
New water level: the water surface meets the channel walls at {PERCENT}% of the wall height measured from the channel
floor (the wall top is 100%). In this image that is about row {ROW} of 720.
{LEVEL_NOTES}
Follow the water realism checklist: turbid brown, ripples, foam at the walls, irregular wet line, darker wet band on the
wall just above the waterline, reflections of the grey sky, perspective-correct surface, submerged details hidden.
Do not add any box, rectangle, border, label, blur patch or tint outside the channel.
```

`{LEVEL_NOTES}` examples: r030 "shallow flow covers the channel floor, steps just wet"; r060 "water is brown and moving, the lower wall is dark and wet"; r080 "turbulent, foam along the walls, debris on the surface"; r100 "water level with the top edge of the wall, nearly overtopping, fast and rough"; r110 "water spilling over the wall top onto the grass, very rough".

---

## 6. Per-camera workflow (repeat for each of the 5 cameras)

### Task G1: Create the master (r010)

**Files:**
- Create: `backend/app/vision/sample_media/master/{cam}-r010.png` (1280x720)

- [ ] **Step 1:** Generate 4 candidates from the section 5.2 prompt. Save them to `docs/screenshots/media-check/candidates/{cam}-*.png` (scratch, not shipped).
- [ ] **Step 2:** Pick the best by this rubric, each yes or no: reads as a photograph; scene matches section 4; no text, plates, faces; the channel walls (or banks) are clear enough to read a waterline against; the camera view leaves room for water to rise 11 steps without leaving the frame. Reject any that fail.
- [ ] **Step 3:** Save the winner as `master/{cam}-r010.png`. For `klang`, keep the existing `klang-normal.jpg` upscaled if it passes; otherwise regenerate.

### Task G2: Mark the bed and the bank top

- [ ] **Step 1:** On the 1280x720 master, find (a) `bed_row`: the row where the water meets the near wall or bank at r010 plus the extra height down to the channel floor at r000, and (b) `bank_top_row`: the row of the top edge of the wall or bank where water would spill.
- [ ] **Step 2:** Compute the target rows with `row(r) = bed_row - r * (bed_row - bank_top_row)` for `r = 0.0, 0.1 ... 1.1`. If the result is close to the table in section 2 (within 20 rows of 720), use the table. Otherwise re-fit `roi` and `lines` for that camera in `calibration.json` (bed at the bottom of `roi`, `lines.danger` at `bank_top_row / 719`, `lines.warning` at `row(0.63) / 719`, `lines.normal` at `row(0.26) / 719`) and write the new table into the report.
- [ ] **Step 3:** Write the camera's table into `docs/screenshots/media-check/{cam}-rows.txt`.

### Task G3: Render rungs r000 and r020 to r110

**Files:**
- Create: `backend/app/vision/sample_media/master/{cam}-r{000,020,030,...,110}.png`

- [ ] **Step 1:** Render r040 first, then r080, r100, r060, r030, r020, r050, r070, r090, r110, r000. (Anchors first keeps the ladder honest.) Use the section 5.3 prompt with the row from G2.
- [ ] **Step 2 (drift fix, only if needed):** If `check_ladder.py` reports drift above 8 for this camera, composite: keep the r010 pixels everywhere outside a feathered channel mask, and take the edited pixels inside it. The mask follows the real channel and wall edges (hand-traced polygon, feather at least 12 px in 1280x720). **Never a rectangle.** Save the composite as the rung.
- [ ] **Step 3:** Open each rung beside its neighbours. The water must rise by a visible, even step each time (about 33 rows of 720 per rung). Reject a rung that is darker, lighter, or redrawn compared with its neighbours, and regenerate it.

### Task G4: Export and measure

- [ ] **Step 1:** Run from `backend/`:

```bash
python -m app.vision.sample_media.export_ladder
python -m app.vision.sample_media.check_ladder
```

Expected after a good set: `PASS: every camera reads correctly, in order, with a steady background`. For each camera the line `reading` shows 10 to 12 of 12 within 0.1, `order ok`, and `worst drift` below 8.

- [ ] **Step 2:** If a camera fails, fix the **frames**, not the check: regenerate the rungs that read wrong (the table prints measured against nominal), keep the waterline on the target row, then re-export and re-run.
- [ ] **Step 3:** If a camera still fails because the realistic water texture defeats the classical analyser (measured ratios jump or read 0 on rungs that look correct), **stop for that camera**, keep the frames, and put the printed table in the report under "Analyser cannot read these frames". Claude handles it in Task C3. Do not blur or smooth the water.
- [ ] **Step 4:** Run the existing checks. They must still pass:

```bash
python -m app.vision.sample_media.check_frames
python -m app.vision.sample_media.check_realism
python -m pytest tests/test_sample_media.py -q
```

`check_frames` prints `TOTAL 20/20`. `check_realism` flags 0 frames. If `check_realism` flags a frame, that frame still has a pasted-patch look: regenerate it.

### Task G5: Human review of each camera

- [ ] **Step 1:** Build a contact sheet (3 rows x 4 columns, r000 to r110, 320x180 each) with a short Python script and save it as `docs/screenshots/media-check/{cam}-sheet.jpg`.
- [ ] **Step 2:** Review it against the section 5.1 list. Answer yes or no for each of: reads as a photograph; water meets the walls along a wavy wet line; water gets browner and rougher as it rises; no smudge; no box, border or tint outside the channel; background identical in all 12; Drain only: reads as a real drain at 100x60 pixels.
- [ ] **Step 3:** Any "no" means regenerate that rung and repeat G4. Put the yes/no list in the report.

### Task G6: Metadata and README

- [ ] **Step 1:** Set each WebP's comment to `AI-generated sample imagery. Not real camera footage.` (`exiftool -Comment=...`, or skip with a note in the report if exiftool is missing).
- [ ] **Step 2:** Rewrite `backend/app/vision/sample_media/README.md`: the honesty block, the ladder table from section 2, the per-camera scene, the real `check_ladder` output, and the date. Remove any claim that the water is procedural.

---

## 7. The scripts (already in the repo; do not edit thresholds)

| Script | What it does | Run from `backend/` |
|---|---|---|
| `export_ladder.py` | Masters (PNG) to 640x360 JPEG and 960x540 WebP, plus the four legacy copies. | `python -m app.vision.sample_media.export_ladder` |
| `check_ladder.py` | Real analyser against every rung: error, order, background drift, legacy copies. | `python -m app.vision.sample_media.check_ladder` |
| `check_frames.py` | The four legacy levels classify at the intended level. | `python -m app.vision.sample_media.check_frames` |
| `check_realism.py` | Flags pasted-rectangle patches. | `python -m app.vision.sample_media.check_realism` |
| `make_loop.py` | Klang rise-and-fall loop from the ladder. | `python -m app.vision.sample_media.make_loop` |

`make_water.py` (the procedural generator) is **retired**: do not run it. It rebuilds the WATCH, WARNING and DANGER frames as the smudge and would overwrite the legacy copies. Claude deletes it in Task C4.

---

## 8. Loop video and screenshots

### 8.1 The loop

- [ ] **Step 1:** After the Klang ladder passes, run `python -m app.vision.sample_media.make_loop`. It writes `frontend/public/media/live/klang-rise.mp4` (H.264, 640x360, 25 fps, about 15 s, no audio) and `klang-rise-poster.webp`.
- [ ] **Step 2:** Check: file under 3 MB; the water rises steadily for 10 s and falls for 5 s; no flicker or jump at the loop point; no ghosted double waterline. If the dissolve looks ghosted, regenerate two extra rungs between the worst pair (for example `r055` and `r065`) and tell Claude to extend the ladder.
- [ ] **Step 3 (optional):** If Antigravity has a video model, you may render the loop with it instead, using the Klang ladder frames as keyframes. The result must still pass step 2. Do not use a video tool that adds a watermark.

### 8.2 Verification screenshots

Start the app (`backend`: `python run.py`; `frontend`: `npm run dev`), open `/live`, and save to `docs/screenshots/media-check/`:

- [ ] `live-390-klang.png` and `live-1366-klang.png`: the feed at three different readings (use `VISION_SAMPLE_CLOCK_OFFSET_S` to reach them).
- [ ] `live-390-drain.png`: the Drain thumbnail and feed.
- [ ] One screenshot per camera card row showing all five thumbnails.

---

## 9. Report back (Gemini)

Reply with exactly this:

```
MEDIA REPORT
1. Cameras completed: [list], not completed: [list and why]
2. Image tool used: [name]; any step done by hand or in code: [list or "none"]
3. check_ladder output (paste it)
4. check_frames, check_realism, pytest output (last 3 lines each)
5. Per-camera review answers (section 6, G5 step 2) for all 5
6. Calibration changes: [camera, old roi/lines, new roi/lines, why] or "none"
7. Analyser cannot read these frames: [camera and rungs, or "none"]
8. Files written (counts): masters __, jpg __, webp __, video __, screenshots __
9. Requests for Claude (code changes you think are needed)
10. Anything you could not verify
```

---

# Part 2: Claude Code tasks (after the Gemini report)

Run these on branch `live-ui-upgrade`. Backend commands use the venv: `backend\.venv\Scripts\python.exe`.

### Task C1: Show the rung that matches the reading

**Files:**
- Modify: `backend/app/vision/sources/frameset.py` (constants, `FrameSetSource`)
- Modify: `backend/app/vision/seed.py` (`load_frames` neighbour, `build_sample_source`)
- Test: `backend/tests/test_sample_media.py`

**Interfaces:**
- Produces: `nearest_rung(ratio: float) -> int` (0 to 11); `FrameSetSource(..., ladder: Optional[Mapping[int, np.ndarray]] = None)`; `seed.load_ladder(prefix: str, media_dir: Path = MEDIA_DIR) -> Optional[dict[int, np.ndarray]]`.

- [ ] **Step 1: Write the failing tests** (append to `backend/tests/test_sample_media.py`; it already imports `np`, `seed`, `FrameSetSource`, `LEVELS`)

```python
from app.vision.sources.frameset import RUNG_COUNT, nearest_rung


def _ladder():
    return {i: np.full((36, 64, 3), i * 20, np.uint8) for i in range(RUNG_COUNT)}


def _four():
    return {k: np.zeros((36, 64, 3), np.uint8) for k in LEVELS}


def test_nearest_rung_rounds_to_tenths_and_clamps():
    assert [nearest_rung(x) for x in (-0.2, 0.0, 0.04, 0.06, 0.56, 1.09, 1.5)] == [0, 0, 0, 1, 6, 11, 11]


def test_frameset_shows_the_rung_matching_the_reading():
    src = FrameSetSource(_four(), (0.26, 0.63, 0.97), 0.62, 0.62, 100, ladder=_ladder(), noise_sigma=0, clock=lambda: 0.0)
    frame = src.grab_frames(1, 0)[0]
    assert int(frame[0, 0, 0]) == 6 * 20          # ratio 0.62 -> rung 6


def test_frameset_rejects_an_incomplete_ladder():
    ladder = _ladder()
    del ladder[5]
    with pytest.raises(ValueError):
        FrameSetSource(_four(), (0.26, 0.63, 0.97), 0.1, 0.9, 100, ladder=ladder)


@needs_media
def test_every_sample_camera_has_a_full_ladder():
    for prefix in ("klang", "gombak", "smart", "batu", "drain"):
        ladder = seed.load_ladder(prefix)
        assert ladder is not None and len(ladder) == RUNG_COUNT, prefix
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd backend; .venv\Scripts\python.exe -m pytest tests/test_sample_media.py -q`
Expected: collection error `cannot import name 'RUNG_COUNT'`.

- [ ] **Step 3: Implement in `frameset.py`** (add below `LEVELS`; replace `__init__` signature, `ratio_at` neighbour `grab_frames`)

```python
RUNG_STEP = 0.10
RUNG_COUNT = 12   # r000 .. r110: nominal ratios 0.0, 0.1 ... 1.1


def nearest_rung(ratio: float) -> int:
    """Index 0..11 of the ladder photo whose nominal ratio is closest to `ratio`."""
    return min(RUNG_COUNT - 1, max(0, round(ratio / RUNG_STEP)))
```

In `FrameSetSource.__init__` add the parameter `ladder: Optional[Mapping[int, np.ndarray]] = None` (import `Optional`) after `noise_sigma`, and after the `missing` check:

```python
        if ladder is not None and sorted(ladder) != list(range(RUNG_COUNT)):
            raise ValueError(f"ladder must have rungs 0..{RUNG_COUNT - 1}")
        self.ladder = {k: np.asarray(v) for k, v in ladder.items()} if ladder is not None else None
```

Replace the body of `grab_frames`:

```python
        t0 = self.clock()
        return [self._noisy(self._photo_at(t0 + i * gap_s)) for i in range(n)]

    def _photo_at(self, t: float) -> np.ndarray:
        if self.ladder is not None:
            return self.ladder[nearest_rung(self.ratio_at(t))]
        return self.frames[self.level_at(t)]
```

In `seed.py` add (after `load_frames`), and pass it through `build_sample_source`:

```python
def load_ladder(prefix: str, media_dir: Path = MEDIA_DIR) -> Optional[dict[int, "cv2.Mat"]]:
    """The 12 ladder photos (r000 .. r110) for a camera, or None if any is missing or unreadable."""
    ladder = {}
    for i in range(RUNG_COUNT):
        img = cv2.imread(str(media_dir / f"{prefix}-r{i * 10:03d}.jpg"))
        if img is None:
            return None
        ladder[i] = img
    return ladder
```

Import `RUNG_COUNT` with `LEVELS` from `.sources.frameset`. In `build_sample_source`, change the construction to
`src = FrameSetSource(frames, (thr.normal, thr.warning, thr.danger), lo, hi, period, phase, seed=seed, ladder=load_ladder(prefix, media_dir))`.

- [ ] **Step 4: Run to verify they pass**

Run: `cd backend; .venv\Scripts\python.exe -m pytest -q`
Expected: all pass (the previous count plus 4), no new xfail.

- [ ] **Step 5: Commit**

```bash
git add backend/app/vision/sources/frameset.py backend/app/vision/seed.py backend/tests/test_sample_media.py backend/app/vision/sample_media
git commit -m "feat(vision): show the ladder photo that matches the water reading"
```

### Task C2: A clean picture by default

**Files:**
- Modify: `frontend/src/components/live/feed/OverlayToggles.tsx:12`
- Test: `frontend/src/__tests__/vision.test.ts`

- [ ] **Step 1: Write the failing test** (append to `vision.test.ts`)

```ts
import { DEFAULT_OVERLAYS } from '../components/live/feed/OverlayToggles';

describe('feed overlays', () => {
  it('shows the photo clean by default: reference lines and waterline only', () => {
    expect(DEFAULT_OVERLAYS).toEqual({ roi: false, lines: true, mask: false, waterline: true });
  });
});
```

- [ ] **Step 2:** Run `cd frontend; npx vitest run src/__tests__/vision.test.ts`. Expected: FAIL (`roi` and `mask` are `true`).
- [ ] **Step 3:** Change line 12 to `export const DEFAULT_OVERLAYS: OverlayState = { roi: false, lines: true, mask: false, waterline: true };`. The Zone and Mask toggles stay, so a judge can turn the analysis view on.
- [ ] **Step 4:** Run `npm run check`. Expected: tsc clean, all tests pass, build succeeds.
- [ ] **Step 5:** Capture `/live` at 390x844 and 1366x768 with the real backend. Confirm no dashed box, no teal fill, three labelled lines and the waterline visible. Commit: `git commit -am "feat(live): show the photo clean by default, analysis overlays on demand"`.

### Task C3: Adapt the analyser only if Gemini's frames defeat it

Run only if the Gemini report section 7 is not "none".

**Files:**
- Modify: `backend/app/vision/analysis/classical.py:17` (`STD_SMOOTH`) or the smoothness step
- Test: `backend/tests/test_sample_media.py`

- [ ] **Step 1: Measure.** On three cameras, take the water region of rung `r050` (rows between the target row and the bed, inside the zone) and print the 50th, 90th and 95th percentile of the local grey std that the analyser computes:

```python
import cv2, numpy as np
f = cv2.imread("backend/app/vision/sample_media/gombak-r050.jpg"); g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
m, s = cv2.blur(g, (7, 7)), cv2.blur(g * g, (7, 7)); std = np.sqrt(np.maximum(s - m * m, 0))
y0, y1 = 255, 337                      # rows of the water at r050 for this camera (640x360)
print(np.percentile(std[y0:y1, 150:480], [50, 90, 95]))
```

- [ ] **Step 2:** If the 90th percentile of water std is between 4.5 and 9, set `STD_SMOOTH` to the rounded 90th percentile **measured on three cameras** and verify on the other two (hold-out). If it is above 9, stop and tell the user the classical analyser cannot read realistic water; the honest fix is the YOLO segmentation analyser (`analysis/yolo_seg.py`) with labelled frames, which is outside this plan.
- [ ] **Step 3:** Re-run `check_ladder`, `check_frames`, `check_realism`, `pytest -q`. All must pass without any frame edit. Add a test that the 20 legacy frames still classify (`test_each_photo_classifies_at_its_level_even_with_sensor_noise` already does).
- [ ] **Step 4:** Commit: `git commit -am "fix(vision): calibrate the smoothness cut to measured water texture"`.

### Task C4: Clean up and record

- [ ] **Step 1:** Delete `backend/app/vision/sample_media/make_water.py` and the `check_realism` note in `README.md` that says the check fails.
- [ ] **Step 2:** Update the comment in `frontend/src/lib/vision/demoMedia.ts:2` to point at `docs/plans/GEMINI_LIVE_MEDIA_V2.md`.
- [ ] **Step 3:** Run `powershell -File scripts/check.ps1`. Expected: `All checks passed.`
- [ ] **Step 4:** Add the results (check numbers, branch, date) to `docs/ai/PROGRESS.md` under "Done", and move this plan's row in "Open work" to done.

---

## Self-review

- **Spec coverage:** realistic media (sections 4, 5, 6), thresholds that match the water (sections 2, 7, Task C1), the box in the image (section 1 cause (b), Task C2), best quality (G5 review, check_realism), five cameras including the broken Drain (section 4), the loop (section 8), and a hand-off to Claude for the code (Part 2). Covered.
- **Placeholder scan:** the only variable text is `{SCENE}`, `{CAMERA_POSITION}`, `{PERCENT}`, `{ROW}` and `{LEVEL_NOTES}` inside prompt templates, which section 4 and 5.3 fill per camera and rung.
- **Type consistency:** `RUNG_COUNT`, `nearest_rung`, `load_ladder` and `ladder` are spelled the same in the tests, in `frameset.py` and in `seed.py`. Rung file names `{cam}-r{NNN}.jpg` match `export_ladder.py`, `check_ladder.py` and `make_loop.py`.
- **Known limit:** `check_ladder` proves the analyser reads the frames and the background holds still. It does not prove the water looks real; that is the human review in G5.
