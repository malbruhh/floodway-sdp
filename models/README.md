# models/

What is here, what it does, and what the app really uses. Checked 2026-10-12 by running the code, not by reading the pitch deck.

## Contents

| Folder | What it is | Used by the app? |
|---|---|---|
| `ml_pipeline/` | Water-level forecaster: `flood_core.py` (GRU, features, `FloodPredictor`), notebooks `nb1_data.py` to `nb4_terrain.py`, trained weights in `model_out/`, `terrain.json` | **No.** Nothing in `backend/` imports it |
| `legacy_ann/` | First model: a Keras ANN (`flood_detector.h5`, 8 KB `.tflite`) on the monthly rainfall CSV in `datasets/` | No. Kept as history |

Byte-identical copies of the weights used to sit beside `ml_pipeline/` (`pytorch_gru/`). They are in `docs/_to-delete/models-duplicates/`.

## The GRU forecaster (`ml_pipeline/flood_core.py`)

- **Input:** the last 24 steps of 15 minutes (6 hours): rain per step, water level in metres, and the level change. Three features, normalised with the mean and std stored in `meta.json`.
- **Model:** 2-layer GRU, hidden size 64, then a 64-unit head. 42,953 parameters.
- **Output:** the change in level at +30, +60 and +120 minutes for the 10th, 50th and 90th percentile (pinball loss). Quantiles are sorted so they never cross, and levels are clipped at 0 m.
- **Training (`nb2_train.py`):** chronological 70/15/15 split with a purge gap, baselines (persistence and sklearn `HistGradientBoostingRegressor`), early stopping, onset recall and precision for crossing 0.30 m, P10 to P90 coverage, and a leakage check that shows why a random split inflates the score. The method is sound.
- **Weights:** `gru-q-0.1.0-SYNTHETIC`. Trained on a storm generator, not on gauge data. `nb2_train.py` says "never quote its metrics". Neither this README nor the poster do.
- **Sanity run:** a calm window (0.05 m, no rain) forecasts 0.045 to 0.053 m at all horizons. A rising window (0.05 to 0.35 m with a storm) forecasts a median of 0.43, 0.48 and 0.51 m at 30, 60 and 120 minutes with P10 to P90 inside 0.07 m. The direction is right; the numbers carry no meaning because the data was synthetic.
- **Data notebook (`nb1_data.py`):** Open-Meteo ERA5 hourly rain, GloFAS river discharge, a JPS or FYP export, and the ESP32 log. The endpoints were written without a network and have not been run.
- **Terrain (`nb4_terrain.py`):** a 60 x 60 grid of 60 m cells, used by the 3D twin.

## Gaps between the pitch deck and the repo

| Deck says | Repo has | What to do |
|---|---|---|
| GRU and LightGBM ensemble | GRU plus a `HistGradientBoostingRegressor` baseline. No LightGBM, no ensemble code | Either add LightGBM and an average, or say "GRU with a gradient-boosting baseline" |
| Trained on rolling six-hour windows of rainfall and river-gauge data | The six-hour window is right (`WINDOW = 24`). The data is synthetic | Run `nb1_data.py` and `nb2_train.py` on real JPS gauge data, then re-state |
| 30, 60, 120 minute forecast in the app | `backend/app/services/forecaster.py` is a hand-written formula that labels itself "not a trained model", with horizons 15 to 120 and a danger threshold of 1.50 m | Wire `FloodPredictor` in with the formula as fallback |
| Prithvi-100M flood segmentation, 95.34% pixel accuracy, 86.96% IoU (Sen1Floods11 validation split) | No weights, notebook or evaluation script | Keep the figure with its own source line; do not attach it to the camera analyser |
| YOLOv8 crowd sentinel | `backend/app/vision/analysis/yolo_seg.py` is an optional analyser with no weights in the repo | Same as above |

A scale mismatch to resolve before wiring: `nb2_train.py` uses `DANGER_M = 0.30` and `WARN_M = 0.10` (street-level depth), while the backend formula uses a 1.50 m river danger level.

## Next steps (in order of value)

1. Add `FloodPredictor` to `forecaster.py` behind a `try`, with the formula as fallback and the label switched to "GRU, synthetic weights" while the weights are synthetic. Test both paths.
2. Get real gauge and rainfall data (JPS export or the ESP32 log), run `nb1` and `nb2`, publish measured onset recall.
3. Host the forecaster inside the backend (or any inference endpoint) once it is trained on real data.
4. Retire `legacy_ann/` once nobody needs it. Its 62.7% accuracy on 825 district-year rows (2000 to 2010) cannot say anything about flash floods.
