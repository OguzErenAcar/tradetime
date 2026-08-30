from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AlarmCreate(BaseModel):
    ticker: str
    alarm_type: Literal["price", "date", "price_by_date"] = "price"
    target_price: float | None = None
    direction: Literal["above", "below"] | None = None
    target_date: date | None = None

    @model_validator(mode="after")
    def check_required_fields(self):
        if self.alarm_type == "price":
            if self.target_price is None or self.direction is None:
                raise ValueError("Fiyat alarmı için target_price ve direction gerekli")
        elif self.alarm_type == "date":
            if self.target_date is None:
                raise ValueError("Tarih alarmı için target_date gerekli")
        elif self.alarm_type == "price_by_date":
            if self.target_price is None or self.direction is None or self.target_date is None:
                raise ValueError(
                    "Fiyat + tarih alarmı için target_price, direction ve target_date gerekli"
                )
        return self


class AlarmOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    alarm_type: Literal["price", "date", "price_by_date"]
    target_price: float | None
    direction: Literal["above", "below"] | None
    target_date: date | None
    triggered: bool
    triggered_at: datetime | None
    expired: bool
    created_at: datetime
    is_favorite: bool = False
    last_viewed_at: datetime | None = None


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    check_interval_minutes: int


class SettingsUpdate(BaseModel):
    check_interval_minutes: int = Field(gt=0, le=1440)


class TickerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    symbol: str
    name: str


class MoverOut(BaseModel):
    symbol: str
    price: float
    change_percent: float
    is_favorite: bool = False
    last_viewed_at: datetime | None = None


class MoversResponse(BaseModel):
    date: str | None
    gainers: list[MoverOut]
    losers: list[MoverOut]


class PaginatedMoversResponse(BaseModel):
    date: str | None
    direction: Literal["gainers", "losers"]
    page: int
    page_size: int
    total: int
    items: list[MoverOut]


class MarketDaysResponse(BaseModel):
    days: list[str]


class VolumeOut(BaseModel):
    symbol: str
    price: float
    volume: int
    is_favorite: bool = False
    last_viewed_at: datetime | None = None


class VolumesResponse(BaseModel):
    date: str | None
    highest: list[VolumeOut]
    lowest: list[VolumeOut]


class PaginatedVolumesResponse(BaseModel):
    date: str | None
    direction: Literal["highest", "lowest"]
    page: int
    page_size: int
    total: int
    items: list[VolumeOut]


class IpoOut(BaseModel):
    ticker: str | None
    company: str
    date_text: str | None
    status: Literal["completed", "scheduled", "postponed", "draft"]
    detail_url: str | None
    logo_url: str | None


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushSubscriptionDelete(BaseModel):
    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    public_key: str


class FavoriteCreate(BaseModel):
    ticker: str


class FavoriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    created_at: datetime


class FavoriteWithPrice(BaseModel):
    id: int
    ticker: str
    name: str | None
    price: float | None
    change_percent: float | None
    has_alarm: bool
    last_viewed_at: datetime | None = None


class TickerViewOut(BaseModel):
    last_viewed_at: datetime
