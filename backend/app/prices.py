import yfinance as yf


def get_current_price(ticker: str) -> float | None:
    """BIST hisseleri için '.IS' uzantılı sembol kullanılır, örn: THYAO.IS"""
    yf_ticker = yf.Ticker(f"{ticker}.IS")
    hist = yf_ticker.history(period="5d")
    if hist.empty:
        return None
    closes = hist["Close"].dropna()
    if closes.empty:
        return None
    return float(closes.iloc[-1])


def get_price_and_change(ticker: str) -> dict | None:
    """Güncel fiyat + bir önceki kapanışa göre yüzde değişim."""
    yf_ticker = yf.Ticker(f"{ticker}.IS")
    hist = yf_ticker.history(period="5d")
    if hist.empty:
        return None
    closes = hist["Close"].dropna()
    if closes.empty:
        return None

    price = float(closes.iloc[-1])
    change_percent = None
    if len(closes) >= 2:
        prev_close = float(closes.iloc[-2])
        if prev_close != 0:
            change_percent = (price - prev_close) / prev_close * 100

    return {"price": price, "change_percent": change_percent}
