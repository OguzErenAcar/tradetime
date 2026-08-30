# BIST Fiyat Alarmı Projesi (ürün adı: TradeTime)

Bu dosya, projeye terminalden bağlandığında (Claude Code) bağlamı hızlıca
yakalaman için hazırlandı. `TODO.md` ile birlikte oku.

Uygulamanın marka adı **TradeTime** (logo: `src/Logo.jsx`, sidebar'da ve
mobil üst başlık çubuğunda gösteriliyor).

## Proje ne yapıyor

Kullanıcı BIST hisseleri için alarm kuruyor. Üç alarm tipi var
(`alarms.alarm_type`):

- **price** — "THYAO 280 TL'nin üzerine çıkarsa haber ver" (mevcut fiyat
  koşulu sağlanınca tetiklenir)
- **date** — "GARAN için 15 Eylül'de hatırlat" (fiyattan bağımsız, sadece
  hedef tarihe ulaşılınca tetiklenir)
- **price_by_date** — "ASELS 15 Eylül'e kadar 60 TL'nin altına inerse haber
  ver" (fiyat koşulu + son tarih birlikte; son tarih geçip koşul hâlâ
  sağlanmadıysa alarm `expired` olur, bir daha kontrol edilmez, bildirim
  gitmez)

Sistem düzenli aralıklarla (varsayılan: saatte bir, ayarlanabilir) bekleyen
alarmları kontrol ediyor, koşul sağlanınca kullanıcıya Web Push ile tarayıcı/
telefon bildirimi gönderiyor (`app/push.py`, VAPID ile). Geçici bir
`cloudflared` tüneliyle gerçek bir Android telefonda uçtan uca test edildi —
bildirim başarıyla ulaştı.

Kullanıcı ayrıca bir **Favoriler** listesi tutabiliyor (`favorites` tablosu):
hisse arayıp ekliyor, güncel fiyat + günlük değişim yüzdesiyle tablo halinde
görüyor. Alarmdan bağımsız, sadece takip amaçlı.

## Kesinleşmiş kararlar

- **Frontend**: React (web sitesi, React Native DEĞİL)
- **Bildirim**: Web Push API (service worker üzerinden), native mobil app yok.
  Bu yüzden HTTPS zorunlu.
- **Veri kaynağı**: `yfinance` (Yahoo Finance) — BIST hisseleri `.IS` uzantısı
  ile çekiliyor, örn. `THYAO.IS`. Kontrol sıklığı düşük (saatte 1) olduğu için
  rate-limit riski yok, bu proje için yeterince stabil kabul edildi.
- **Veritabanı**: PostgreSQL, Docker container olarak çalışacak
- **Deploy**: Docker Compose ile 4 servis:
  1. `postgres` — veritabanı
  2. `backend` — API + alarm kontrol mantığı
  3. `frontend` — React build, statik dosya olarak servis edilecek
  4. `nginx` — reverse proxy + SSL (Certbot ile Let's Encrypt, ayrı container
     veya nginx içine gömülü — otomatik yenileme için ayrı container tercih
     edildi)
- **Backend dili**: Python/FastAPI (kesinleşti). `check_alarms_prototype.py`
  prototipinin üzerine geliştirilecek.

## Veritabanı şeması (Postgres'te oluşturulmuş durumda)

```sql
CREATE TABLE alarms (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  alarm_type TEXT NOT NULL DEFAULT 'price', -- 'price' | 'date' | 'price_by_date'
  target_price NUMERIC,        -- price ve price_by_date için zorunlu
  direction TEXT,               -- 'above' | 'below', price ve price_by_date için zorunlu
  target_date DATE,             -- date ve price_by_date için zorunlu
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMP,       -- ne zaman tetiklendi, alarm geçmişi için kullanılıyor
  expired BOOLEAN DEFAULT FALSE, -- sadece price_by_date: son tarih geçti, koşul sağlanmadı
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE app_settings (
  id SERIAL PRIMARY KEY,
  check_interval_minutes INTEGER DEFAULT 60 -- tek satır, global ayar
);

CREATE TABLE tickers (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  last_viewed_at TIMESTAMP -- bu sembolün TradingView linkine en son ne zaman
                            -- tıklandığı (POST /tickers/{symbol}/view), "SİT"
                            -- (son incelenme tarihi) kolonu için kullanılıyor
  -- BIST'te işlem gören ~537 sembol, backend başlangıcında
  -- app/seed_data/bist_tickers.json'dan otomatik dolduruluyor (seed_tickers).
  -- Frontend'deki hisse arama/dropdown bu tabloyu kullanıyor.
);

CREATE TABLE push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
  -- Bir tarayıcı/cihaz aboneliği = bir satır. 404/410 dönen (artık geçersiz)
  -- abonelikler push gönderirken otomatik siliniyor.
);

CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  ticker TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Bu klasördeki dosyalar

- `TODO.md` — güncel yapılacaklar listesi, ilerleme durumu (Backend → Frontend
  → Altyapı sırasıyla ilerleniyor)
- `backend/app/` — FastAPI uygulaması:
  - `main.py` — app kurulumu, CORS, lifespan (seed + scheduler başlatma)
  - `models.py`, `schemas.py`, `crud.py` — SQLAlchemy modelleri, Pydantic
    şemaları, DB işlemleri
  - `routers/alarms.py` — `/alarms` CRUD + `/alarms/{id}/price` +
    `/alarms/check`
  - `routers/settings.py` — `/settings` (kontrol sıklığı oku/güncelle)
  - `routers/tickers.py` — `/tickers?q=` (hisse arama)
  - `routers/prices.py` — `/prices/{ticker}` (herhangi bir sembol için anlık
    fiyat, henüz alarm oluşturulmadan kullanılıyor)
  - `routers/market.py` + `market.py` — `/market/days` (son 30 borsa günü,
    10'dan az geçerli sembolü olan günler hariç tutuluyor) ve
    `/market/movers?date=&period=daily|weekly|monthly` (günlük/haftalık/aylık
    en çok artan/düşenler). Tüm tickers tablosunu (537 sembol, 2 aylık
    geçmiş) yfinance ile toplu çekmek ~35sn sürdüğü için istek anında değil,
    scheduler ile arka planda periyodik hesaplanıp modül içi cache'de
    tutuluyor (varsayılan 60 dk, `MARKET_MOVERS_REFRESH_MINUTES`)
  - `routers/push.py` + `push.py` — Web Push: `/push/vapid-public-key`,
    `/push/subscribe`, `/push/unsubscribe`. `push.notify_triggered_alarms()`
    `crud.check_alarms()` içinden çağrılıyor, `pywebpush` ile gönderiyor.
    VAPID private key `backend/vapid_private_key.pem` dosyasında (git'e
    girmiyor), public key + iletişim maili `.env`'de
  - `routers/favorites.py` — `/favorites` CRUD, listede her hisse için
    `prices.get_price_and_change()` ile anlık fiyat + günlük değişim
    ekleniyor
  - `scheduler.py` — APScheduler, alarm kontrolünü DB'deki
    `check_interval_minutes`'e göre periyodik çalıştırır, runtime'da
    yeniden ayarlanabilir
  - `prices.py` — yfinance ile güncel fiyat çekme (NaN-güvenli)
  - `seed.py` + `seed_data/bist_tickers.json` — tickers tablosunu doldurur
- `backend/check_alarms_prototype.py` — orijinal prototip, artık
  `app/crud.py: check_alarms` + `app/scheduler.py` içine taşındı, referans
  olarak duruyor
- `frontend/` — Vite + React + Tailwind projesi:
  - `src/AlarmPanel.jsx` — alarm listesi/ekleme/geçmiş ekranları, gerçek
    API'ye bağlı; `NotificationControl` bildirim aç/kapat kontrolünü içeriyor
  - `src/HomePage.jsx` — tanıtım kartları + piyasa hareketleri (gün seçici,
    günlük/haftalık/aylık)
  - `src/FavoritesPage.jsx` — favori hisseler: arama çubuğu (seçince direkt
    ekliyor) + tablo (fiyat, günlük değişim, sil)
  - `src/TickerSearchInput.jsx` — hisse arama/dropdown bileşeni
  - `src/Sidebar.jsx` / `src/MobileNav.jsx` — Anasayfa/Alarm/Favoriler
    navigasyonu (masaüstünde sidebar, mobilde alt tab bar)
  - `src/push.js` — Web Push abone ol/çık yardımcıları (service worker
    kaydı, `PushManager.subscribe`)
  - `public/sw.js` — service worker (push + notificationclick olayları)
  - `public/manifest.json` — PWA manifesti (iOS'ta "ana ekrana ekle" için
    gerekli)
  - `src/api.js` — backend'e giden tüm fetch çağrıları

## Local geliştirme ortamı

- Backend: `backend/venv` (Python 3.11), `uvicorn app.main:app --port 8000`
- Postgres: Docker container `bist-alarm-postgres-dev` (tek container, dev
  amaçlı — tam `docker-compose` testi Altyapı fazında yapılacak)
- Frontend: `npm run dev` → `http://localhost:5173`, backend CORS'u bu origin
  için açık
- Frontend'in API adresi `VITE_API_BASE_URL` ile ayarlanabilir
  (`frontend/.env.local`, git'e girmiyor, yoksa `http://localhost:8000`
  varsayılan). Gerçek cihaz testi için `cloudflared tunnel --url
  http://localhost:8000` (backend) ve `...--url http://localhost:5173`
  (frontend) ile geçici HTTPS tünelleri açılıp bu env var + backend CORS
  origin listesi tünel adreslerine göre güncellenmişti — tüneller kalıcı
  değil, oturum kapanınca düşer.

## Henüz yapılmayanlar (özet — detay için TODO.md)

- Backend + frontend için Dockerfile'lar yazılmadı
- docker-compose.yml yazılmadı, local'de tüm servisler birlikte test edilmedi
- Nginx + SSL kurulumu yapılmadı
- VPS'e hiçbir şey deploy edilmedi

## Nasıl ilerlemeli

Kullanıcı adım adım gitmeyi tercih ediyor — büyük bir kod bloğunu tek seferde
üretip "işte hepsi" demek yerine, her adımda ne yapıldığını kısaca açıklayıp
bir sonraki adım için onay/yön alarak ilerlemek daha uyumlu olur. Backend
dili gibi netleşmemiş kararları varsayımla geçmek yerine sorarak kesinleştir.
