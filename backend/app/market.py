import logging
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

from app import models
from app.database import SessionLocal

logger = logging.getLogger("market")

DAYS_TO_KEEP = 30
WEEKLY_LOOKBACK = 5  # işlem günü
MONTHLY_LOOKBACK = 21  # işlem günü
MIN_SYMBOLS_PER_DAY = 10  # bir günün listeye dahil edilmesi için gereken min. sembol sayısı

# Her liste, ilgili metriğe göre (change_percent / volume) azalan sırada
# tam sıralanmış hisse listesidir — "tümü" sayfalaması ve ilk/son N (gainers/
# losers, highest/lowest) buradan türetilir.
_cache = {
    "days": [],
    "movers_by_date": {},  # date_str -> [{symbol, price, change_percent}, ...] (azalan)
    "weekly_movers": [],
    "monthly_movers": [],
    "volumes_by_date": {},  # date_str -> [{symbol, price, volume}, ...] (azalan)
    "weekly_volumes": [],
    "monthly_volumes": [],
    "as_of": None,
}


def get_available_days() -> list[str]:
    return _cache["days"]


def _resolve_movers_full(period: str, date_str: str | None) -> tuple[list[dict], str | None]:
    latest_day = _cache["days"][0] if _cache["days"] else None
    if period == "weekly":
        return _cache["weekly_movers"], latest_day
    if period == "monthly":
        return _cache["monthly_movers"], latest_day

    days = _cache["days"]
    if not days:
        return [], None
    target = date_str if date_str in _cache["movers_by_date"] else days[0]
    return _cache["movers_by_date"].get(target, []), target


def _resolve_volumes_full(period: str, date_str: str | None) -> tuple[list[dict], str | None]:
    latest_day = _cache["days"][0] if _cache["days"] else None
    if period == "weekly":
        return _cache["weekly_volumes"], latest_day
    if period == "monthly":
        return _cache["monthly_volumes"], latest_day

    days = _cache["days"]
    if not days:
        return [], None
    target = date_str if date_str in _cache["volumes_by_date"] else days[0]
    return _cache["volumes_by_date"].get(target, []), target


def get_movers(period: str, date_str: str | None, limit: int = 10) -> dict:
    """period: 'daily' | 'weekly' | 'monthly'. 'daily' için date_str kullanılır
    (verilmezse en son borsa günü); haftalık/aylık her zaman en güncel veriye
    göre (trailing) hesaplanır."""
    full, target = _resolve_movers_full(period, date_str)
    if not full:
        return {"date": target, "gainers": [], "losers": []}
    gainers = full[:limit]
    losers = list(reversed(full[-limit:]))
    return {"date": target, "gainers": gainers, "losers": losers}


def get_movers_page(period: str, date_str: str | None, direction: str, page: int, page_size: int) -> dict:
    """direction: 'gainers' (en çok artandan başla) | 'losers' (en çok düşenden başla)."""
    full, target = _resolve_movers_full(period, date_str)
    ordered = full if direction == "gainers" else list(reversed(full))
    start = (page - 1) * page_size
    return {
        "date": target,
        "direction": direction,
        "page": page,
        "page_size": page_size,
        "total": len(ordered),
        "items": ordered[start : start + page_size],
    }


def get_volumes(period: str, date_str: str | None, limit: int = 10) -> dict:
    """period: 'daily' | 'weekly' | 'monthly'. 'daily' için date_str kullanılır
    (verilmezse en son borsa günü); haftalık/aylık, son 5/21 işlem gününün
    toplam hacmine göre (trailing) hesaplanır."""
    full, target = _resolve_volumes_full(period, date_str)
    if not full:
        return {"date": target, "highest": [], "lowest": []}
    highest = full[:limit]
    lowest = list(reversed(full[-limit:]))
    return {"date": target, "highest": highest, "lowest": lowest}


def get_volumes_page(period: str, date_str: str | None, direction: str, page: int, page_size: int) -> dict:
    """direction: 'highest' (en yüksek hacimden başla) | 'lowest' (en düşük hacimden başla)."""
    full, target = _resolve_volumes_full(period, date_str)
    ordered = full if direction == "highest" else list(reversed(full))
    start = (page - 1) * page_size
    return {
        "date": target,
        "direction": direction,
        "page": page,
        "page_size": page_size,
        "total": len(ordered),
        "items": ordered[start : start + page_size],
    }


def _sort_desc(items: list[dict], key: str) -> list[dict]:
    return sorted(items, key=lambda x: x[key], reverse=True)


def refresh_movers_cache() -> None:
    """BIST'teki tüm sembolleri toplu çekip son birkaç borsa gününün her biri
    için günlük, ayrıca en güncel veriye göre haftalık/aylık tam sıralı
    (değişim % / hacim) listeleri hesaplar ve cache'i günceller. ~500 sembol
    için ~30-40sn sürebildiğinden her istekte değil, periyodik olarak
    (scheduler) çağrılmalı."""
    db = SessionLocal()
    try:
        symbols = [t.symbol for t in db.query(models.Ticker).all()]
    finally:
        db.close()

    if not symbols:
        return

    yf_symbols = [f"{s}.IS" for s in symbols]
    data = yf.download(yf_symbols, period="2mo", group_by="ticker", threads=True, progress=False)

    changes_by_date: dict[str, list[dict]] = {}
    volumes_by_date: dict[str, list[dict]] = {}
    weekly_changes: list[dict] = []
    monthly_changes: list[dict] = []
    weekly_volumes: list[dict] = []
    monthly_volumes: list[dict] = []

    for symbol in symbols:
        yf_symbol = f"{symbol}.IS"
        try:
            closes = data[yf_symbol]["Close"].dropna()
            volumes = data[yf_symbol]["Volume"].reindex(closes.index)
        except KeyError:
            continue
        if len(closes) < 2:
            continue

        last_close = float(closes.iloc[-1])

        recent = closes.iloc[-(DAYS_TO_KEEP + 1) :]
        recent_volumes = volumes.iloc[-(DAYS_TO_KEEP + 1) :]
        for i in range(1, len(recent)):
            prev_close = float(recent.iloc[i - 1])
            day_close = float(recent.iloc[i])
            date_str = recent.index[i].strftime("%Y-%m-%d")

            if prev_close != 0:
                change_percent = (day_close - prev_close) / prev_close * 100
                changes_by_date.setdefault(date_str, []).append(
                    {"symbol": symbol, "price": day_close, "change_percent": change_percent}
                )

            day_volume = recent_volumes.iloc[i]
            if pd.notna(day_volume):
                volumes_by_date.setdefault(date_str, []).append(
                    {"symbol": symbol, "price": day_close, "volume": int(day_volume)}
                )

        if len(closes) >= WEEKLY_LOOKBACK + 1:
            prev_close = float(closes.iloc[-(WEEKLY_LOOKBACK + 1)])
            if prev_close != 0:
                weekly_changes.append(
                    {
                        "symbol": symbol,
                        "price": last_close,
                        "change_percent": (last_close - prev_close) / prev_close * 100,
                    }
                )

        if len(closes) >= MONTHLY_LOOKBACK + 1:
            prev_close = float(closes.iloc[-(MONTHLY_LOOKBACK + 1)])
            if prev_close != 0:
                monthly_changes.append(
                    {
                        "symbol": symbol,
                        "price": last_close,
                        "change_percent": (last_close - prev_close) / prev_close * 100,
                    }
                )

        if len(volumes) >= WEEKLY_LOOKBACK:
            weekly_total = volumes.iloc[-WEEKLY_LOOKBACK:].sum()
            if pd.notna(weekly_total):
                weekly_volumes.append({"symbol": symbol, "price": last_close, "volume": int(weekly_total)})

        if len(volumes) >= MONTHLY_LOOKBACK:
            monthly_total = volumes.iloc[-MONTHLY_LOOKBACK:].sum()
            if pd.notna(monthly_total):
                monthly_volumes.append({"symbol": symbol, "price": last_close, "volume": int(monthly_total)})

    # Bazı sembollerin en son günün kapanışı Yahoo'da henüz oturmamış olabilir
    # (NaN -> dropna ile düşüyor). Yeterli sembolü olmayan günleri listeye
    # dahil etme, yoksa "en çok artan/düşen" listesi eksik çıkar.
    changes_by_date = {d: v for d, v in changes_by_date.items() if len(v) >= MIN_SYMBOLS_PER_DAY}

    days = sorted(changes_by_date.keys(), reverse=True)[:DAYS_TO_KEEP]
    movers_by_date = {}
    volumes_cache = {}
    for date_str in days:
        movers_by_date[date_str] = _sort_desc(changes_by_date[date_str], "change_percent")
        day_volumes = volumes_by_date.get(date_str, [])
        volumes_cache[date_str] = (
            _sort_desc(day_volumes, "volume") if len(day_volumes) >= MIN_SYMBOLS_PER_DAY else []
        )

    _cache["days"] = days
    _cache["movers_by_date"] = movers_by_date
    _cache["weekly_movers"] = _sort_desc(weekly_changes, "change_percent")
    _cache["monthly_movers"] = _sort_desc(monthly_changes, "change_percent")
    _cache["volumes_by_date"] = volumes_cache
    _cache["weekly_volumes"] = _sort_desc(weekly_volumes, "volume")
    _cache["monthly_volumes"] = _sort_desc(monthly_volumes, "volume")
    _cache["as_of"] = datetime.now(timezone.utc).isoformat()
    logger.info("Piyasa hareketlileri güncellendi: %d gün, %d sembol", len(days), len(symbols))
