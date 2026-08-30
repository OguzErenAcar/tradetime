import logging
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("ipo")

SOURCE_URL = "https://halkarz.com/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

_cache = {"items": [], "as_of": None}


def get_ipos() -> list[dict]:
    return _cache["items"]


def _parse_status(article, date_text: str | None) -> str:
    """'completed' (sonuçlar açıklandı rozeti var) | 'postponed' (ertelendi
    rozeti var) | 'scheduled' (tarihi belirlenmiş ama henüz rozetlenmemiş —
    hem yakın gelecekteki hem de rozeti düşmüş yakın geçmiş kayıtları
    kapsar) | 'draft' (başvurusu var, tarihi henüz belirlenmemiş)."""
    if article.select_one(".il-badge i.snc-badge"):
        return "completed"
    if article.select_one(".il-badge .il-ert"):
        return "postponed"
    if date_text:
        return "scheduled"
    return "draft"


def refresh_ipo_cache() -> None:
    """halkarz.com ana sayfasındaki güncel/yaklaşan halka arz listesini
    scrape eder. Resmi bir API'si yok, bu yüzden siteye sık istek atmamak
    için periyodik olarak (scheduler) çağrılmalı."""
    try:
        resp = requests.get(SOURCE_URL, headers=HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.RequestException:
        logger.exception("halkarz.com'a ulaşılamadı, önceki cache korunuyor")
        return

    soup = BeautifulSoup(resp.text, "html.parser")
    items = []
    for article in soup.select("ul.halka-arz-list > li > article.index-list"):
        link = article.select_one(".il-halka-arz-sirket a")
        if link is None:
            continue

        code_el = article.select_one(".il-bist-kod")
        time_el = article.select_one(".il-halka-arz-tarihi time")
        logo_el = article.select_one("img.slogo")
        date_text = time_el.get_text(strip=True) if time_el else None

        items.append(
            {
                "ticker": code_el.get_text(strip=True) if code_el else None,
                "company": link.get_text(strip=True),
                "date_text": date_text,
                "status": _parse_status(article, date_text),
                "detail_url": link.get("href"),
                "logo_url": logo_el.get("src") if logo_el else None,
            }
        )

    if not items:
        logger.warning("halkarz.com'dan hiç kayıt ayrıştırılamadı, sayfa yapısı değişmiş olabilir")
        return

    _cache["items"] = items
    _cache["as_of"] = datetime.now(timezone.utc).isoformat()
    logger.info("Halka arz listesi güncellendi: %d kayıt", len(items))
