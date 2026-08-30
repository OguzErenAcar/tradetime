from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud, market, schemas
from app.database import get_db

router = APIRouter(prefix="/market", tags=["market"])


def _annotate(items: list[dict], favorite_tickers: set[str], last_viewed: dict) -> list[dict]:
    return [
        {**i, "is_favorite": i["symbol"] in favorite_tickers, "last_viewed_at": last_viewed.get(i["symbol"])}
        for i in items
    ]


@router.get("/days", response_model=schemas.MarketDaysResponse)
def get_days():
    return {"days": market.get_available_days()}


@router.get("/movers", response_model=schemas.MoversResponse)
def get_movers(
    date: str | None = None,
    period: Literal["daily", "weekly", "monthly"] = "daily",
    db: Session = Depends(get_db),
):
    result = market.get_movers(period, date)
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)

    return {
        "date": result["date"],
        "gainers": _annotate(result["gainers"], favorite_tickers, last_viewed),
        "losers": _annotate(result["losers"], favorite_tickers, last_viewed),
    }


@router.get("/movers/all", response_model=schemas.PaginatedMoversResponse)
def get_movers_all(
    direction: Literal["gainers", "losers"],
    date: str | None = None,
    period: Literal["daily", "weekly", "monthly"] = "daily",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    result = market.get_movers_page(period, date, direction, page, page_size)
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)
    return {**result, "items": _annotate(result["items"], favorite_tickers, last_viewed)}


@router.get("/volumes", response_model=schemas.VolumesResponse)
def get_volumes(
    date: str | None = None,
    period: Literal["daily", "weekly", "monthly"] = "daily",
    db: Session = Depends(get_db),
):
    result = market.get_volumes(period, date)
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)

    return {
        "date": result["date"],
        "highest": _annotate(result["highest"], favorite_tickers, last_viewed),
        "lowest": _annotate(result["lowest"], favorite_tickers, last_viewed),
    }


@router.get("/volumes/all", response_model=schemas.PaginatedVolumesResponse)
def get_volumes_all(
    direction: Literal["highest", "lowest"],
    date: str | None = None,
    period: Literal["daily", "weekly", "monthly"] = "daily",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    result = market.get_volumes_page(period, date, direction, page, page_size)
    favorite_tickers = crud.get_favorite_tickers(db)
    last_viewed = crud.get_ticker_last_viewed(db)
    return {**result, "items": _annotate(result["items"], favorite_tickers, last_viewed)}
