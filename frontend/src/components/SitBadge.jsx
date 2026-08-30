import React from "react";

const SIT_STEPS = [
  { key: "minute", label: "1 dk", dot: "bg-cyan-300", text: "text-cyan-300" },
  { key: "day", label: "1 gün", dot: "bg-sky-400", text: "text-sky-400" },
  { key: "week", label: "1 hafta", dot: "bg-blue-400", text: "text-blue-400" },
  { key: "month", label: "1 ay", dot: "bg-indigo-400", text: "text-indigo-400" },
  { key: "never", label: "hiç", dot: "bg-slate-500", text: "text-slate-500" },
];

function parseAsUtc(isoStr) {
  // Backend saat dilimsiz UTC string döndürüyor (örn. "2026-08-30T08:53:57.293917");
  // "Z" olmadan new Date() bunu tarayıcının yerel saatiymiş gibi yorumluyor.
  const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(isoStr);
  return new Date(hasTimezone ? isoStr : `${isoStr}Z`);
}

export function sitBucket(lastViewedAt) {
  if (!lastViewedAt) return "never";
  const diffMs = Date.now() - parseAsUtc(lastViewedAt).getTime();
  if (diffMs <= 60000) return "minute";
  const diffDays = diffMs / 86400000;
  if (diffDays <= 1) return "day";
  if (diffDays <= 7) return "week";
  if (diffDays <= 30) return "month";
  return "never";
}

export default function SitBadge({ lastViewedAt }) {
  const step = SIT_STEPS.find((s) => s.key === sitBucket(lastViewedAt));
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${step.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.dot}`} />
      {step.label}
    </span>
  );
}
