from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.prices import get_price_and_change

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[schemas.FavoriteWithPrice])
def list_favorites(db: Session = Depends(get_db)):
    favorites = crud.get_favorites(db)

    pending_tickers = {
        t
        for (t,) in db.query(models.Alarm.ticker)
        .filter(models.Alarm.triggered.is_(False), models.Alarm.expired.is_(False))
        .all()
    }
    last_viewed = crud.get_ticker_last_viewed(db)

    result = []
    for fav in favorites:
        ticker_info = db.query(models.Ticker).filter(models.Ticker.symbol == fav.ticker).first()
        price_info = get_price_and_change(fav.ticker) or {}
        result.append(
            {
                "id": fav.id,
                "ticker": fav.ticker,
                "name": ticker_info.name if ticker_info else None,
                "price": price_info.get("price"),
                "change_percent": price_info.get("change_percent"),
                "has_alarm": fav.ticker in pending_tickers,
                "last_viewed_at": last_viewed.get(fav.ticker),
            }
        )
    return result


@router.post("", response_model=schemas.FavoriteOut, status_code=201)
def add_favorite(payload: schemas.FavoriteCreate, db: Session = Depends(get_db)):
    return crud.create_favorite(db, payload.ticker)


@router.delete("/{favorite_id}", status_code=204)
def remove_favorite(favorite_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_favorite(db, favorite_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Favori bulunamadı")


@router.delete("/by-ticker/{ticker}", status_code=204)
def remove_favorite_by_ticker(ticker: str, db: Session = Depends(get_db)):
    deleted = crud.delete_favorite_by_ticker(db, ticker)
    if not deleted:
        raise HTTPException(status_code=404, detail="Favori bulunamadı")
