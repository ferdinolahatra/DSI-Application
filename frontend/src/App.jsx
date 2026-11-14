
import { useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// AUTHENTIFICATION
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// TABLEAU DE BORD
import Dashboard from "./pages/dashboard/Dashboard";

// UTILISATEURS
import UserManagement from "./pages/users/UserManagement";

// TICKETS
import TicketsPage from "./pages/tickets/TicketsPage";
import TicketWorkspace from "./pages/tickets/TicketWorkspace";
import TicketDetails from "./pages/tickets/TicketDetails";

// INTERVENTIONS
import InterventionsPage from "./pages/interventions/InterventionsPage";

// NOTIFICATIONS
import NotificationsPage from "./pages/notifications/NotificationsPage";

// DOCUMENTS
import DocumentsPage from "./pages/documents/DocumentsPage";

// ANNONCES
import AnnoncesPage from "./pages/annonces/AnnoncesPage";

// STATISTIQUES
import StatistiquesPage from "./pages/statistiques/StatistiquesPage";

// JOURNAL
import JournalPage from "./pages/journal/JournalPage";

// PARAMÈTRES
import ParametresPage from "./pages/parametres/ParametresPage";

// LAYOUT PRINCIPAL
import AppLayout from "./layouts/AppLayout";

// =====================================================
// 1. PROTECTION DES PAGES INTERNES
// Tous les utilisateurs connectés peuvent accéder
// aux pages. Les permissions métier sont vérifiées
// dans les pages et dans Django.
// =====================================================

function RequireAuth({ children }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// =====================================================
// 2. PRÉFÉRENCES GLOBALES
// =====================================================

function useGlobalPreferences() {
  useEffect(() => {
    const SETTINGS_KEY = "dsi-app-settings-v1";

    const root = document.documentElement;
    const body = document.body;

    const media = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

    const applyPreferences = () => {
      try {
        const settings = JSON.parse(
          localStorage.getItem(SETTINGS_KEY) || "{}"
        );

        // COULEUR PRINCIPALE
        const accent = settings.accent || "#3979ed";

        root.style.setProperty("--dsi-accent", accent);

        // THÈME SOMBRE / CLAIR / AUTOMATIQUE
        const selectedTheme = settings.theme || "dark";

        const dark =
          selectedTheme === "dark" ||
          (
            selectedTheme === "system" &&
            Boolean(media?.matches)
          );

        body.classList.toggle("dark-mode", dark);

        root.dataset.dsiTheme = dark ? "dark" : "light";

        // DENSITÉ
        root.dataset.dsiDensity =
          settings.density || "comfortable";

        // TAILLE DU TEXTE
        root.dataset.dsiText =
          settings.textSize || "normal";

        // ANIMATIONS
        body.classList.toggle(
          "dsi-reduced-motion",
          Boolean(settings.reducedMotion)
        );
      } catch (error) {
        console.error(
          "Erreur lors du chargement des préférences DSI :",
          error
        );
      }
    };

    // PREMIER CHARGEMENT
    applyPreferences();

    // OBSERVER LES CHANGEMENTS DU THÈME
    const observer = new MutationObserver(() => {
      const dark = body.classList.contains("dark-mode");

      root.dataset.dsiTheme = dark ? "dark" : "light";
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // CHANGEMENT DU THÈME SYSTÈME
    const handleSystemThemeChange = () => {
      let settings = {};

      try {
        settings = JSON.parse(
          localStorage.getItem(SETTINGS_KEY) || "{}"
        );
      } catch {
        settings = {};
      }

      if (settings.theme === "system") {
        applyPreferences();
      }
    };

    media?.addEventListener(
      "change",
      handleSystemThemeChange
    );

    // SYNCHRONISATION ENTRE ONGLETS
    const handleStorageChange = (event) => {
      if (
        event.key === SETTINGS_KEY ||
        event.key === null
      ) {
        applyPreferences();
      }
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    // NETTOYAGE
    return () => {
      observer.disconnect();

      media?.removeEventListener(
        "change",
        handleSystemThemeChange
      );

      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);
}

// =====================================================
// 3. APPLICATION PRINCIPALE
// =====================================================

function App() {
  useGlobalPreferences();

  return (
    <BrowserRouter>
      <Routes>

        {/* PAGES PUBLIQUES */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* TOUTES LES PAGES INTERNES */}

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >

          {/* TABLEAU DE BORD */}

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* UTILISATEURS */}

          <Route
            path="/users"
            element={<UserManagement />}
          />

          {/* GESTION DES TICKETS */}

          <Route
            path="/tickets"
            element={<TicketsPage />}
          />

          {/* DÉTAIL D'UN TICKET */}

          <Route
            path="/tickets/:id"
            element={<TicketDetails />}
          />

          {/* TICKETS ASSIGNÉS */}

          <Route
            path="/tickets/assignes"
            element={
              <TicketWorkspace mode="assigned" />
            }
          />

          {/* CRÉATION D'UNE DEMANDE */}

          <Route
            path="/tickets/nouveau"
            element={
              <TicketWorkspace mode="create" />
            }
          />

          {/* MES TICKETS */}

          <Route
            path="/mes-tickets"
            element={
              <TicketWorkspace mode="mine" />
            }
          />

          {/* INTERVENTIONS */}

          <Route
            path="/interventions"
            element={<InterventionsPage />}
          />

          {/* NOTIFICATIONS */}

          <Route
            path="/notifications"
            element={<NotificationsPage />}
          />

          {/* DOCUMENTS */}

          <Route
            path="/documents"
            element={<DocumentsPage />}
          />

          {/* ANNONCES */}

          <Route
            path="/annonces"
            element={<AnnoncesPage />}
          />

          {/* STATISTIQUES */}

          <Route
            path="/statistiques"
            element={<StatistiquesPage />}
          />

          {/* JOURNAL D'ACTIVITÉ */}

          <Route
            path="/journal"
            element={<JournalPage />}
          />

          {/* PARAMÈTRES */}

          <Route
            path="/parametres"
            element={<ParametresPage />}
          />

        </Route>

        {/* PAGE D'ACCUEIL */}

        <Route
          path="/"
          element={
            <Navigate
              to={
                localStorage.getItem("access_token")
                  ? "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />

        {/* PAGE INCONNUE */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
