from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Alarm(Base):
    __tablename__ = "alarms"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String, nullable=False)
    # 'price' | 'date' | 'price_by_date'
    alarm_type: Mapped[str] = mapped_column(String, nullable=False, default="price")
    target_price: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    direction: Mapped[str | None] = mapped_column(String, nullable=True)  # 'above' | 'below'
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # price_by_date: hedef tarihe kadar fiyat koşulu sağlanmazsa alarm burada durur
    expired: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AppSettings(Base):
    """Tek satırlık global ayar tablosu."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    check_interval_minutes: Mapped[int] = mapped_column(Integer, default=60)


class Ticker(Base):
    """BIST'te işlem gören semboller (arama/dropdown için referans listesi)."""

    __tablename__ = "tickers"

    symbol: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PushSubscription(Base):
    """Tarayıcının Web Push aboneliği (bir cihaz/tarayıcı = bir satır)."""

    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    endpoint: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    p256dh: Mapped[str] = mapped_column(String, nullable=False)
    auth: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Favorite(Base):
    """Kullanıcının takip listesine eklediği hisseler."""

    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticker: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
