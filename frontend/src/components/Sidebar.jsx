import React from "react";
import { Home, Bell, Star, Rocket } from "lucide-react";
import Logo from "./Logo.jsx";

export const NAV_ITEMS = [
  { key: "home", label: "Anasayfa", icon: Home },
  { key: "alarms", label: "Alarm", icon: Bell },
  { key: "favorites", label: "Favoriler", icon: Star },
  { key: "ipos", label: "Halka Arz", icon: Rocket },
];

export function pathForPage(key) {
  return key === "home" ? "/" : `/${key}`;
}

export function handleNavClick(e, key, onNavigate) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  onNavigate(key);
}

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="hidden md:flex w-72 shrink-0 bg-slate-950 border-r border-slate-800 flex-col py-8 px-4">
      <div className="px-2 mb-8">
        <Logo size="lg" />
      </div>
      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = page === key;
          return (
            <a
              key={key}
              href={pathForPage(key)}
              onClick={(e) => handleNavClick(e, key, onNavigate)}
              className={`flex items-center gap-3 text-base font-medium px-4 py-3 rounded-lg transition-colors text-left ${
                active
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
              }`}
            >
              <Icon size={20} />
              {label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
