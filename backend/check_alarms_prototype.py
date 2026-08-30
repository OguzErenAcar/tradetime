"""
BIST Alarm Kontrolü - VPS Cron Scripti
========================================
Saatte bir çalışacak şekilde cron'a eklenir. PostgreSQL'deki 'alarms'
tablosunu okur, yfinance ile güncel fiyatı çeker, tetiklenen alarmları
işaretler ve bildirim fonksiyonunu çağırır.

Kurulum:
  pip install yfinance psycopg2-binary

Cron'a eklemek için (saatte bir, her saat başı):
  crontab -e
  0 * * * * /usr/bin/python3 /path/to/check_alarms.py >> /var/log/bist-alarm.log 2>&1
"""

import psycopg2
import yfinance as yf

DB_CONFIG = {
    "dbname": "bist_alarm",
    "user": "alarm_app",
    "password": "güçlü-bir-şifre",  # Gerçek şifreni buraya yaz veya env variable kullan
    "host": "localhost",
    "port": 5432,
}


def get_current_price(ticker: str):
    """BIST hisseleri için '.IS' uzantılı sembol kullanılır, örn: THYAO.IS"""
    yf_ticker = yf.Ticker(f"{ticker}.IS")
    hist = yf_ticker.history(period="5d")
    if hist.empty:
        return None
    return float(hist["Close"].iloc[-1])


def send_notification(ticker, price, direction):
    """
    Burada bildirim mekanizmasını çağırırsın: Telegram, e-posta,
    web push, ne kullanacaksan. Şimdilik konsola yazdırıyoruz.
    """
    yon_text = "üzerine çıktı" if direction == "above" else "altına indi"
    print(f"[ALARM] {ticker}: {price:.2f} TL - hedef seviyenin {yon_text}")
    # Örn: requests.post("https://api.telegram.org/bot<TOKEN>/sendMessage", ...)


def check_alarms():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, ticker, target_price, direction, triggered
        FROM alarms
        WHERE triggered = FALSE
    """)
    alarms = cur.fetchall()

    for alarm_id, ticker, target_price, direction, triggered in alarms:
        price = get_current_price(ticker)
        if price is None:
            print(f"[{ticker}] Fiyat verisi alınamadı, atlanıyor.")
            continue

        print(f"[{ticker}] Güncel fiyat: {price:.2f} | Hedef: {target_price} ({direction})")

        is_triggered = (
            (direction == "above" and price >= float(target_price))
            or (direction == "below" and price <= float(target_price))
        )

        if is_triggered:
            send_notification(ticker, price, direction)
            cur.execute("UPDATE alarms SET triggered = TRUE WHERE id = %s", (alarm_id,))

    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    check_alarms()
