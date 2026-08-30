import React, { useEffect, useState } from "react";
import { Star, Trash2, TrendingUp, TrendingDown, Bell, BellOff } from "lucide-react";
import { getFavorites, addFavorite, removeFavorite } from "../lib/api";
import TickerSearchInput from "../components/TickerSearchInput";
import TickerLink from "../components/TickerLink";
import SitBadge from "../components/SitBadge";

function formatChange(value) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function ChangeBadge({ value }) {
  if (value == null) {
    return <span className="text-slate-600">—</span>;
  }
  const positive = value >= 0;
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

function AlarmBadge({ hasAlarm }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        hasAlarm ? "text-amber-400" : "text-slate-600"
      }`}
    >
      {hasAlarm ? <Bell size={13} /> : <BellOff size={13} />}
      {hasAlarm ? "Var" : "Yok"}
    </span>
  );
}

function FavoriteTableRow({ favorite, onDelete }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60 group">
      <td className="px-4 py-3">
        <TickerLink symbol={favorite.ticker} className="font-mono font-semibold text-sm text-slate-100" />
      </td>
      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{favorite.name || "—"}</td>
      <td className="px-4 py-3">
        {favorite.price != null ? (
          <span className="font-mono text-base font-bold text-slate-100">
            {favorite.price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} TL
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ChangeBadge value={favorite.change_percent} />
      </td>
      <td className="px-4 py-3">
        <AlarmBadge hasAlarm={favorite.has_alarm} />
      </td>
      <td className="px-4 py-3">
        <SitBadge lastViewedAt={favorite.last_viewed_at} />
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          aria-label="Favorilerden çıkar"
          className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [searchInput, setSearchInput] = useState("");
  const [addError, setAddError] = useState("");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setStatus("loading");
    getFavorites()
      .then((data) => {
        setFavorites(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  async function handleAdd(symbol) {
    setAddError("");
    try {
      await addFavorite(symbol);
      setSearchInput("");
      load();
    } catch {
      setAddError("Favori eklenemedi, sunucuya ulaşılamıyor.");
    }
  }

  async function handleDelete(id) {
    const previous = favorites;
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    try {
      await removeFavorite(id);
    } catch {
      setFavorites(previous);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">BIST</p>
        <h1 className="text-xl font-semibold text-slate-100">Favoriler</h1>
      </div>

      <div className="mb-5">
        <TickerSearchInput value={searchInput} onChange={setSearchInput} onSelect={handleAdd} />
        {addError && <p className="text-xs text-rose-400 mt-1.5">{addError}</p>}
      </div>

      {(() => {
        if (status === "loading") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500">Yükleniyor...</p>
            </div>
          );
        }
        if (status === "error") {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-rose-900 rounded-xl">
              <p className="text-sm text-rose-400 mb-3">Favoriler yüklenemedi, sunucuya ulaşılamıyor.</p>
              <button onClick={load} className="text-xs font-medium text-amber-400 hover:text-amber-300">
                Tekrar dene
              </button>
            </div>
          );
        }
        if (favorites.length === 0) {
          return (
            <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
              <Star size={28} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">Henüz favori hissen yok, yukarıdan ara ve ekle.</p>
            </div>
          );
        }

        return (
          <>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Hisse</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Şirket Adı</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Güncel Fiyat</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Değişim</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-2.5">Alarm</th>
                    <th
                      className="text-left font-medium text-slate-500 px-4 py-2.5"
                      title="Son İncelenme Tarihi"
                    >
                      SİT
                    </th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {favorites.map((fav) => (
                    <FavoriteTableRow key={fav.id} favorite={fav} onDelete={() => handleDelete(fav.id)} />
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
