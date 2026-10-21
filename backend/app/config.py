import os
import json
from dotenv import load_dotenv

load_dotenv()

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8080"))

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_DEFAULT_CHAT_ID = os.getenv("TELEGRAM_DEFAULT_CHAT_ID", "")

# Default IoT station configuration
DEFAULT_DEVICES = {
    "fw-node-01": {
        "id": "fw-node-01",
        "name": "Kampung Baru Station (Klang River)",
        "secret": "fw-secret-2026",
        "mount_height_cm": 400.0,
        "lat": 3.1610,
        "lon": 101.7010,
        "warning_threshold_m": 1.20,
        "danger_threshold_m": 1.50
    },
    "fw-node-02": {
        "id": "fw-node-02",
        "name": "Taman Sri Muda Station (Klang River South)",
        "secret": "fw-secret-srimuda",
        "mount_height_cm": 450.0,
        "lat": 3.0335,
        "lon": 101.5372,
        "warning_threshold_m": 1.30,
        "danger_threshold_m": 1.65
    }
}

try:
    DEVICES = json.loads(os.getenv("DEVICES", "")) if os.getenv("DEVICES") else DEFAULT_DEVICES
except Exception:
    DEVICES = DEFAULT_DEVICES

STALE_AFTER_SECONDS = 600
MAX_SKEW_SECONDS = 120
