import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import crud
from app.database import Base, SessionLocal, engine
from app.routers import alarms, favorites, ipos, market, prices, push, settings, tickers
from app.scheduler import start_scheduler, stop_scheduler
from app.seed import seed_tickers

Base.metadata.create_all(bind=engine)

# Virgülle ayrılmış ek origin listesi (docker-compose, VPS domaini, geçici tüneller vb.
# için kaynağı elle düzenlemeden ekleyebilmek amacıyla). localhost:5173 her zaman dahil.
_EXTRA_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = ["http://localhost:5173", *_EXTRA_ORIGINS]


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_tickers(db)
        app_settings = crud.get_settings(db)
        start_scheduler(app_settings.check_interval_minutes)
    finally:
        db.close()
    yield
    stop_scheduler()


app = FastAPI(title="BIST Alarm API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(alarms.router)
app.include_router(settings.router)
app.include_router(tickers.router)
app.include_router(prices.router)
app.include_router(market.router)
app.include_router(push.router)
app.include_router(favorites.router)
app.include_router(ipos.router)


@app.get("/health")
def health():
    return {"status": "ok"}
