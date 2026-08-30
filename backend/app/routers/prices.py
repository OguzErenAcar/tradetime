from fastapi import APIRouter, HTTPException

from app.prices import get_current_price

router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/{ticker}")
def get_price(ticker: str):
    price = get_current_price(ticker.upper())
    if price is None:
        raise HTTPException(status_code=502, detail="Fiyat verisi alınamadı")
    return {"ticker": ticker.upper(), "price": price}
