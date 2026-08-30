const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function getIpos() {
  const res = await fetch(`${API_BASE_URL}/ipos`);
  if (!res.ok) throw new Error("Halka arz listesi alınamadı");
  return res.json();
}

export async function getAlarms() {
  const res = await fetch(`${API_BASE_URL}/alarms`);
  if (!res.ok) throw new Error("Alarmlar alınamadı");
  return res.json();
}

export async function createAlarm(payload) {
  const res = await fetch(`${API_BASE_URL}/alarms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Alarm eklenemedi");
  return res.json();
}

export async function deleteAlarm(id) {
  const res = await fetch(`${API_BASE_URL}/alarms/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Alarm silinemedi");
}

export async function searchTickers(q) {
  const res = await fetch(`${API_BASE_URL}/tickers?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Hisseler alınamadı");
  return res.json();
}

export async function markTickerViewed(ticker) {
  const res = await fetch(`${API_BASE_URL}/tickers/${encodeURIComponent(ticker)}/view`, { method: "POST" });
  if (!res.ok) throw new Error("Görüntülenme kaydedilemedi");
  return res.json();
}

export async function getPrice(ticker) {
  const res = await fetch(`${API_BASE_URL}/prices/${encodeURIComponent(ticker)}`);
  if (!res.ok) throw new Error("Fiyat alınamadı");
  const data = await res.json();
  return data.price;
}

export async function getMarketDays() {
  const res = await fetch(`${API_BASE_URL}/market/days`);
  if (!res.ok) throw new Error("Gün listesi alınamadı");
  const data = await res.json();
  return data.days;
}

export async function getMarketMovers(date, period = "daily") {
  const params = new URLSearchParams();
  if (period !== "daily") params.set("period", period);
  if (date && period === "daily") params.set("date", date);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/market/movers${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Piyasa verisi alınamadı");
  return res.json();
}

export async function getMarketVolumes(date, period = "daily") {
  const params = new URLSearchParams();
  if (period !== "daily") params.set("period", period);
  if (date && period === "daily") params.set("date", date);
  const qs = params.toString();
  const res = await fetch(`${API_BASE_URL}/market/volumes${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Hacim verisi alınamadı");
  return res.json();
}

export async function getMarketMoversAll(direction, date, period = "daily", page = 1, pageSize = 20) {
  const params = new URLSearchParams({ direction, page: String(page), page_size: String(pageSize) });
  if (period !== "daily") params.set("period", period);
  if (date && period === "daily") params.set("date", date);
  const res = await fetch(`${API_BASE_URL}/market/movers/all?${params.toString()}`);
  if (!res.ok) throw new Error("Piyasa verisi alınamadı");
  return res.json();
}

export async function getMarketVolumesAll(direction, date, period = "daily", page = 1, pageSize = 20) {
  const params = new URLSearchParams({ direction, page: String(page), page_size: String(pageSize) });
  if (period !== "daily") params.set("period", period);
  if (date && period === "daily") params.set("date", date);
  const res = await fetch(`${API_BASE_URL}/market/volumes/all?${params.toString()}`);
  if (!res.ok) throw new Error("Hacim verisi alınamadı");
  return res.json();
}

export async function getVapidPublicKey() {
  const res = await fetch(`${API_BASE_URL}/push/vapid-public-key`);
  if (!res.ok) throw new Error("VAPID anahtarı alınamadı");
  const data = await res.json();
  return data.public_key;
}

export async function subscribePush(subscription) {
  const res = await fetch(`${API_BASE_URL}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
  if (!res.ok) throw new Error("Abonelik kaydedilemedi");
}

export async function unsubscribePush(endpoint) {
  const res = await fetch(`${API_BASE_URL}/push/unsubscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) throw new Error("Abonelik silinemedi");
}

export async function getFavorites() {
  const res = await fetch(`${API_BASE_URL}/favorites`);
  if (!res.ok) throw new Error("Favoriler alınamadı");
  return res.json();
}

export async function addFavorite(ticker) {
  const res = await fetch(`${API_BASE_URL}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  if (!res.ok) throw new Error("Favori eklenemedi");
  return res.json();
}

export async function removeFavorite(id) {
  const res = await fetch(`${API_BASE_URL}/favorites/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Favori silinemedi");
}

export async function removeFavoriteByTicker(ticker) {
  const res = await fetch(`${API_BASE_URL}/favorites/by-ticker/${encodeURIComponent(ticker)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Favori silinemedi");
}

export async function getCheckInterval() {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new Error("Kontrol sıklığı alınamadı");
  const data = await res.json();
  return data.check_interval_minutes;
}

export async function setCheckInterval(minutes) {
  const res = await fetch(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ check_interval_minutes: minutes }),
  });
  if (!res.ok) throw new Error("Kontrol sıklığı güncellenemedi");
  const data = await res.json();
  return data.check_interval_minutes;
}
