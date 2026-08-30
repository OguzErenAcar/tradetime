import React from "react";
import { NAV_ITEMS, pathForPage, handleNavClick } from "./Sidebar.jsx";

export default function MobileNav({ page, onNavigate }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-950 border-t border-slate-800 flex pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = page === key;
        return (
          <a
            key={key}
            href={pathForPage(key)}
            onClick={(e) => handleNavClick(e, key, onNavigate)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              active ? "text-slate-100" : "text-slate-500"
            }`}
          >
            <Icon size={18} />
            {label}
          </a>
        );
      })}
    </nav>
  );
}
