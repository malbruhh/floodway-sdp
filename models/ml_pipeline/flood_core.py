"""flood_core.py - single source of truth for features, model and inference.

Used by: training notebook, FastAPI fallback.
Contract (oldest -> newest, 15-minute steps):
    rain_mm : 24 floats   rainfall per 15-min step
    level_m : 24 floats   water depth at the sensor / gauge datum, metres
"""
from __future__ import annotations

import json
import os

import numpy as np

STEP_MIN = 15
WINDOW = 24                                   # 24 x 15 min = 6 h of history
HORIZONS_MIN = (30, 60, 120)
HORIZON_STEPS = tuple(h // STEP_MIN for h in HORIZONS_MIN)
QUANTILES = (0.1, 0.5, 0.9)
N_FEATS = 3                                   # rain, level, d(level)

try:
    import torch
    import torch.nn as nn
except ImportError:                           # backend can import constants w/o torch
    torch = None
    nn = None


def build_window_features(rain_mm, level_m) -> np.ndarray:
    rain = np.asarray(rain_mm, dtype=np.float32)
    level = np.asarray(level_m, dtype=np.float32)
    if rain.shape != (WINDOW,) or level.shape != (WINDOW,):
        raise ValueError(f"need exactly {WINDOW} values each for rain_mm and level_m")
    if not (np.isfinite(rain).all() and np.isfinite(level).all()):
        raise ValueError("NaN/inf in input window")
    dlevel = np.diff(level, prepend=level[0])
    return np.stack([rain, level, dlevel], axis=1)          # (WINDOW, 3)


if nn is not None:
    class FloodGRU(nn.Module):
        """Predicts DELTA level (m) at each horizon and quantile."""

        def __init__(self, n_feats: int = N_FEATS, hidden: int = 64):
            super().__init__()
            self.gru = nn.GRU(n_feats, hidden, num_layers=2, batch_first=True, dropout=0.1)
            self.head = nn.Sequential(
                nn.Linear(hidden, 64), nn.ReLU(),
                nn.Linear(64, len(HORIZON_STEPS) * len(QUANTILES)),
            )

        def forward(self, x):                                # x: (B, W, F)
            out, _ = self.gru(x)
            return self.head(out[:, -1]).view(-1, len(HORIZON_STEPS), len(QUANTILES))


class FloodPredictor:
    def __init__(self, model_dir: str):
        if torch is None:
            raise RuntimeError("torch is required for FloodPredictor")
        with open(os.path.join(model_dir, "meta.json")) as f:
            meta = json.load(f)
        self.mean = np.asarray(meta["mean"], dtype=np.float32)
        self.std = np.asarray(meta["std"], dtype=np.float32)
        self.model = FloodGRU(hidden=meta["hidden"])
        state = torch.load(os.path.join(model_dir, "model.pt"), map_location="cpu")
        self.model.load_state_dict(state)
        self.model.eval()
        self.version = meta.get("version", "unversioned")

    def predict(self, rain_mm, level_m) -> dict:
        x = (build_window_features(rain_mm, level_m) - self.mean) / self.std
        with torch.no_grad():
            delta = self.model(torch.from_numpy(x)[None]).numpy()[0]   # (H, Q)
        delta = np.sort(delta, axis=1)                                 # no quantile crossing
        now = float(level_m[-1])
        lvl = np.clip(now + delta, 0.0, None)
        return {
            "model_version": self.version,
            "horizons_min": list(HORIZONS_MIN),
            "level_now_m": round(now, 3),
            "p10": [round(float(v), 3) for v in lvl[:, 0]],
            "p50": [round(float(v), 3) for v in lvl[:, 1]],
            "p90": [round(float(v), 3) for v in lvl[:, 2]],
        }
