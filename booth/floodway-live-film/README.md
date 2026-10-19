# FloodWay: Live Vision film (45 s, 1920x1080)

A motion piece for the booth, the pitch and social posts. It shows the product, not a disaster: the water rises in a real
Live Vision camera frame while the reading and the level change with it, then the route bends around the flood, the
alert lands on the phone, and the film ends on the brand and a QR code to the live demo.

| Output | What it is |
|---|---|
| `index.html` | Self-contained film (fonts and images embedded, no network). Open in Chrome: Space pauses, F is fullscreen, `?t=19` starts at 19 s, `?debug` shows the time. |
| `out/floodway-live-vision.mp4` | Silent master: H.264 High, 1920x1080, 30 fps, 1,350 frames, 45.000 s, BT.709. |
| `out/floodway-live-vision-sound.mp4` | The same video stream (copied, not re-encoded) with the procedural score. |
| `out/score.wav` | The score alone (48 kHz stereo). |

## Story (seven beats)

| Time | Beat | Why it is there |
|---|---|---|
| 0 to 4.7 | **Hook.** "In Kuala Lumpur, a flash flood can turn dangerous in under 45 minutes." Rain, water creeping up the frame. | Urgency and loss aversion in the first 3 seconds. |
| 4.5 to 10.4 | **The gap.** 78% got no local warning; closures take hours; GPS is water-blind. Turn: "But the city already has cameras." | A problem the viewer recognises, then a curiosity gap. |
| 10.2 to 21.2 | **Live Vision.** A Klang camera frame: water rises 10% to 104% while the number, the level pill and the bar change NORMAL, ADVISORY, WARNING, DANGER. | The hero proof: picture and number move together. |
| 21.0 to 28.8 | **Safe routing.** Camera pin, flood zone, the direct route crosses it and is struck out, the safe route draws around, "+4.2 min detour". | Relief after tension. |
| 28.6 to 34.8 | **Alert in hand.** The real app screen, a notification, a family ping (Sending, Delivered, Seen). | Personal stakes: "one glance, one tap". |
| 34.6 to 40.2 | **Impact.** Kampung Baru 1:00 AM timeline (90 minutes of lead time), then 100% flood hazard avoidance in simulated scenarios. | Concrete story, then the number (peak). |
| 40.0 to 45.0 | **Brand.** Logo, "Predict. Verify. Guide. Before the road disappears.", QR to the live demo, team line, fade to navy. | A clear ending and call to action (end). |

Motion rules: entrances outExpo, exits inCubic and faster than entrances, one continuous camera push across scenes
(each scene arrives from 1/1.08 scale and leaves with a push-through), staggered masked type, no scale from zero.

## Honesty on screen

- The camera frames are the app's sample ladder: "SAMPLE · AI-generated scene" stays on the frame.
- The map is labelled "Illustrative map. Demo relief centre."
- The impact beat carries "Scenario and simulated results. Not yet field-validated."
- Figures come from the pitch deck (78%, 45 minutes, 90 minutes, +4.2 min, 100% in simulated scenarios).

## Rebuild

```bash
node build.mjs                    # index.html from src/ (needs ../floodway-loop/node_modules for the Outfit fonts)
node render.mjs --stills          # review stills in out/stills/
node render.mjs                   # out/floodway-live-vision.mp4 (about 30 minutes on this laptop)
..\..\backend\.venv\Scripts\python.exe make_score.py
ffmpeg -y -i out/floodway-live-vision.mp4 -i out/score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest out/floodway-live-vision-sound.mp4
```

Sources: `src/shell.html` (styles and stage), `src/scenes.html` (the seven scenes), `src/film.js` (timing, easing, setup),
`src/film-scenes.js` (per-scene choreography and playback). Images are read at build time from
`frontend/public/media/live/klang-r*.webp`.
