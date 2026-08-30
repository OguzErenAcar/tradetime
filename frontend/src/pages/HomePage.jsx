import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Search, TrendingUp, TrendingDown, Clock, Star } from "lucide-react";
import {
  getMarketDays,
  getMarketMovers,
  getMarketVolumes,
  getMarketMoversAll,
  getMarketVolumesAll,
  addFavorite,
  removeFavoriteByTicker,
  markTickerViewed,
} from "../lib/api";
import TickerLink, { tradingViewUrl } from "../components/TickerLink";
import SitBadge from "../components/SitBadge";
import TickerSearchInput from "../components/TickerSearchInput";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Fiyat alarmı",
    text: "Bir hisse hedef fiyatın üzerine çıkınca ya da altına inince anında haberdar ol.",
  },
  {
    icon: Calendar,
    title: "Tarihe göre hatırlatma",
    text: "Belirli bir tarihte hatırlatma kur, istersen fiyat hedefiyle birleştir.",
  },
  {
    icon: Search,
    title: "Hızlı hisse arama",
    text: "BIST'teki tüm semboller arasından yazarak ara, dropdown'dan seç.",
  },
  {
    icon: Clock,
    title: "Ayarlanabilir kontrol sıklığı",
    text: "Sistem alarmlarını istediğin sıklıkta otomatik kontrol eder.",
  },
];

function formatChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatVolume(value) {
  return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDayShort(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("tr-TR", { weekday: "short" }),
    dayMonth: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
  };
}

function formatDayLong(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
}

function DayPicker({ days, selected, onSelect }) {
  const scrollRef = useRef(null);

  if (days.length === 0) return null;

  function scrollByAmount(amount) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="w-full flex items-center gap-2 mb-3">
      <button
        onClick={() => scrollByAmount(-288)}
        aria-label="Sola kaydır"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex-1 flex gap-2 overflow-x-auto snap-x scroll-smooth pb-2 -mx-1 px-1"
      >
        {days.map((day) => {
          const { weekday, dayMonth } = formatDayShort(day);
          const active = day === selected;
          return (
            <button
              key={day}
              onClick={() => onSelect(day)}
              className={`shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl border text-xs transition-colors snap-start ${
                active
                  ? "bg-amber-500 border-amber-500 text-slate-950 font-semibold"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              <span className="uppercase">{weekday}</span>
              <span className="font-mono mt-0.5">{dayMonth}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scrollByAmount(288)}
        aria-label="Sağa kaydır"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

const PERIODS = [
  { key: "daily", label: "Günlük" },
  { key: "weekly", label: "Haftalık" },
  { key: "monthly", label: "Aylık" },
];

function PeriodToggle({ period, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            period === p.key ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const METRICS = [
  { key: "gainers", label: "En çok artanlar" },
  { key: "losers", label: "En çok düşenler" },
  { key: "highest_volume", label: "En yüksek hacimliler" },
  { key: "lowest_volume", label: "En düşük hacimliler" },
];

const METRIC_TITLES = {
  gainers: "En çok artanlar",
  losers: "En çok düşenler",
  highest_volume: "En yüksek hacimliler",
  lowest_volume: "En düşük hacimliler",
};

const DIRECTION_BY_METRIC = {
  gainers: "gainers",
  losers: "losers",
  highest_volume: "highest",
  lowest_volume: "lowest",
};

const ALL_PAGE_SIZE = 20;

function MetricToggle({ metric, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-3">
      {METRICS.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            metric === m.key ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function FavoriteButton({ isFavorite, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      className="shrink-0 text-slate-600 hover:text-amber-400 transition-colors p-0.5"
    >
      <Star size={14} className={isFavorite ? "text-amber-400 fill-amber-400" : ""} />
    </button>
  );
}

function StatusBox({ text, tone = "default" }) {
  return (
    <div className="border border-slate-800 rounded-xl py-6 px-4 text-center">
      <p className={`text-sm ${tone === "error" ? "text-rose-400" : "text-slate-500"}`}>{text}</p>
    </div>
  );
}

function ChangeBadge({ value, positive }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-sm font-bold ${
        positive ? "text-emerald-400" : "text-rose-400"
      }`}
    >
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {formatChange(value)}
    </span>
  );
}

function MoverTableRow({ mover, rank, positive, onToggleFavorite }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60">
      <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{rank}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FavoriteButton
            isFavorite={mover.is_favorite}
            onToggle={() => onToggleFavorite(mover.symbol, mover.is_favorite)}
          />
          <TickerLink symbol={mover.symbol} className="font-mono font-semibold text-sm text-slate-100" />
        </div>
      </td>
      <td className="px-4 py-2.5 font-mono text-sm text-slate-400">
        {mover.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
      </td>
      <td className="px-4 py-2.5">
        <ChangeBadge value={mover.change_percent} positive={positive} />
      </td>
      <td className="px-4 py-2.5">
        <SitBadge lastViewedAt={mover.last_viewed_at} />
      </td>
    </tr>
  );
}

function MoversList({ title, movers, positive, status, onToggleFavorite, rankOffset = 0, headerAction }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {headerAction}
      </div>
      {status === "loading" && <StatusBox text="Yükleniyor..." />}
      {status === "error" && <StatusBox text="Veri alınamadı." tone="error" />}
      {status === "empty" && <StatusBox text="Bu gün için veri yok, birazdan tekrar dene." />}
      {(status === "ready" || status === "refreshing") && (
        <div
          className={`transition-opacity duration-300 ease-out ${
            status === "refreshing" ? "opacity-40" : "opacity-100"
          }`}
        >
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-8">#</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Hisse</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Fiyat</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Değişim</th>
                  <th
                    className="text-left font-medium text-slate-500 px-4 py-2.5"
                    title="Son İncelenme Tarihi"
                  >
                    SİT
                  </th>
                </tr>
              </thead>
              <tbody>
                {movers.map((mover, i) => (
                  <MoverTableRow
                    key={mover.symbol}
                    mover={mover}
                    rank={rankOffset + i + 1}
                    positive={positive}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function VolumeTableRow({ item, rank, onToggleFavorite }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60">
      <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{rank}</td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FavoriteButton
            isFavorite={item.is_favorite}
            onToggle={() => onToggleFavorite(item.symbol, item.is_favorite)}
          />
          <TickerLink symbol={item.symbol} className="font-mono font-semibold text-sm text-slate-100" />
        </div>
      </td>
      <td className="px-4 py-2.5 font-mono text-sm text-slate-400">
        {item.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
      </td>
      <td className="px-4 py-2.5 font-mono text-sm font-bold text-slate-200">{formatVolume(item.volume)}</td>
      <td className="px-4 py-2.5">
        <SitBadge lastViewedAt={item.last_viewed_at} />
      </td>
    </tr>
  );
}

function VolumesList({ title, items, status, onToggleFavorite, rankOffset = 0, headerAction }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {headerAction}
      </div>
      {status === "loading" && <StatusBox text="Yükleniyor..." />}
      {status === "error" && <StatusBox text="Veri alınamadı." tone="error" />}
      {status === "empty" && <StatusBox text="Bu gün için veri yok, birazdan tekrar dene." />}
      {(status === "ready" || status === "refreshing") && (
        <div
          className={`transition-opacity duration-300 ease-out ${
            status === "refreshing" ? "opacity-40" : "opacity-100"
          }`}
        >
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-8">#</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Hisse</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Fiyat</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Hacim</th>
                  <th
                    className="text-left font-medium text-slate-500 px-4 py-2.5"
                    title="Son İncelenme Tarihi"
                  >
                    SİT
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <VolumeTableRow
                    key={item.symbol}
                    item={item}
                    rank={rankOffset + i + 1}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between mt-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors"
      >
        Önceki
      </button>
      <span className="text-xs text-slate-500">
        Sayfa {page} / {totalPages} · {total} hisse
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 disabled:opacity-40 disabled:hover:border-slate-800 transition-colors"
      >
        Sonraki
      </button>
    </div>
  );
}

export default function HomePage() {
  const [heroSearch, setHeroSearch] = useState("");
  const [days, setDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [period, setPeriod] = useState("daily"); // "daily" | "weekly" | "monthly"
  const [metric, setMetric] = useState("gainers"); // "gainers" | "losers" | "highest_volume" | "lowest_volume"
  const [movers, setMovers] = useState({ gainers: [], losers: [] });
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error" | "empty"
  const [volumes, setVolumes] = useState({ highest: [], lowest: [] });
  const [volumeStatus, setVolumeStatus] = useState("loading"); // "loading" | "ready" | "error" | "empty"
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allStatus, setAllStatus] = useState("loading"); // "loading" | "ready" | "error" | "empty"
  const [allItemsKind, setAllItemsKind] = useState(null); // "volume" | "movers" — shape of the data currently in allItems

  useEffect(() => {
    getMarketDays()
      .then((list) => {
        setDays(list);
        if (list.length > 0) {
          setSelectedDate(list[0]);
        } else {
          setStatus("empty");
        }
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (period === "daily" && !selectedDate) return;
    setStatus((prev) => (prev === "ready" || prev === "refreshing" ? "refreshing" : "loading"));
    getMarketMovers(selectedDate, period)
      .then((data) => {
        setMovers(data);
        setStatus(data.gainers.length === 0 ? "empty" : "ready");
      })
      .catch(() => setStatus("error"));
  }, [selectedDate, period]);

  useEffect(() => {
    if (period === "daily" && !selectedDate) return;
    setVolumeStatus((prev) => (prev === "ready" || prev === "refreshing" ? "refreshing" : "loading"));
    getMarketVolumes(selectedDate, period)
      .then((data) => {
        setVolumes(data);
        setVolumeStatus(data.highest.length === 0 ? "empty" : "ready");
      })
      .catch(() => setVolumeStatus("error"));
  }, [selectedDate, period]);

  useEffect(() => {
    if (!showAll) return;
    if (period === "daily" && !selectedDate) return;
    const isVolumeMetric = metric === "highest_volume" || metric === "lowest_volume";
    const kind = isVolumeMetric ? "volume" : "movers";
    setAllStatus((prev) => (prev === "ready" || prev === "refreshing" ? "refreshing" : "loading"));
    const direction = DIRECTION_BY_METRIC[metric];
    const fetcher = isVolumeMetric ? getMarketVolumesAll : getMarketMoversAll;
    fetcher(direction, selectedDate, period, page, ALL_PAGE_SIZE)
      .then((data) => {
        setAllItems(data.items);
        setAllTotal(data.total);
        setAllItemsKind(kind);
        setAllStatus(data.items.length === 0 ? "empty" : "ready");
      })
      .catch(() => setAllStatus("error"));
  }, [showAll, metric, period, selectedDate, page]);

  function toggleFavorite(symbol, isFavorite) {
    const withFlag = (fav) => (item) => (item.symbol === symbol ? { ...item, is_favorite: fav } : item);
    function apply(fav) {
      setMovers((prev) => ({ gainers: prev.gainers.map(withFlag(fav)), losers: prev.losers.map(withFlag(fav)) }));
      setVolumes((prev) => ({ highest: prev.highest.map(withFlag(fav)), lowest: prev.lowest.map(withFlag(fav)) }));
      setAllItems((prev) => prev.map(withFlag(fav)));
    }

    apply(!isFavorite);
    const request = isFavorite ? removeFavoriteByTicker(symbol) : addFavorite(symbol);
    request.catch(() => apply(isFavorite));
  }

  function handlePeriodChange(next) {
    setPeriod(next);
    setPage(1);
  }

  function handleMetricChange(next) {
    setMetric(next);
    setPage(1);
  }

  function handleDateChange(next) {
    setSelectedDate(next);
    setPage(1);
  }

  function handleToggleAll() {
    setShowAll((v) => !v);
    setPage(1);
  }

  const showDayPicker = period === "daily";
  const isVolumeMetric = metric === "highest_volume" || metric === "lowest_volume";
  const compactItems = isVolumeMetric
    ? metric === "highest_volume"
      ? volumes.highest
      : volumes.lowest
    : metric === "gainers"
    ? movers.gainers
    : movers.losers;
  const compactStatus = isVolumeMetric ? volumeStatus : status;
  // Volume items ({symbol, price, volume}) and mover items ({symbol, price, change_percent}) are
  // rendered by different row components. allItems/allStatus lag one render behind a metric switch
  // (the effect that refetches them only runs after this render commits), so guard here — at render
  // time — rather than in the effect: never hand a stale, wrong-shaped allItems to the wrong list.
  const allKindMatches = allItemsKind === (isVolumeMetric ? "volume" : "movers");
  // allResolved: we have a real (possibly stale-but-same-shape) "Tümü" result for the current
  // selection. Until then — right after clicking "Tümü", or right after a metric switch while
  // "Tümü" is open — fall back to the already-loaded top-10 compact list (same shape, dimmed) so
  // the view stays populated instead of flashing a "Yükleniyor..." box.
  const allResolved = allKindMatches && allStatus !== "loading";
  const usingAllData = allResolved && (allStatus === "ready" || allStatus === "refreshing");
  const displayItems = showAll ? (allResolved ? allItems : compactItems) : compactItems;
  const displayStatus = showAll
    ? allResolved
      ? allStatus
      : compactStatus === "ready" || compactStatus === "refreshing"
      ? "refreshing"
      : compactStatus
    : compactStatus;
  const rankOffset = showAll && usingAllData ? (page - 1) * ALL_PAGE_SIZE : 0;

  function handleHeroSelect(symbol) {
    markTickerViewed(symbol).catch(() => {});
    window.open(tradingViewUrl(symbol), "_blank", "noopener,noreferrer");
    setHeroSearch("");
  }

  const headerAction = (
    <button
      onClick={handleToggleAll}
      className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
        showAll ? "bg-amber-500/10 text-amber-400" : "text-slate-500 hover:text-slate-300"
      }`}
    >
      {showAll ? "İlk 10" : "Tümü"}
    </button>
  );

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">BIST</p>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">TradeTime</h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Takip ettiğin hisseler için fiyat veya tarih bazlı alarm kur, sistem düzenli aralıklarla
          kontrol edip koşul sağlanınca sana haber versin.
        </p>
      </div>

      <div className="mb-8 max-w-xl mx-auto">
        <TickerSearchInput
          value={heroSearch}
          onChange={setHeroSearch}
          onSelect={handleHeroSelect}
          size="lg"
          placeholder="Kod veya şirket adıyla ara, TradingView'da aç... (THYAO ya da Türk Hava Yolları)"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Icon size={18} className="text-amber-400 mb-2" />
            <p className="text-sm font-medium text-slate-100 mb-1">{title}</p>
            <p className="text-xs text-slate-500">{text}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-slate-400">Piyasa</h2>
        <PeriodToggle period={period} onChange={handlePeriodChange} />
      </div>

      <MetricToggle metric={metric} onChange={handleMetricChange} />

      <p className="text-xs text-slate-600 mb-3">
        {period === "daily"
          ? selectedDate
            ? formatDayLong(selectedDate)
            : "Gün seçilmedi"
          : period === "weekly"
          ? "Son 5 işlem günü"
          : "Son 21 işlem günü"}
      </p>

      {showDayPicker && <DayPicker days={days} selected={selectedDate} onSelect={handleDateChange} />}

      {isVolumeMetric ? (
        <VolumesList
          title={METRIC_TITLES[metric]}
          items={displayItems}
          status={displayStatus}
          onToggleFavorite={toggleFavorite}
          rankOffset={rankOffset}
          headerAction={headerAction}
        />
      ) : (
        <MoversList
          title={METRIC_TITLES[metric]}
          movers={displayItems}
          positive={metric === "gainers"}
          status={displayStatus}
          onToggleFavorite={toggleFavorite}
          rankOffset={rankOffset}
          headerAction={headerAction}
        />
      )}

      {showAll && usingAllData && (
        <Pagination page={page} pageSize={ALL_PAGE_SIZE} total={allTotal} onPageChange={setPage} />
      )}
    </div>
  );
}
