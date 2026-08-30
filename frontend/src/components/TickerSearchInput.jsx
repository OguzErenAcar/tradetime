import React, { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { searchTickers } from "../lib/api";

export default function TickerSearchInput({ value, onChange, onSelect, size = "md", placeholder, autoFocus }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const isLarge = size === "lg";

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchTickers(value)
        .then((data) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  function handleSelect(symbol) {
    onChange(symbol);
    if (onSelect) onSelect(symbol);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Search
        size={isLarge ? 20 : 16}
        className={`absolute ${isLarge ? "left-4" : "left-3"} top-1/2 -translate-y-1/2 text-slate-600`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder ?? "THYAO, ASELS, GARAN..."}
        autoComplete="off"
        autoFocus={autoFocus}
        className={`w-full bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 ${
          isLarge ? "pl-11 pr-4 py-4 text-lg" : "pl-9 pr-3 py-2.5 text-sm"
        }`}
      />

      {open && (
        <div
          className={`absolute z-10 mt-1 w-full max-h-56 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg shadow-lg ${
            isLarge ? "text-base" : ""
          }`}
        >
          {loading ? (
            <p className="px-3 py-2 text-xs text-slate-500">Aranıyor...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">Sonuç bulunamadı</p>
          ) : (
            results.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(t.symbol)}
                className={`w-full flex items-center justify-between gap-2 text-left hover:bg-slate-800 transition-colors ${
                  isLarge ? "px-4 py-3" : "px-3 py-2"
                }`}
              >
                <span className="font-mono text-sm text-slate-100 shrink-0">{t.symbol}</span>
                <span className="text-xs text-slate-500 truncate">{t.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
