# BIST Fiyat Alarmı Projesi — Yapılacaklar Listesi

## Kararlar
- [x] Frontend: React ile yazılacak (web sitesi)
- [x] Bildirim: Web Push API ile tarayıcı/telefon bildirimi (React Native yok, PWA yaklaşımı)
- [x] Deploy: Docker ile yapılacak (containerize)

## 1. Backend (önce bu)
- [x] Backend API projesi başlatıldı (FastAPI + SQLAlchemy, `backend/app/`)
- [x] alarms tablosu için local PostgreSQL bağlantısı kuruldu (dev için tek Postgres container'ı: `bist-alarm-postgres-dev`, tam docker-compose testi altyapı fazında)
- [x] alarms tablosu şeması tasarlandı
- [x] Alarms için CRUD endpoint'leri yazıldı ve test edildi (GET/POST/DELETE /alarms)
- [x] yfinance entegrasyonu API'ye bağlandı (`GET /alarms/{id}/price`, `POST /alarms/check`) — test edildi
- [x] Alarm kontrol mantığı (check_alarms) API içine taşındı (`app/crud.py: check_alarms`)
- [x] Saatlik kontrol mekanizması eklendi (APScheduler, FastAPI içine gömülü — `app/scheduler.py`, varsayılan 60 dk, `ALARM_CHECK_INTERVAL_MINUTES` ile ayarlanabilir). 1 dk'lık aralıkla test edildi, otomatik tetikleme çalışıyor.
- [x] Piyasa geneli en çok artan/düşen listesi eklendi (`app/market.py`: tüm tickers tablosu yfinance ile toplu çekiliyor — 537 sembol ~35sn, bu yüzden anlık değil, scheduler ile arka planda periyodik hesaplanıp cache'leniyor — varsayılan 60 dk, `MARKET_MOVERS_REFRESH_MINUTES` ile ayarlanabilir. Son 10 borsa gününün her biri için ayrı ayrı hesaplanıyor (`GET /market/days`, `GET /market/movers?date=`), test edildi.)
- [x] Web Push aboneliklerini saklayan tablo/servis eklendi (`push_subscriptions` tablosu, `POST /push/subscribe`, `POST /push/unsubscribe`, `GET /push/vapid-public-key`) — test edildi
- [x] Backend'den web push gönderen servis yazıldı (`pywebpush` ile `app/push.py`) — bir alarm tetiklendiğinde (`crud.check_alarms`) kayıtlı tüm aboneliklere otomatik gönderiliyor, geçersiz/silinmiş abonelikler (404/410) otomatik temizleniyor. VAPID anahtarları oluşturuldu (`backend/vapid_private_key.pem`, git'e girmiyor). Gerçek bir Android telefona (Chrome/FCM üzerinden) uçtan uca test edildi, bildirim ulaştı.
- [x] Backend için Dockerfile yazıldı (`backend/Dockerfile`, `python:3.11-slim`, VAPID private key imaja gömülmüyor — runtime'da volume mount ediliyor)

## 2. Frontend (backend hazır olunca)
- [x] Frontend projesi kuruldu (Vite + React + Tailwind, `frontend/`)
- [x] Web arayüz prototipi tasarlandı ve projeye entegre edildi (liste + alarm ekleme)
- [x] Kontrol sıklığını görüntüleme/değiştirme eklendi (`src/api.js`: `getCheckInterval`/`setCheckInterval`, backend `/settings` ile CORS test edildi)
- [x] Alarm listesi/ekleme/silme gerçek API'ye bağlandı (`src/api.js`: `getAlarms`/`createAlarm`/`deleteAlarm`, backend ile uçtan uca test edildi)
- [x] Sol sidebar (Anasayfa/Alarm) eklendi, mobilde alt tab bar'a dönüşüyor (responsive)
- [x] Hisse adı girişi arama+dropdown'a çevrildi (`TickerSearchInput.jsx` + backend `tickers` tablosu, 537 BIST sembolü seed edildi, `GET /tickers?q=`)
- [x] Hisse seçilince yanında güncel fiyat gösteriliyor (backend `GET /prices/{ticker}`, frontend `getPrice`)
- [x] Masaüstünde alarm listesi sıralanabilir tablo görünümüne çevrildi (Hisse/Hedef fiyat/Tarih sütunları tıklanarak sıralanıyor), fiyat belirgin gösteriliyor (büyük, kalın, yön rengine göre); mobilde kart listesi korundu, konteyner genişliği masaüstünde büyütüldü (`max-w-3xl`)
- [x] Tarihe göre alarm tipi eklendi — üç mod: fiyat alarmı, basit tarih hatırlatması, fiyat + son tarih (`alarms.alarm_type`: price/date/price_by_date). Yeni alarm formunda "Fiyata göre/Tarihe göre" toggle + "Ayrıca fiyat hedefi de ekle" seçeneği var. Backend'de üçü de test edildi (fiyat tetikleniyor, tarih tetikleniyor, süresi geçen fiyat+tarih `expired` oluyor).
- [x] Anasayfa dolduruldu: tanıtım/özellik kartları + "Piyasa hareketleri" (en çok artanlar/düşenler, masaüstünde yan yana, geniş konteyner `max-w-4xl`) — `HomePage.jsx`, backend `/market/movers`'a bağlı
- [x] Tablonun üstüne son 30 borsa gününü gösteren yatay kaydırılabilir gün seçici eklendi (genişlik tablo ile aynı, `period="2mo"` ile 43 işlem günü çekiliyor — API 30 gün için yeterli, kenarlarda sol/sağ kaydırma butonları var), varsayılan olarak son borsa günü seçili geliyor (`DayPicker` + `/market/days`)
- [x] Uygulama açılışında ilk gösterilen sekme Anasayfa oldu (önceden Alarm'dı) — `App.jsx`
- [x] Alarm geçmişi eklendi: "Yeni ekle" butonunun yanına "Geçmiş" butonu, tetiklenen tüm alarmları tetiklenme zamanına göre (`alarms.triggered_at` — yeni alan) listeleyen ayrı bir görünüm (`HistoryView`). Backend'de test edildi.
- [x] Tetiklenen alarmlar artık ana listede (Fiyata göre/Tarihe göre) gösterilmiyor, sadece Geçmiş'te görünüyor
- [x] Yeni fiyat alarmı formunda yön kontrolü eklendi: hedef fiyat, seçilen hisse için o an bilinen güncel fiyatla çelişiyorsa ("üzerine çıkınca" seçiliyken hedef zaten geçilmiş, ya da "altına inince" seçiliyken hedef zaten altında) uyarı verip alarmın anında tetiklenmesini önlüyor
- [x] Hisse sembolleri tüm tablolarda (alarm listesi, alarm geçmişi, anasayfadaki en çok artan/düşen) TradingView'in tam grafik sayfasına link oldu (`https://tr.tradingview.com/chart/?symbol=BIST:{SEMBOL}`, yeni sekmede açılıyor)
- [x] Anasayfadaki "Piyasa hareketleri" listesine Günlük/Haftalık/Aylık seçeneği eklendi — haftalık/aylık, son 5/21 işlem gününe göre (trailing) en güncel veriyle hesaplanıyor, günlük moddaki gün seçici sadece günlükte gösteriliyor (`GET /market/movers?period=weekly|monthly`, backend'de test edildi)
- [x] Düzeltme: en son borsa gününde bazı sembollerin kapanışı Yahoo'da henüz oturmamış olabiliyordu (NaN), bu yüzden o gün için 10 yerine daha az artan/düşen çıkıyordu — 10'dan az geçerli sembolü olan günler artık gün listesinden hariç tutuluyor, varsayılan gün her zaman tam veri içeriyor
- [x] Service worker ile push aboneliği eklendi (`public/sw.js` — push/notificationclick olayları, `src/push.js` — abone ol/çık yardımcıları, `public/manifest.json` — PWA/iOS ana ekrana ekleme için). Alarm listesinde "Bildirimler" aç/kapat kontrolü eklendi (`NotificationControl`, kontrol sıklığı kutusunun yanında).
- [x] Test alarmıyla telefona/tarayıcıya bildirim ulaştırıldı — geçici `cloudflared` tüneliyle (backend + frontend ayrı ayrı) gerçek bir Android telefonda test edildi, bildirim başarıyla geldi. Frontend'in API adresi artık `VITE_API_BASE_URL` ile ayarlanabilir (`.env.local`, git'e girmiyor).
- [x] Favoriler sayfası eklendi: sidebar'a "Favoriler" sekmesi, üstte arama çubuğu (seçince direkt ekleniyor), altında tablo (sembol → TradingView linki, şirket adı, güncel fiyat, günlük değişim yüzdesi, silme butonu). Backend: `favorites` tablosu, `GET/POST/DELETE /favorites` — uçtan uca test edildi.
- [x] Favoriler tablosuna "Alarm" sütunu eklendi — o hisse için bekleyen (tetiklenmemiş/süresi dolmamış) bir alarm var mı yok mu gösteriyor (Bell/BellOff ikonu). Backend'de test edildi (alarmı olan/olmayan iki hisseyle doğrulandı).
- [x] Tersi yönde: Alarm listesi/geçmişi ve Anasayfa'daki en çok artan/düşen tablolarında, sembolün favori olup olmadığı bir yıldız ikonuyla gösteriliyor (`is_favorite` alanı — `/alarms`, `/alarms/check`, `/market/movers` yanıtlarına eklendi). Hem gerçek favori hem gerçek olmayan durumla backend'de test edildi.
- [x] "Yeni ekle" formunun sayfa çerçevesi artık diğer sayfalarla (liste/geçmiş/favoriler) aynı yatay genişlikte (`max-w-3xl`); form alanları kendi içinde okunabilir bir genişlikte (`max-w-md`) kalmaya devam ediyor, sadece dış çerçeve genişledi
- [x] Proje markalandı: "TradeTime" adı + logo eklendi (`src/Logo.jsx`). Masaüstünde sidebar'ın en üstünde, mobilde yeni bir üst başlık çubuğunda (`MobileHeader.jsx`, önceden mobilde hiç üst bar yoktu) gösteriliyor. Sayfa başlığı (`<title>`) ve PWA manifest'i (`name`/`short_name`) de güncellendi. Logo rengi orijinal mor favicon'la (`#863bff`) eşleştirildi (kullanıcı tercihi).
- [x] PWA ana ekran ikonları eklendi: `icon-192.png` ve `icon-512.png` (favicon.svg'den qlmanage ile üretildi), manifest.json'a eklendi. Ayrıca `apple-touch-icon`'un SVG'ye işaret ettiği fark edildi (iOS SVG desteklemiyor, sessizce çalışmıyordu) — PNG'ye düzeltildi.
- [x] Frontend için Dockerfile yazıldı (`frontend/Dockerfile`, çok aşamalı: `node:20-alpine` ile build → `nginx:alpine` ile statik servis, SPA fallback için `frontend/nginx.conf`; `VITE_API_BASE_URL` build-arg olarak veriliyor)

## 3. Altyapı / Yayına alma (en son)
- [x] VPS kiralandı
- [x] **Local'de test:** kök dizinde `docker-compose.yml` (postgres + backend + frontend, henüz nginx/SSL yok — o VPS adımında). `docker compose up -d` ile uçtan uca test edildi: postgres sağlıklı, backend 537 ticker'ı seed edip `/health` ve piyasa endpoint'lerini doğru veriyor (ilk açılışta market cache hesaplaması ~50sn sürüyor, beklenen davranış), frontend build'i backend'e doğru CORS ile bağlanıp gerçek veriyi render ediyor (headless tarayıcıyla doğrulandı, hata yok). VAPID private key imaja gömülmüyor, `./backend/vapid_private_key.pem` runtime'da mount ediliyor. Local portlar: backend `8001`, frontend `8080` (dev sunucularıyla — `8000`/`5173` — çakışmasın diye farklı seçildi). Kök `.env`/`.env.example` eklendi. Ayrıca backend CORS origin listesi artık koddan değil `ALLOWED_ORIGINS` env değişkeninden okunuyor (`backend/app/main.py`) — her ortam/tünel değişiminde kaynağı elle düzenlemek gerekmiyor.
- [ ] VPS'e Docker ve Docker Compose kurulacak
- [ ] VPS'te PostgreSQL container'ı ayağa kaldırılacak
- [ ] Güvenlik duvarı sadece gerekli IP/portlara açılacak
- [ ] VPS'te docker-compose up ile yayına alınacak
- [ ] Domain/SSL ayarlanacak (HTTPS zorunlu, çünkü Web Push HTTPS olmadan çalışmaz)

## Notlar
- Web Push, tarayıcı kapalıyken bile bildirim gösterebilir (service worker sayesinde), ama HTTPS zorunludur — bu yüzden domain + SSL sertifikası (örn. Let's Encrypt) planına dahil edilmeli.
- iOS'ta web push için kullanıcının siteyi "ana ekrana eklemesi" gerekir (iOS 16.4+ ile destekleniyor).
