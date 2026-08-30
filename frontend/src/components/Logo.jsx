import React from "react";
import { TrendingUp } from "lucide-react";

export default function Logo({ size = "md" }) {
  const iconBox = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";

  return (
    <div className="flex items-center gap-2">
      <div className={`${iconBox} rounded-lg bg-[#863bff] flex items-center justify-center shrink-0`}>
        <TrendingUp size={iconSize} className="text-white" strokeWidth={2.5} />
      </div>
      <span className={`font-semibold text-slate-100 tracking-tight ${textSize}`}>TradeTime</span>
    </div>
  );
}
