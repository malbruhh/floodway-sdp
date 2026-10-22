"""Alert fan-out. The engine creates an AlertEvent when a camera escalates to WARNING or DANGER (or drops back below WARNING: an all-clear);
the dispatcher decides whether to send it (cooldown) and pushes it to every channel."""
from __future__ import annotations

import html
import logging
import time
from typing import Protocol

import httpx

from .levels import rank
from .schemas import AlertEvent, Level

log = logging.getLogger("floodway.vision.alerts")


class AlertChannel(Protocol):
    name: str

    async def send(self, event: AlertEvent) -> None: ...


class LogChannel:
    name = "log"

    async def send(self, event: AlertEvent) -> None:
        log.warning("ALERT [%s] %s", event.level.value, event.message)


class TelegramChannel:
    """Uses the same bot variables as the rest of FloodWay (TELEGRAM_BOT_TOKEN, TELEGRAM_DEFAULT_CHAT_ID)."""

    name = "telegram"

    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id

    async def send(self, event: AlertEvent) -> None:
        icon = "DANGER" if event.level == Level.DANGER else "WARNING"
        text = (
            f"<b>FloodWay ALL CLEAR</b>\n"
            f"{html.escape(event.camera_name)}\n"
            "Water is back below the warning line. Stay alert for official instructions."
        ) if event.kind == "all_clear" else (
            f"<b>FloodWay {icon}</b>\n"
            f"{html.escape(event.camera_name)}\n"
            f"Water at {round(event.water_ratio * 100)}% of bank height.\n"
            "Open FloodWay to see evacuation routes."
        )
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json={"chat_id": self.chat_id, "text": text, "parse_mode": "HTML"})
            resp.raise_for_status()  # a rejected message must count as failed, not sent


class AlertDispatcher:
    def __init__(self, channels: list[AlertChannel], cooldown_s: int = 300):
        self.channels = channels
        self.cooldown_s = cooldown_s
        self._last: dict[str, tuple[Level, float]] = {}

    def should_send(self, event: AlertEvent, now: float | None = None) -> bool:
        if event.kind == "all_clear":  # closing an alert is never rate limited
            return True
        now = time.time() if now is None else now
        last = self._last.get(event.camera_id)
        if last is None:
            return True
        last_level, last_ts = last
        if rank(event.level) > rank(last_level):  # escalations always go out
            return True
        return now - last_ts >= self.cooldown_s

    async def dispatch(self, event: AlertEvent) -> bool:
        if not self.should_send(event):
            return False
        if event.kind == "all_clear":
            self._last.pop(event.camera_id, None)  # the next WARNING is a new event
        else:
            self._last[event.camera_id] = (event.level, time.time())
        for channel in self.channels:
            try:
                await channel.send(event)
            except Exception:  # one broken channel must never block the others
                log.exception("alert channel %s failed", channel.name)
        return True
