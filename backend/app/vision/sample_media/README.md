# FloodWay Live Vision: sample media

> **AI-generated sample imagery. Not real camera footage.**

Five sample cameras, each with **12 photographs of one fixed view** that differ only in water height (the "ladder"), so the picture on `/live` matches the number beside it. Made with an image-generation tool on 2026-10-12. The 1280x720 masters are not in git (105 MB); the files below are.

## Honesty

1. Every frame is AI-generated sample imagery. None is a real government or agency feed. The app labels the cameras SAMPLE and the loop PLAYBACK.
2. No agency name, crest, logo, vehicle livery, readable plate, readable sign, identifiable person, timestamp or watermark appears in any image.
3. The cameras are generic Malaysian urban channels, not a specific real place.

## The ladder

File `{cam}-r{NNN}.jpg`, where NNN is the nominal water height as a share of bank height times 100: `r000` is the bed, `r100` water at the bank top, `r110` overtopping. Between rungs the water rises about 0.10 of the bank (about 17 rows of 360). The app shows the rung nearest to the current reading (`nearest_rung` in `sources/frameset.py`).

| Cameras | Scene |
|---|---|
| `klang` | Concrete river channel seen down-river from a footbridge |
| `gombak` | Side-on channel wall with a staff gauge |
| `smart` | Culvert tunnel inlet with a stepped apron |
| `batu` | Riverside walkway parapet over a broad river |
| `drain` | Narrow box drain between house walls, a metal lid hiding the near floor |

Four legacy names stay as byte-identical copies: `{cam}-normal.jpg` = `r010`, `-watch` = `r040`, `-warning` = `r080`, `-danger` = `r100`. Also `frontend/public/media/live/*.webp` (960x540) and `klang-rise.mp4` (the only video: a 15 s rise and fall built from the Klang ladder).

## How the water is read

`calibration.json` holds each camera's zone (`roi`, hugging the channel) and three lines. The sample cameras are read by `ReferenceDiffAnalyzer` (`analysis/reference_diff.py`): water is what changed against the camera's own dry frame (`r000`).

- **Why not the classical analyser:** it looks for smooth coloured pixels. Photographic water is rippled and foamy (local grey-level std 13 to 54 against a cut of 4.5) and the walls are tan too, so it read 0 on every frame (2 of 12 rungs). A colour rule scored 10 of 60.
- **Limits:** it needs a fixed camera and steady light; a shadow reads as water. User-added cameras have no dry frame and keep the classical analyser. A learned segmenter (`analysis/yolo_seg.py`) trained on labelled frames is the real answer for arbitrary cameras and is not built.
- **Circularity, stated plainly:** the zone and lines were fitted to these photos, then the same photos were scored. The result shows the pipeline reads this set; it is not an accuracy figure for real cameras.

## Checks (run from `backend/`)

| Command | Result on 2026-10-12 |
|---|---|
| `python -m app.vision.sample_media.check_ladder` | PASS: klang, gombak, smart, batu 12 of 12 rungs within 0.10; drain 11 of 12; readings rise with the rungs; background drift 0.0 |
| `python -m app.vision.sample_media.check_frames` | 20 of 20 legacy frames at the intended level |
| `python -m app.vision.sample_media.check_realism` | 0 of 15 flagged as a pasted patch |
| `python -m app.vision.sample_media.export_ladder` | masters to 640x360 JPEG, 960x540 WebP and the legacy copies |
| `python -m app.vision.sample_media.make_loop` | rebuilds `klang-rise.mp4` |

`check_ladder` measures reading against the frame set. Whether the water looks real was judged by eye (contact sheets in `docs/screenshots/media-check/`).

The Drain's `r100` and `r110` differ by about 0.05 in the reading because the drain lip stops the water rising; `check_ladder` allows a 0.06 dip for that.
