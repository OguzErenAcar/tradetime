import json
from pathlib import Path

from sqlalchemy.orm import Session

from app import models

SEED_FILE = Path(__file__).parent / "seed_data" / "bist_tickers.json"


def seed_tickers(db: Session) -> None:
    """tickers tablosu boşsa BIST sembol listesiyle doldurur."""
    if db.query(models.Ticker).first() is not None:
        return

    with open(SEED_FILE, encoding="utf-8") as f:
        tickers = json.load(f)

    db.bulk_save_objects(
        [models.Ticker(symbol=t["symbol"], name=t["name"]) for t in tickers]
    )
    db.commit()
