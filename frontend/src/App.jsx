import { useEffect, useState } from "react";
import BistAlarmPanel from "./pages/AlarmPanel.jsx";
import FavoritesPage from "./pages/FavoritesPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import IposPage from "./pages/IposPage.jsx";
import MobileHeader from "./components/MobileHeader.jsx";
import MobileNav from "./components/MobileNav.jsx";
import Sidebar, { NAV_ITEMS, pathForPage } from "./components/Sidebar.jsx";

function pageForPath(pathname) {
  const match = NAV_ITEMS.find((item) => pathForPage(item.key) === pathname);
  return match ? match.key : "home";
}

function App() {
  const [page, setPage] = useState(() => pageForPath(window.location.pathname));

  useEffect(() => {
    function onPopState() {
      setPage(pageForPath(window.location.pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  function navigate(key) {
    const path = pathForPage(key);
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setPage(key);
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row">
      <Sidebar page={page} onNavigate={navigate} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 flex justify-center py-6 px-3 pb-20 md:pb-6">
          <div key={page} className="page-enter w-full flex justify-center">
            {page === "home" && <HomePage />}
            {page === "alarms" && <BistAlarmPanel />}
            {page === "favorites" && <FavoritesPage />}
            {page === "ipos" && <IposPage />}
          </div>
        </main>
      </div>
      <MobileNav page={page} onNavigate={navigate} />
    </div>
  );
}

export default App;
