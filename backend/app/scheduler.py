import logging
import os
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler

from app import crud, ipo, market
from app.database import SessionLocal

logger = logging.getLogger("scheduler")

JOB_ID = "check_alarms"
MOVERS_JOB_ID = "refresh_movers"
MOVERS_REFRESH_MINUTES = int(os.getenv("MARKET_MOVERS_REFRESH_MINUTES", "60"))
IPO_JOB_ID = "refresh_ipos"
IPO_REFRESH_HOURS = int(os.getenv("IPO_REFRESH_HOURS", "24"))

scheduler = BackgroundScheduler()


def run_check_alarms():
    db = SessionLocal()
    try:
        triggered = crud.check_alarms(db)
        if triggered:
            logger.info("%d alarm tetiklendi: %s", len(triggered), [a.ticker for a in triggered])
    finally:
        db.close()


def start_scheduler(interval_minutes: int):
    scheduler.add_job(
        run_check_alarms,
        "interval",
        minutes=interval_minutes,
        id=JOB_ID,
        replace_existing=True,
    )
    scheduler.add_job(
        market.refresh_movers_cache,
        "interval",
        minutes=MOVERS_REFRESH_MINUTES,
        id=MOVERS_JOB_ID,
        replace_existing=True,
        next_run_time=datetime.now(),
    )
    scheduler.add_job(
        ipo.refresh_ipo_cache,
        "interval",
        hours=IPO_REFRESH_HOURS,
        id=IPO_JOB_ID,
        replace_existing=True,
        next_run_time=datetime.now(),
    )
    scheduler.start()


def set_interval(interval_minutes: int):
    """Çalışan scheduler'ın kontrol sıklığını yeniden başlatmadan değiştirir."""
    scheduler.reschedule_job(JOB_ID, trigger="interval", minutes=interval_minutes)


def stop_scheduler():
    scheduler.shutdown(wait=False)
