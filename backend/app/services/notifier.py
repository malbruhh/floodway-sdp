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

notifier = Notifier()
