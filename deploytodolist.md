# VPS Deploy Todolist

Sırayla ilerlenecek — her adım bir öncekine bağlı. `TODO.md`'deki "3. Altyapı"
bölümüyle aynı işi daha detaylı takip etmek için var.

## 0. Karar verilecekler (deploy başlamadan önce)
- [x] **Domain**: gerçek domain yerine `sslip.io` ile ilerlendi —
      `91-232-103-192.sslip.io`, VPS IP'sine otomatik çözülüyor, ücretsiz
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

## 3. Nginx + SSL → Caddy + SSL olarak değişti
Nginx yerine **Caddy** kullanıldı — reverse proxy + Let's Encrypt sertifikasını
neredeyse hiç config yazmadan otomatik alıp yeniliyor (nginx+certbot'un iki
ayrı parçasına göre çok daha basit, tek container).
- [x] `docker-compose.yml`'e `caddy` servisi eklendi — sadece
      `docker compose --profile prod up -d` ile devreye giriyor, local dev'de
      hiç başlamıyor (`profiles: ["prod"]`)
- [x] Kök `Caddyfile`: `/api/*` → prefix'i silip backend'e, geri kalan her
      şey → frontend'e proxy ediyor
- [x] Let's Encrypt sertifikası otomatik alındı (`91-232-103-192.sslip.io`),
      HTTP→HTTPS yönlendirmesi Caddy'de varsayılan olarak açık — ikisi de
      dışarıdan doğrulandı
- [x] Frontend `/api` (relative path) ile build edildi — artık frontend ve
      backend aynı origin'den servis ediliyor, CORS'a bile gerek kalmadı
- [x] **Güvenlik düzeltmesi:** backend/frontend'in host portları (`8001`,
      `8080`) ilk başta `0.0.0.0`'a bağlıydı — Docker'ın kendi iptables
      kuralları `ufw`'yi bypass ettiği için bunlar `ufw`'de izin verilmemiş
      olsa bile dışarıdan erişilebiliyordu (test ederek doğrulandı).
      `docker-compose.yml`'de `127.0.0.1:PORT:PORT` şeklinde host'un
      localhost'una sabitlendi — artık sadece Caddy (80/443) dışa açık,
      backend/frontend'e doğrudan internetten ulaşılamıyor (bu da test
      edilip doğrulandı)
- [x] Geçici `ufw` kuralı (backend için açılan `8000`) kaldırıldı, artık
      sadece 22/80/443 açık

## 4. VPS'te ayağa kaldırma
- [x] `docker compose --profile prod build && ... up -d` — dört servis de
      (postgres, backend, frontend, caddy) ayakta ve sağlıklı
- [x] Piyasa verisi arka planda doldu — VPS'in Yahoo Finance'e ağ yolu
      local'den belirgin şekilde yavaş çıktı (~50sn yerine ~1.5-4dk arası
      değişti), hata değil ama bilgi olsun: her container restart'ında bu
      kadar sürebilir
- [x] Dışarıdan gerçek tarayıcıyla doğrulandı: `https://91-232-103-192.sslip.io`
      açılıyor, geçerli Let's Encrypt sertifikası, veriler doluyor, konsol
      hatası yok

## 5. Uçtan uca doğrulama
- [x] `https://91-232-103-192.sslip.io` tarayıcıdan açılıp Anasayfa test
      edildi (veri doluyor, hata yok) — Alarm/Favoriler/Halka Arz henüz
      denenmedi
- [ ] Alarm oluşturma/silme, favori ekleme gibi temel akışlar VPS üzerinden
      denenecek
- [ ] Telefonda: eski PWA ikonu (tünel adresine bağlıydı) silinip yeni
      `https://91-232-103-192.sslip.io`'den "Ana ekrana ekle" tekrar
      yapılacak
- [ ] Telefonda bildirimler yeni adresten tekrar açılıp test alarmıyla push
      bildirimi ulaştığı doğrulanacak
- [ ] Android nav bar / status bar renginin (daha önce düzelttiğimiz
      `viewport-fit=cover` + `color-scheme`) prod'da da doğru göründüğü
      kontrol edilecek

## 6. Son temizlik
- [ ] Local dev tünelleri (cloudflared) artık gerekmiyorsa tamamen
      kapatılacak
- [ ] `TODO.md`'deki "3. Altyapı" bölümü tamamlanmış olarak işaretlenecek
