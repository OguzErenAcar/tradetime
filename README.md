# TradeTime

BIST hisseleri için fiyat/tarih alarmı kuran, Web Push ile tarayıcı/telefon
bildirimi gönderen bir web uygulaması. Ayrıca piyasa geneli en çok
artan/düşen hisseleri ve kişisel bir favoriler listesini gösterir.

## Özellikler

- **Üç alarm tipi**: fiyat alarmı ("THYAO 280 TL'yi geçerse haber ver"),
  tarih hatırlatması ("GARAN için 15 Eylül'de hatırlat"), fiyat + son tarih
  ("ASELS 15 Eylül'e kadar 60 TL'nin altına inerse haber ver")
- **Web Push bildirimleri** — service worker üzerinden, uygulama kapalıyken
  bile; iOS'ta "ana ekrana ekle" ile PWA olarak kullanılabiliyor
- **Piyasa hareketleri** — günlük/haftalık/aylık en çok artan/düşen BIST
  hisseleri, son 30 borsa günü için gün gün
- **Favoriler** — hisse arayıp ekleme, güncel fiyat + günlük değişim
  yüzdesiyle takip

## Teknoloji

- **Backend**: Python / FastAPI + SQLAlchemy, veri kaynağı `yfinance`
  (Yahoo Finance)
- **Veritabanı**: PostgreSQL
- **Frontend**: React (Vite) + Tailwind CSS
- **Deploy**: Docker Compose (postgres + backend + frontend + Caddy),
  Caddy `sslip.io` üzerinden otomatik Let's Encrypt sertifikası alıyor

## Local geliştirme

```bash
# Postgres (Docker, dev container)
docker start bist-alarm-postgres-dev   # veya ilk kurulum için CLAUDE.md'ye bak

# Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --port 8000

# Frontend
cd frontend
npm run dev   # http://localhost:5173
```

Frontend'in API adresi `frontend/.env.local` içindeki `VITE_API_BASE_URL`
ile ayarlanır (yoksa `http://localhost:8000` varsayılan).

## Deploy

VPS'te Docker Compose ile canlıda çalışıyor (`docker compose --profile prod
up -d`, Caddy `80`/`443`'ü üstlenip `/api/*` isteklerini backend'e, geri
kalanını frontend'e yönlendiriyor). Kurulum ve sorun giderme adımları için
`CLAUDE.md`'ye bakın.

## Daha fazla bilgi

- [`CLAUDE.md`](CLAUDE.md) — proje bağlamı, mimari kararlar, deploy durumu
- [`TODO.md`](TODO.md) — yapılacaklar listesi ve ilerleme geçmişi
