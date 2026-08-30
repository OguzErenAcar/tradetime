# VPS Deploy Todolist

Sırayla ilerlenecek — her adım bir öncekine bağlı. `TODO.md`'deki "3. Altyapı"
bölümüyle aynı işi daha detaylı takip etmek için var.

## 0. Karar verilecekler (deploy başlamadan önce)
- [ ] **Domain**: şimdilik yok — VPS alınana kadar sadece IP ile ilerlenecek,
      nginx+SSL adımı (bölüm 3) VPS + domain kararı netleşince ele alınacak
- [x] **Kod transferi**: Git — repo oluşturuldu ve ilk commit push'landı:
      https://github.com/OguzErenAcar/tradetime (private email GitHub
      tarafından reddedildiği için commit yazarı GitHub no-reply adresine
      çevrildi: `OguzErenAcar@users.noreply.github.com`)
- [x] **VPS erişimi**: SSH bilgileri paylaşılacak, buradan bağlanıp
      yürütülecek

## 1. VPS temel kurulum
- [x] SSH ile VPS'e bağlan, sistem güncellemesi — VPS: `91.232.103.192`
      (Ubuntu 24.04.1 LTS, 2 vCPU / 3.8GB RAM / 32GB boş disk). Şifreyle bir
      kere bağlanıp kendi SSH anahtarımızı (`~/.ssh/tradetime_vps`) ekledik,
      `~/.ssh/config`'e `tradetime-vps` alias'ı eklendi — bundan sonra şifreye
      gerek yok. **Not: ekran görüntüsünde paylaşılan root şifresini VPS
      hazır olunca değiştir.**
- [x] Docker + Docker Compose kurulumu — resmi Docker repo'sundan
      `docker-ce` + `docker-compose-plugin` (v5.5.0) kuruldu, `hello-world`
      ile doğrulandı
- [x] Güvenlik duvarı: `ufw` ile sadece 22/80/443 açık, aktif ve kalıcı
      (SSH erişimi firewall sonrası da test edildi)

## 2. Kod VPS'e taşınacak
- [x] `git clone` ile proje `/opt/tradetime`'a çekildi (repo public, VPS'te
      ayrıca kimlik doğrulama gerekmedi)
- [x] `backend/vapid_private_key.pem` `scp` ile (SSH üzerinden şifreli)
      güvenli şekilde taşındı
- [x] Kök `.env` VPS'te prod değerleriyle oluşturuldu: `VITE_API_BASE_URL`/
      `ALLOWED_ORIGINS` artık VPS IP'sini (`91.232.103.192`) gösteriyor,
      `POSTGRES_PASSWORD` rastgele üretilen güçlü bir şifreyle değiştirildi
      (`docker-compose.yml` artık bunu env'den okuyor, sabit değil).
      **Not:** bu süreçte yerelde yanlışlıkla `.env.vps` adında sırrı içeren
      bir dosya repo köküne düştü — `.gitignore`'daki `.env` deseni tam
      eşleşme olduğu için onu yakalamıyordu, hemen fark edip `.gitignore`'a
      `.env.*` deseni eklendi ve dosya commit edilmeden silindi (hiç git'e
      girmedi, GitHub'da hiç görünmedi)

## 3. Nginx + SSL (docker-compose.yml'e 4. servis olarak eklenecek)
- [ ] `nginx` servisi eklenecek: `/` için frontend container'ına,
      backend endpoint'lerine (`/alarms`, `/market`, `/push`, `/favorites`,
      `/prices`, `/tickers`, `/settings`, `/health`) backend container'ına
      reverse proxy
- [ ] Certbot ile Let's Encrypt sertifikası alınacak (otomatik yenileme için
      ayrı bir certbot container'ı — CLAUDE.md'de zaten bu şekilde kararlaştırılmıştı)
- [ ] HTTP → HTTPS yönlendirmesi

## 4. VPS'te ayağa kaldırma
- [x] `docker compose build && docker compose up -d` — backend `8000`,
      frontend `80` portlarında (nginx henüz yok, doğrudan yayında; `8000`
      geçici olarak `ufw`'de açık, nginx eklenince kapatılacak)
- [x] Tüm servisler sağlıklı: `docker compose ps` üçü de "Up"/"healthy",
      `/health` dışarıdan (`91.232.103.192:8000`) doğrulandı
- [x] Piyasa verisi arka planda doldu — burada VPS'in Yahoo Finance'e ağ
      yolu local'den belirgin şekilde yavaş çıktı (~50sn yerine ~3.5dk),
      hata değil ama bilgi olsun: her container restart'ında bu kadar
      sürebilir
- [x] Dışarıdan gerçek tarayıcıyla doğrulandı: `http://91.232.103.192`
      açılıyor, veriler doluyor, konsol hatası yok

## 5. Uçtan uca doğrulama
- [ ] Yeni domain/IP tarayıcıdan açılıp tüm sayfalar (Anasayfa/Alarm/
      Favoriler/Halka Arz) test edilecek
- [ ] Alarm oluşturma/silme, favori ekleme gibi temel akışlar VPS üzerinden
      denenecek
- [ ] Telefonda: eski PWA ikonu (tünel adresine bağlıydı) silinip yeni
      domain/IP'den "Ana ekrana ekle" tekrar yapılacak
- [ ] Telefonda bildirimler yeni adresten tekrar açılıp test alarmıyla push
      bildirimi ulaştığı doğrulanacak
- [ ] Android nav bar / status bar renginin (daha önce düzelttiğimiz
      `viewport-fit=cover` + `color-scheme`) prod'da da doğru göründüğü
      kontrol edilecek

## 6. Son temizlik
- [ ] Local dev tünelleri (cloudflared) artık gerekmiyorsa tamamen
      kapatılacak
- [ ] `TODO.md`'deki "3. Altyapı" bölümü tamamlanmış olarak işaretlenecek
