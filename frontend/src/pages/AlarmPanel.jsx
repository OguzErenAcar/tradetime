import React, { useEffect, useState } from "react";
import {
  Plus,
  ArrowLeft,
  History,
  Trash2,
  TrendingUp,
  TrendingDown,
  Bell,
  BellOff,
  Star,
  Calendar,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { getAlarms, createAlarm, deleteAlarm, getPrice, getCheckInterval, setCheckInterval } from "../lib/api";
import { isPushSupported, getExistingSubscription, enablePush, disablePush } from "../lib/push";
import TickerSearchInput from "../components/TickerSearchInput";
import TickerLink from "../components/TickerLink";
import SitBadge from "../components/SitBadge";

// Accepts "." or "," as the decimal separator, and tolerates a thousands separator using the
// other character (e.g. "1.234,56" or "1,234.56") by treating the last "." or "," in the string
// as the decimal point and stripping the rest — a naive .replace(",", ".") mangles those into a
// truncated, silently-wrong number (e.g. "1.234,56" -> 1.234 instead of 1234.56).
function parsePriceInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  const decimalIndex = Math.max(trimmed.lastIndexOf(","), trimmed.lastIndexOf("."));
  if (decimalIndex === -1) return parseFloat(trimmed);
  const integerPart = trimmed.slice(0, decimalIndex).replace(/[.,]/g, "");
  const fractionPart = trimmed.slice(decimalIndex + 1).replace(/[.,]/g, "");
  return parseFloat(`${integerPart}.${fractionPart}`);
}

export default function BistAlarmPanel() {
  const [alarms, setAlarms] = useState([]);
  const [loadStatus, setLoadStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [view, setView] = useState("list"); // "list" | "add" | "history"
  const [alarmType, setAlarmType] = useState("price"); // "price" | "date"

  const [tickerInput, setTickerInput] = useState("");
  const [formType, setFormType] = useState("price"); // "price" | "date" — yeni alarm formundaki tip
  const [priceInput, setPriceInput] = useState("");
  const [directionInput, setDirectionInput] = useState("above");
  const [dateInput, setDateInput] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceStatus, setPriceStatus] = useState("idle"); // "idle" | "loading" | "ready" | "error"

  useEffect(() => {
    loadAlarms();
  }, []);

  function loadAlarms() {
    setLoadStatus("loading");
    getAlarms()
      .then((data) => {
        setAlarms(data);
        setLoadStatus("ready");
      })
      .catch(() => setLoadStatus("error"));
  }

  function resetForm() {
    setTickerInput("");
    setFormType("price");
    setPriceInput("");
    setDirectionInput("above");
    setDateInput("");
    setFormError("");
    setCurrentPrice(null);
    setPriceStatus("idle");
  }

  function handleTickerChange(value) {
    setTickerInput(value);
    setCurrentPrice(null);
    setPriceStatus("idle");
  }

  function handleTickerSelect(symbol) {
    setPriceStatus("loading");
    getPrice(symbol)
      .then((price) => {
        setCurrentPrice(price);
        setPriceStatus("ready");
      })
      .catch(() => setPriceStatus("error"));
  }

  async function handleAddAlarm() {
    const ticker = tickerInput.trim().toUpperCase();
    if (!ticker) {
      setFormError("Önce bir hisse adı gir.");
      return;
    }

    const needsDate = formType === "date";
    const hasPriceInput = priceInput.trim() !== "";
    const needsPrice = formType === "price" || hasPriceInput;

    let price = null;
    if (needsPrice) {
      price = parsePriceInput(priceInput);
      if (!priceInput || isNaN(price) || price <= 0) {
        setFormError("Geçerli bir fiyat gir.");
        return;
      }
      if (priceStatus === "ready" && currentPrice != null) {
        const currentText = currentPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
        if (directionInput === "above" && price <= currentPrice) {
          setFormError(
            `Fiyat zaten ${currentText} TL — "üzerine çıkınca" için hedef bunun üzerinde olmalı, yoksa alarm hemen tetiklenir.`
          );
          return;
        }
        if (directionInput === "below" && price >= currentPrice) {
          setFormError(
            `Fiyat zaten ${currentText} TL — "altına inince" için hedef bunun altında olmalı, yoksa alarm hemen tetiklenir.`
          );
          return;
        }
      }
    }
    if (needsDate && !dateInput) {
      setFormError("Bir tarih seç.");
      return;
    }

    const alarmType = formType === "price" ? "price" : needsPrice ? "price_by_date" : "date";

    setSubmitting(true);
    try {
      const newAlarm = await createAlarm({
        ticker,
        alarm_type: alarmType,
        target_price: needsPrice ? price : null,
        direction: needsPrice ? directionInput : null,
        target_date: needsDate ? dateInput : null,
      });
      setAlarms((prev) => [newAlarm, ...prev]);
      resetForm();
      setView("list");
    } catch {
      setFormError("Alarm eklenemedi, sunucuya ulaşılamıyor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const previous = alarms;
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAlarm(id);
    } catch {
      setAlarms(previous);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      {view === "list" && (
        <ListView
          alarms={alarms}
          loadStatus={loadStatus}
          onRetry={loadAlarms}
          alarmType={alarmType}
          setAlarmType={setAlarmType}
          onDelete={handleDelete}
          onAddClick={() => setView("add")}
          onHistoryClick={() => setView("history")}
        >
          <CheckIntervalControl />
          <NotificationControl />
        </ListView>
      )}
      {view === "history" && (
        <HistoryView
          alarms={alarms}
          loadStatus={loadStatus}
          onRetry={loadAlarms}
          onDelete={handleDelete}
          onBack={() => setView("list")}
        />
      )}
      {view === "add" && (
        <AddView
          tickerInput={tickerInput}
          onTickerChange={handleTickerChange}
          onTickerSelect={handleTickerSelect}
          currentPrice={currentPrice}
          priceStatus={priceStatus}
          formType={formType}
          setFormType={setFormType}
          priceInput={priceInput}
          setPriceInput={setPriceInput}
          directionInput={directionInput}
          setDirectionInput={setDirectionInput}
          dateInput={dateInput}
          setDateInput={setDateInput}
          formError={formError}
          submitting={submitting}
          onBack={() => {
            resetForm();
            setView("list");
          }}
          onSubmit={handleAddAlarm}
        />
      )}
    </div>
  );
}

function sortAlarms(list, key, dir) {
  const factor = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string") return av.localeCompare(bv) * factor;
    return (av - bv) * factor;
  });
}

function SortHeader({ label, sortKey, activeKey, dir, onSort, className = "", title }) {
  const active = sortKey === activeKey;
  return (
    <th
      className={`text-left font-medium text-slate-500 px-2 sm:px-4 py-2.5 select-none ${className}`}
      title={title}
    >
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 hover:text-slate-300 transition-colors ${
          active ? "text-slate-200" : ""
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )
        ) : (
          <ChevronsUpDown size={13} className="text-slate-700" />
        )}
      </button>
    </th>
  );
}

function ListView({
  alarms,
  loadStatus,
  onRetry,
  alarmType,
  setAlarmType,
  onDelete,
  onAddClick,
  onHistoryClick,
  children,
}) {
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">BIST</p>
          <h1 className="text-xl font-semibold text-slate-100">Alarmlarım</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onHistoryClick}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <History size={16} />
            Geçmiş
          </button>
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Yeni ekle
          </button>
        </div>
      </div>

      {children}

      <div className="flex gap-1 mb-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => setAlarmType("price")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            alarmType === "price"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Fiyata göre
        </button>
        <button
          onClick={() => setAlarmType("date")}
          className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
            alarmType === "date"
              ? "bg-slate-800 text-slate-100"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Tarihe göre
        </button>
      </div>

      {(() => {
        if (loadStatus === "loading") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500">Alarmlar yükleniyor...</p>
            </div>
          );
        }
        if (loadStatus === "error") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-rose-900 rounded-xl">
              <p className="text-sm text-rose-400 mb-3">Alarmlar yüklenemedi, sunucuya ulaşılamıyor.</p>
              <button onClick={onRetry} className="text-xs font-medium text-amber-400 hover:text-amber-300">
                Tekrar dene
              </button>
            </div>
          );
        }

        const filtered = alarms.filter((a) => {
          if (a.triggered) return false; // tetiklenenler sadece Geçmiş'te gösterilir
          return alarmType === "price" ? a.alarm_type === "price" : a.alarm_type !== "price";
        });

        if (filtered.length === 0) {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              {alarmType === "date" ? (
                <Calendar size={28} className="text-slate-600 mb-3" />
              ) : (
                <Bell size={28} className="text-slate-600 mb-3" />
              )}
              <p className="text-sm text-slate-400">Henüz alarmın yok, sağ üstten ekleyebilirsin.</p>
            </div>
          );
        }

        const sorted = sortAlarms(filtered, sortKey, sortDir);

        return (
          <>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <SortHeader label="Hisse" sortKey="ticker" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortHeader
                      label="Hedef fiyat"
                      sortKey="target_price"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="hidden sm:table-cell text-left font-medium text-slate-500 px-4 py-2.5">Yön</th>
                    <SortHeader
                      label="Tarih"
                      sortKey="target_date"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      className="hidden lg:table-cell"
                    />
                    <th className="hidden sm:table-cell text-left font-medium text-slate-500 px-4 py-2.5">Durum</th>
                    <SortHeader
                      label="SİT"
                      sortKey="last_viewed_at"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={handleSort}
                      title="Son İncelenme Tarihi"
                    />
                    <th className="px-2 sm:px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((alarm) => (
                    <AlarmTableRow key={alarm.id} alarm={alarm} onDelete={() => onDelete(alarm.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function CheckIntervalControl() {
  const [minutes, setMinutes] = useState(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "saving" | "error"

  useEffect(() => {
    getCheckInterval()
      .then((value) => {
        setMinutes(value);
        setDraft(String(value));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleSave() {
    const value = parseInt(draft, 10);
    if (!value || value <= 0) return;
    setStatus("saving");
    try {
      const saved = await setCheckInterval(value);
      setMinutes(saved);
      setDraft(String(saved));
      setStatus("ready");
      setEditing(false);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 mb-4 text-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <Clock size={14} />
        <span>Kontrol sıklığı</span>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500/50"
          />
          <span className="text-slate-500 text-xs">dk</span>
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="font-mono text-slate-200 hover:text-amber-400 transition-colors"
        >
          {status === "loading" && "..."}
          {status === "error" && "hata"}
          {status !== "loading" && status !== "error" && `${minutes} dk`}
        </button>
      )}
    </div>
  );
}

function NotificationControl() {
  const [status, setStatus] = useState("checking"); // "checking" | "unsupported" | "off" | "on" | "loading" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }
    getExistingSubscription()
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function handleToggle() {
    setErrorMsg("");
    setStatus("loading");
    try {
      if (status === "on") {
        await disablePush();
        setStatus("off");
      } else {
        await enablePush();
        setStatus("on");
      }
    } catch (err) {
      setErrorMsg(err.message || "Bir hata oluştu.");
      setStatus(status === "on" ? "on" : "off");
    }
  }

  if (status === "unsupported") {
    return (
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 mb-4 text-sm text-slate-500">
        <BellOff size={14} />
        Bu tarayıcı push bildirimini desteklemiyor
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-slate-400">
          {status === "on" ? <Bell size={14} /> : <BellOff size={14} />}
          <span>Bildirimler</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={status === "loading" || status === "checking"}
          className={`text-xs font-medium disabled:opacity-50 ${
            status === "on" ? "text-amber-400 hover:text-amber-300" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {status === "checking" && "..."}
          {status === "loading" && "..."}
          {status === "on" && "Açık — kapat"}
          {status === "off" && "Kapalı — aç"}
        </button>
      </div>
      {errorMsg && <p className="text-xs text-rose-400 mt-1.5">{errorMsg}</p>}
    </div>
  );
}

function formatDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("tr-TR");
}

function FavoriteStar({ isFavorite }) {
  if (!isFavorite) return null;
  return <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" aria-label="Favori" />;
}

function formatDateTime(isoStr) {
  return new Date(isoStr).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function alarmConditionText(alarm) {
  const isAbove = alarm.direction === "above";
  const priceText = `${Number(alarm.target_price).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
  })} TL ${isAbove ? "üzerine çıkınca" : "altına inince"}`;

  if (alarm.alarm_type === "price") return priceText;
  if (alarm.alarm_type === "date") return `${formatDate(alarm.target_date)} tarihinde hatırlat`;
  return `${priceText} (son: ${formatDate(alarm.target_date)})`;
}

function AlarmTableRow({ alarm, onDelete }) {
  const isAbove = alarm.direction === "above";
  const hasPrice = alarm.target_price != null;

  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60 group">
      <td className="px-2 sm:px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TickerLink symbol={alarm.ticker} className="font-mono font-semibold text-sm text-slate-100" />
          <FavoriteStar isFavorite={alarm.is_favorite} />
          {alarm.expired ? (
            <span className="sm:hidden text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
              Süresi doldu
            </span>
          ) : (
            alarm.triggered && (
              <span className="sm:hidden text-[10px] font-medium uppercase tracking-wide text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                Tetiklendi
              </span>
            )
          )}
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3">
        {hasPrice ? (
          <span
            className={`inline-flex items-center gap-1 font-mono text-sm sm:text-base font-bold whitespace-nowrap ${
              isAbove ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            <span className="sm:hidden">
              {isAbove ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            </span>
            {Number(alarm.target_price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        {hasPrice ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              isAbove ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isAbove ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isAbove ? "Üzerine çıkınca" : "Altına inince"}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-slate-400">
        {alarm.target_date ? (
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-600" />
            {formatDate(alarm.target_date)}
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        {alarm.expired ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            Süresi doldu
          </span>
        ) : alarm.triggered ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            Tetiklendi
          </span>
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
            Bekliyor
          </span>
        )}
      </td>
      <td className="px-2 sm:px-4 py-3">
        <SitBadge lastViewedAt={alarm.last_viewed_at} />
      </td>
      <td className="px-2 sm:px-4 py-3 text-right">
        <button
          onClick={onDelete}
          aria-label="Alarmı sil"
          className="text-slate-600 hover:text-rose-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

function HistoryTableRow({ alarm, onDelete }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60 group">
      <td className="px-2 sm:px-4 py-3">
        <div className="flex items-center gap-1.5">
          <TickerLink symbol={alarm.ticker} className="font-mono font-semibold text-sm text-slate-100" />
          <FavoriteStar isFavorite={alarm.is_favorite} />
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3 text-slate-400 text-xs sm:text-sm">{alarmConditionText(alarm)}</td>
      <td className="px-2 sm:px-4 py-3 text-slate-400 text-xs sm:text-sm">
        {alarm.triggered_at ? formatDateTime(alarm.triggered_at) : "—"}
      </td>
      <td className="px-2 sm:px-4 py-3">
        <SitBadge lastViewedAt={alarm.last_viewed_at} />
      </td>
      <td className="px-2 sm:px-4 py-3 text-right">
        <button
          onClick={onDelete}
          aria-label="Alarmı sil"
          className="text-slate-600 hover:text-rose-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

function HistoryView({ alarms, loadStatus, onRetry, onDelete, onBack }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-4 transition-colors"
      >
        <ArrowLeft size={16} />
        Geri
      </button>

      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">BIST</p>
        <h1 className="text-xl font-semibold text-slate-100">Alarm geçmişi</h1>
      </div>

      {(() => {
        if (loadStatus === "loading") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500">Yükleniyor...</p>
            </div>
          );
        }
        if (loadStatus === "error") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-rose-900 rounded-xl">
              <p className="text-sm text-rose-400 mb-3">Geçmiş yüklenemedi, sunucuya ulaşılamıyor.</p>
              <button onClick={onRetry} className="text-xs font-medium text-amber-400 hover:text-amber-300">
                Tekrar dene
              </button>
            </div>
          );
        }

        const triggered = alarms
          .filter((a) => a.triggered)
          .sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at));

        if (triggered.length === 0) {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <History size={28} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">Henüz tetiklenen alarm yok.</p>
            </div>
          );
        }

        return (
          <>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left font-medium text-slate-500 px-2 sm:px-4 py-2.5">Hisse</th>
                    <th className="text-left font-medium text-slate-500 px-2 sm:px-4 py-2.5">Koşul</th>
                    <th className="text-left font-medium text-slate-500 px-2 sm:px-4 py-2.5 text-xs sm:text-sm">
                      Tetiklenme zamanı
                    </th>
                    <th
                      className="text-left font-medium text-slate-500 px-2 sm:px-4 py-2.5"
                      title="Son İncelenme Tarihi"
                    >
                      SİT
                    </th>
                    <th className="px-2 sm:px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {triggered.map((alarm) => (
                    <HistoryTableRow key={alarm.id} alarm={alarm} onDelete={() => onDelete(alarm.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  );
}

function AddView({
  tickerInput,
  onTickerChange,
  onTickerSelect,
  currentPrice,
  priceStatus,
  formType,
  setFormType,
  priceInput,
  setPriceInput,
  directionInput,
  setDirectionInput,
  dateInput,
  setDateInput,
  formError,
  submitting,
  onBack,
  onSubmit,
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={16} />
        Geri
      </button>

      <h1 className="text-lg font-semibold text-slate-100 mb-1">Yeni alarm</h1>
      <p className="text-sm text-slate-500 mb-6">Hisse seç, alarm tipini belirle.</p>

      <div className="space-y-5">
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setFormType("price")}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
              formType === "price" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Fiyata göre
          </button>
          <button
            onClick={() => setFormType("date")}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
              formType === "date" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Tarihe göre
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Hisse adı</label>
          <TickerSearchInput value={tickerInput} onChange={onTickerChange} onSelect={onTickerSelect} />
          {priceStatus === "loading" && (
            <p className="text-xs text-slate-500 mt-1.5">Güncel fiyat alınıyor...</p>
          )}
          {priceStatus === "ready" && (
            <p className="text-xs text-slate-400 mt-1.5">
              Güncel fiyat:{" "}
              <span className="font-mono text-slate-200">
                {currentPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
              </span>
            </p>
          )}
          {priceStatus === "error" && (
            <p className="text-xs text-rose-400 mt-1.5">Güncel fiyat alınamadı.</p>
          )}
        </div>

        {formType === "date" && (
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Tarih</label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500/50 [color-scheme:dark]"
            />
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">
            Hedef fiyat (TL){formType === "date" && <span className="text-slate-600"> — opsiyonel</span>}
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Örn: 280.00"
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
          />
          {formType === "date" && (
            <p className="text-xs text-slate-600 mt-1.5">
              Boş bırakırsan sadece tarihte hatırlatma yapılır.
            </p>
          )}
        </div>

        {(formType === "price" || priceInput.trim() !== "") && (
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Yön</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirectionInput("above")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  directionInput === "above"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                <TrendingUp size={16} />
                Üstüne çıkınca
              </button>
              <button
                onClick={() => setDirectionInput("below")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  directionInput === "below"
                    ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                    : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                <TrendingDown size={16} />
                Altına inince
              </button>
            </div>
          </div>
        )}

        {formError && <p className="text-xs text-rose-400">{formError}</p>}

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50"
        >
          {submitting ? "Ekleniyor..." : "Ekle"}
        </button>
      </div>
    </div>
  );
}
