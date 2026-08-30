import React from "react";
import { markTickerViewed } from "../lib/api";

export function tradingViewUrl(symbol) {
  return `https://tr.tradingview.com/chart/?symbol=${encodeURIComponent(`BIST:${symbol}`)}`;
}

export default function TickerLink({ symbol, className = "", children }) {
  function handleClick(e) {
    e.stopPropagation();
    markTickerViewed(symbol).catch(() => {});
  }

  return (
    <a
      href={tradingViewUrl(symbol)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      onAuxClick={handleClick}
      className={`hover:text-amber-400 hover:underline transition-colors ${className}`}
    >
      {children ?? symbol}
    </a>
  );
}
