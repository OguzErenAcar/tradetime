import os
from datetime import date, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, push, schemas
from app.prices import get_current_price

DEFAULT_CHECK_INTERVAL_MINUTES = int(os.getenv("ALARM_CHECK_INTERVAL_MINUTES", "60"))


def get_alarms(db: Session) -> list[models.Alarm]:
    return db.query(models.Alarm).order_by(models.Alarm.created_at.desc()).all()


def get_alarm(db: Session, alarm_id: int) -> models.Alarm | None:
    return db.query(models.Alarm).filter(models.Alarm.id == alarm_id).first()


def create_alarm(db: Session, alarm: schemas.AlarmCreate) -> models.Alarm:
    db_alarm = models.Alarm(
        ticker=alarm.ticker.upper(),
        alarm_type=alarm.alarm_type,
        target_price=alarm.target_price,
        direction=alarm.direction,
        target_date=alarm.target_date,
    )
    db.add(db_alarm)
    db.commit()
    db.refresh(db_alarm)
    return db_alarm


def delete_alarm(db: Session, alarm_id: int) -> bool:
    db_alarm = get_alarm(db, alarm_id)
    if db_alarm is None:
        return False
    db.delete(db_alarm)
    db.commit()
    return True


def is_alarm_triggered(alarm: models.Alarm, price: float) -> bool:
    if alarm.direction == "above":
        return price >= float(alarm.target_price)
    return price <= float(alarm.target_price)


def check_alarms(db: Session) -> list[models.Alarm]:
    """Bekleyen tüm alarmları tipine göre kontrol eder, tetiklenenleri işaretler
    ve tetiklenenlerin listesini döner (bildirim gönderimi burada değil,
    ileride bu listeyi kullanan bir servis tarafından yapılacak).

    - price: fiyat koşulu sağlanınca tetiklenir
    - date: hedef tarihe ulaşılınca tetiklenir
    - price_by_date: fiyat koşulu sağlanınca tetiklenir; hedef tarih geçip
      koşul hâlâ sağlanmadıysa 'expired' olarak işaretlenir ve bir daha
      kontrol edilmez (tetiklenmiş sayılmaz)
    """
    pending = (
        db.query(models.Alarm)
        .filter(models.Alarm.triggered.is_(False), models.Alarm.expired.is_(False))
        .all()
    )

    newly_triggered = []
    today = date.today()

    for alarm in pending:
        if alarm.alarm_type == "date":
            if alarm.target_date is not None and today >= alarm.target_date:
                alarm.triggered = True
                alarm.triggered_at = datetime.utcnow()
                newly_triggered.append(alarm)
            continue

        price = get_current_price(alarm.ticker)
        if price is not None and is_alarm_triggered(alarm, price):
            alarm.triggered = True
            alarm.triggered_at = datetime.utcnow()
            newly_triggered.append(alarm)
        elif (
            alarm.alarm_type == "price_by_date"
            and alarm.target_date is not None
            and today > alarm.target_date
        ):
            alarm.expired = True

    db.commit()
    for alarm in newly_triggered:
        db.refresh(alarm)

    push.notify_triggered_alarms(newly_triggered)
    return newly_triggered


def get_settings(db: Session) -> models.AppSettings:
    settings = db.query(models.AppSettings).first()
    if settings is None:
        settings = models.AppSettings(check_interval_minutes=DEFAULT_CHECK_INTERVAL_MINUTES)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_check_interval(db: Session, minutes: int) -> models.AppSettings:
    settings = get_settings(db)
    settings.check_interval_minutes = minutes
    db.commit()
    db.refresh(settings)
    return settings


def upsert_push_subscription(
    db: Session, sub: schemas.PushSubscriptionCreate
) -> models.PushSubscription:
    existing = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.endpoint == sub.endpoint)
        .first()
    )
    if existing:
        existing.p256dh = sub.keys.p256dh
        existing.auth = sub.keys.auth
        db.commit()
        db.refresh(existing)
        return existing

    db_sub = models.PushSubscription(
        endpoint=sub.endpoint, p256dh=sub.keys.p256dh, auth=sub.keys.auth
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)
    return db_sub


def delete_push_subscription(db: Session, endpoint: str) -> bool:
    deleted = (
        db.query(models.PushSubscription)
        .filter(models.PushSubscription.endpoint == endpoint)
        .delete()
    )
    db.commit()
    return deleted > 0


def search_tickers(db: Session, q: str, limit: int = 20) -> list[models.Ticker]:
    query = db.query(models.Ticker)
    if q:
        pattern = f"%{q.upper()}%"
        query = query.filter(
            (models.Ticker.symbol.ilike(pattern)) | (models.Ticker.name.ilike(pattern))
        )
    return query.order_by(models.Ticker.symbol).limit(limit).all()


def get_favorites(db: Session) -> list[models.Favorite]:
    return db.query(models.Favorite).order_by(models.Favorite.created_at.desc()).all()


def create_favorite(db: Session, ticker: str) -> models.Favorite:
    ticker = ticker.upper()
    existing = db.query(models.Favorite).filter(models.Favorite.ticker == ticker).first()
    if existing:
        return existing
    fav = models.Favorite(ticker=ticker)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


def delete_favorite(db: Session, favorite_id: int) -> bool:
    deleted = db.query(models.Favorite).filter(models.Favorite.id == favorite_id).delete()
    db.commit()
    return deleted > 0


def delete_favorite_by_ticker(db: Session, ticker: str) -> bool:
    deleted = db.query(models.Favorite).filter(models.Favorite.ticker == ticker.upper()).delete()
    db.commit()
    return deleted > 0


def get_favorite_tickers(db: Session) -> set[str]:
    return {t for (t,) in db.query(models.Favorite.ticker).all()}


def get_ticker_last_viewed(db: Session) -> dict[str, datetime]:
    return {
        symbol: last_viewed_at
        for symbol, last_viewed_at in db.query(models.Ticker.symbol, models.Ticker.last_viewed_at)
        .filter(models.Ticker.last_viewed_at.isnot(None))
        .all()
    }


def mark_ticker_viewed(db: Session, ticker: str) -> datetime | None:
    ticker_obj = db.query(models.Ticker).filter(models.Ticker.symbol == ticker.upper()).first()
    if ticker_obj is None:
        return None
    ticker_obj.last_viewed_at = func.now()
    db.commit()
    db.refresh(ticker_obj)
    return ticker_obj.last_viewed_at
