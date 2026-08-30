import json
import logging
import os
from pathlib import Path

from pywebpush import WebPushException, webpush

from app import models
from app.database import SessionLocal

logger = logging.getLogger("push")

BACKEND_DIR = Path(__file__).resolve().parent.parent
VAPID_PRIVATE_KEY_PATH = str(BACKEND_DIR / os.getenv("VAPID_PRIVATE_KEY_FILE", "vapid_private_key.pem"))
VAPID_CONTACT_EMAIL = os.getenv("VAPID_CONTACT_EMAIL", "")
VAPID_CLAIMS = {"sub": f"mailto:{VAPID_CONTACT_EMAIL}"} if VAPID_CONTACT_EMAIL else None


def notify_triggered_alarms(alarms: list[models.Alarm]) -> None:
    """Tetiklenen alarmlar için kayıtlı tüm push aboneliklerine bildirim gönderir."""
    if not alarms or not VAPID_CLAIMS or not os.path.isfile(VAPID_PRIVATE_KEY_PATH):
        return

    db = SessionLocal()
    try:
        subscriptions = db.query(models.PushSubscription).all()
    finally:
        db.close()

    if not subscriptions:
        return

    for alarm in alarms:
        payload = json.dumps(_build_payload(alarm))
        for sub in subscriptions:
            _send(sub, payload)


def _build_payload(alarm: models.Alarm) -> dict:
    if alarm.alarm_type == "date":
        body = f"{alarm.ticker} için hatırlatma zamanı geldi"
    else:
        direction_text = "üzerine çıktı" if alarm.direction == "above" else "altına indi"
        body = f"{alarm.ticker}, {float(alarm.target_price):.2f} TL {direction_text}"
    return {"title": "TradeTime", "body": body, "url": "/"}


def _send(sub: models.PushSubscription, payload: str) -> None:
    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
    }
    try:
        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=VAPID_PRIVATE_KEY_PATH,
            vapid_claims=dict(VAPID_CLAIMS),
        )
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        logger.warning("Push gönderilemedi (%s...): %s", sub.endpoint[:60], exc)
        if status in (404, 410):
            _remove_stale_subscription(sub.endpoint)


def _remove_stale_subscription(endpoint: str) -> None:
    db = SessionLocal()
    try:
        db.query(models.PushSubscription).filter(models.PushSubscription.endpoint == endpoint).delete()
        db.commit()
    finally:
        db.close()
