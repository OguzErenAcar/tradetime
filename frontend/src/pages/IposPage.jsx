import React, { useEffect, useState } from "react";
import { Rocket, ExternalLink } from "lucide-react";
import { getIpos } from "../lib/api";

const STATUS_META = {
  completed: { label: "Sonuçlandı", text: "text-emerald-400", dot: "bg-emerald-400" },
  scheduled: { label: "Planlandı", text: "text-amber-400", dot: "bg-amber-400" },
  postponed: { label: "Ertelendi", text: "text-rose-400", dot: "bg-rose-400" },
  draft: { label: "Taslak", text: "text-slate-500", dot: "bg-slate-500" },
};

const FILTERS = [
  { key: "active", label: "Yaklaşan / Yeni", match: (s) => s === "scheduled" || s === "completed" },
  { key: "draft", label: "Taslak", match: (s) => s === "draft" },
  { key: "postponed", label: "Ertelenen", match: (s) => s === "postponed" },
  { key: "all", label: "Tümü", match: () => true },
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function IpoTableRow({ ipo }) {
  return (
    <tr className="border-b border-slate-800 last:border-0 hover:bg-slate-900/60">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {ipo.logo_url && (
            <img src={ipo.logo_url} alt="" className="w-6 h-6 rounded object-contain bg-slate-900 shrink-0" />
          )}
          <span className="font-mono font-semibold text-sm text-slate-100 truncate">{ipo.ticker || "—"}</span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-300 truncate">{ipo.company}</td>
      <td className="px-4 py-2.5 text-sm text-slate-400">{ipo.date_text || "—"}</td>
      <td className="px-4 py-2.5">
        <StatusBadge status={ipo.status} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <a
          href={ipo.detail_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="halkarz.com'da görüntüle"
          className="inline-flex text-slate-600 hover:text-amber-400 transition-colors p-1"
        >
          <ExternalLink size={15} />
        </a>
      </td>
    </tr>
  );
}

function IpoCard({ ipo }) {
  return (
    <a
      href={ipo.detail_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 hover:border-slate-700 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        {ipo.logo_url && (
          <img src={ipo.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-slate-950 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-sm text-slate-100">{ipo.ticker || "—"}</span>
            <StatusBadge status={ipo.status} />
          </div>
          <p className="text-xs text-slate-500 truncate">{ipo.company}</p>
        </div>
      </div>
      <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">{ipo.date_text || "—"}</span>
    </a>
  );
}

export default function IposPage() {
  const [ipos, setIpos] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    load();
  }, []);

  function load() {
    setStatus("loading");
    getIpos()
      .then((data) => {
        setIpos(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  const activeFilter = FILTERS.find((f) => f.key === filter);
  const filtered = ipos.filter((ipo) => activeFilter.match(ipo.status));

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-1">BIST</p>
        <h1 className="text-xl font-semibold text-slate-100">Halka Arzlar</h1>
        <p className="text-xs text-slate-500 mt-1">
          Kaynak:{" "}
          <a
            href="https://halkarz.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-400 hover:underline transition-colors"
          >
            halkarz.com
          </a>
        </p>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 mb-4 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              filter === f.key ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-rose-900 rounded-xl">
          <p className="text-sm text-rose-400 mb-3">Halka arz listesi yüklenemedi, sunucuya ulaşılamıyor.</p>
          <button onClick={load} className="text-xs font-medium text-amber-400 hover:text-amber-300">
            Tekrar dene
          </button>
        </div>
      )}

      {status === "ready" && filtered.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 px-4 border border-dashed border-slate-800 rounded-xl">
          <Rocket size={28} className="text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">Bu filtrede kayıt yok.</p>
        </div>
      )}

      {status === "ready" && filtered.length > 0 && (
        <>
          <div className="hidden md:block border border-slate-800 rounded-xl">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-28">Hisse</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5">Şirket</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-40">Tarih</th>
                  <th className="text-left font-medium text-slate-500 px-4 py-2.5 w-32">Durum</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ipo) => (
                  <IpoTableRow key={ipo.detail_url} ipo={ipo} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((ipo) => (
              <IpoCard key={ipo.detail_url} ipo={ipo} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
