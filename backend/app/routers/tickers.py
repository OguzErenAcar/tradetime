from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/tickers", tags=["tickers"])


@router.get("", response_model=list[schemas.TickerOut])
def list_tickers(q: str = "", db: Session = Depends(get_db)):
    return crud.search_tickers(db, q)


@router.post("/{symbol}/view", response_model=schemas.TickerViewOut)
def mark_ticker_viewed(symbol: str, db: Session = Depends(get_db)):
    last_viewed_at = crud.mark_ticker_viewed(db, symbol)
    if last_viewed_at is None:
        raise HTTPException(status_code=404, detail="Sembol bulunamadı")
    return {"last_viewed_at": last_viewed_at}
