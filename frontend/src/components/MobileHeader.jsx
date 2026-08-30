import React from "react";
import Logo from "./Logo.jsx";

export default function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 py-3">
      <Logo size="sm" />
    </header>
  );
}
