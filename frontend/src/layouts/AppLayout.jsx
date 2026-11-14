
import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Menu, ShieldCheck } from "lucide-react";

import Sidebar from "./Sidebar";
import "./AppLayout.css";

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Les pages internes nécessitent une session.
  const token = localStorage.getItem("access_token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="app-main">
        <header className="app-mobile-header">
          <button
            type="button"
            className="app-mobile-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>

          <div className="app-mobile-brand">
            <ShieldCheck size={21} />
            <span>PORTAIL DSI</span>
          </div>
        </header>

        <div className="app-page-content">
          <Outlet />
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      )}
    </div>
  );
}

export default AppLayout;
