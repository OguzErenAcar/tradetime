from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.prices import get_current_price

router = APIRouter(prefix="/alarms", tags=["alarms"])


def _annotate(alarm: models.Alarm, favorite_tickers: set[str], last_viewed: dict) -> schemas.AlarmOut:
    out = schemas.AlarmOut.model_validate(alarm)
    return out.model_copy(
        update={
            "is_favorite": alarm.ticker in favorite_tickers,
            "last_viewed_at": last_viewed.get(alarm.ticker),
        }
    )


@router.get("", response_model=list[schemas.AlarmOut])
def list_alarms(db: Session = Depends(get_db)):
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)
    return [_annotate(a, favorite_tickers, last_viewed) for a in crud.get_alarms(db)]


@router.post("", response_model=schemas.AlarmOut, status_code=201)
def create_alarm(alarm: schemas.AlarmCreate, db: Session = Depends(get_db)):
    db_alarm = crud.create_alarm(db, alarm)
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)
    return _annotate(db_alarm, favorite_tickers, last_viewed)


@router.delete("/{alarm_id}", status_code=204)
def delete_alarm(alarm_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_alarm(db, alarm_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alarm bulunamadı")


@router.get("/{alarm_id}/price")
def get_alarm_price(alarm_id: int, db: Session = Depends(get_db)):
    alarm = crud.get_alarm(db, alarm_id)
    if alarm is None:
        raise HTTPException(status_code=404, detail="Alarm bulunamadı")
    if alarm.alarm_type == "date":
        raise HTTPException(status_code=400, detail="Bu alarm tarih tipinde, fiyat sorgusu geçerli değil")

    price = get_current_price(alarm.ticker)
    if price is None:
        raise HTTPException(status_code=502, detail="Fiyat verisi alınamadı")

    return {
        "ticker": alarm.ticker,
        "price": price,
        "target_price": float(alarm.target_price),
        "direction": alarm.direction,
        "would_trigger": crud.is_alarm_triggered(alarm, price),
    }


@router.post("/check", response_model=list[schemas.AlarmOut])
def check_alarms(db: Session = Depends(get_db)):
    """Tetiklenmemiş tüm alarmları kontrol eder ve yeni tetiklenenleri döner.
    Şimdilik manuel/harici olarak çağrılıyor; saatlik otomatik çalıştırma
    (cron veya scheduler) ayrı bir adımda eklenecek."""
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)
    return [_annotate(a, favorite_tickers, last_viewed) for a in crud.check_alarms(db)]
