import html
import httpx
import logging
from app.config import TELEGRAM_BOT_TOKEN, TELEGRAM_DEFAULT_CHAT_ID

logger = logging.getLogger("FloodWayNotifier")

class Notifier:
    def __init__(self):
        self.tg_token = TELEGRAM_BOT_TOKEN
        self.tg_chat_id = TELEGRAM_DEFAULT_CHAT_ID

    async def send_telegram(self, text: str, chat_id: str | None = None) -> bool:
        target = chat_id or self.tg_chat_id
        if not self.tg_token or not target:
            logger.info("Telegram notification simulated (Token or Chat ID not configured): %s", text)
            return False

        url = f"https://api.telegram.org/bot{self.tg_token}/sendMessage"
        payload = {
            "chat_id": target,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": False
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                return res.status_code == 200
        except Exception as e:
            logger.error("Error sending Telegram message: %s", e)
            return False

    async def broadcast_sos(self, payload: dict) -> dict:
        """
        Formats and broadcasts official emergency SOS alert.
        """
        esc = lambda v: html.escape(str(v), quote=False)  # the message is sent as HTML: never trust a field
        name = esc(payload.get("userName", "Citizen"))
        phone = esc(payload.get("phone", "N/A"))
        lat = payload.get("lat", 3.1610)
        lon = payload.get("lon", 101.7010)
        shelter = esc(payload.get("shelterName", "Nearby Relief Center"))
        depth_cm = payload.get("waterDepthCm", 18)
        maps_link = f"https://maps.google.com/?q={lat:.5f},{lon:.5f}"

        msg = (
            f"🚨 <b>FLOODWAY 2.0 EMERGENCY SOS BROADCAST</b>\n\n"
            f"👤 <b>Evacuee:</b> {name} ({phone})\n"
            f"🌊 <b>Reported Water Level:</b> {depth_cm} cm\n"
            f"🏛 <b>Target Refuge:</b> {shelter}\n"
            f"📍 <b>Live GPS Location:</b> <a href='{maps_link}'>{lat:.4f}, {lon:.4f}</a>\n\n"
            f"<i>FloodWay demo alert. A check-in message follows on arrival.</i>"
        )

        tg_sent = await self.send_telegram(msg)
        return {
            "telegram_sent": tg_sent,
            "channel": "Telegram Bot API" if tg_sent else "Not sent (Telegram not configured)",
            "status": "DELIVERED" if tg_sent else "NOT_SENT"
        }

    async def broadcast_checkin(self, payload: dict) -> dict:
        """
        Formats and broadcasts shelter arrival geofence check-in.
        """
        esc = lambda v: html.escape(str(v), quote=False)
        name = esc(payload.get("userName", "Citizen"))
        shelter = esc(payload.get("shelterName", "Relief Center"))
        time_str = esc(payload.get("time", "Just now"))

        msg = (
            f"✅ <b>FAMILY SAFETY CONFIRMATION</b>\n\n"
            f"👤 {name} has <b>SAFELY ARRIVED</b> at <b>{shelter}</b>!\n"
            f"🕒 <b>Verified Arrival Time:</b> {time_str}\n"
            f"🛡 <b>Geofence Status:</b> Inside safe zone perimeter (<50m).\n\n"
            f"<i>You can rest easy. Family loop completed via FloodWay 2.0.</i>"
        )
        tg_sent = await self.send_telegram(msg)
        return {"telegram_sent": tg_sent, "status": "CONFIRMED" if tg_sent else "NOT_SENT"}

notifier = Notifier()
