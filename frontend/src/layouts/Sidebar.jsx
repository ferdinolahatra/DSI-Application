
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  BarChart3,
  Ticket,
  Wrench,
  Bell,
  Users,
  FileText,
  Megaphone,
  History,
  Settings,
  BookOpen,
  LogOut,
  X,
  ShieldCheck,
} from "lucide-react";

import "./AppLayout.css";

const MENUS = [
  {
    group: "PILOTAGE",
    items: [
      {
        label: "Tableau de bord",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Statistiques",
        path: "/statistiques",
        icon: BarChart3,
      },
    ],
  },
  {
    group: "GESTION DU SUPPORT",
    items: [
      {
        label: "Gestion des tickets",
        path: "/tickets",
        icon: Ticket,
      },
      {
        label: "Interventions",
        path: "/interventions",
        icon: Wrench,
      },
      {
        label: "Notifications",
        path: "/notifications",
        icon: Bell,
      },
    ],
  },
  {
    group: "RESSOURCES",
    items: [
      {
        label: "Utilisateurs",
        path: "/users",
        icon: Users,
      },
      {
        label: "Documents",
        path: "/documents",
        icon: FileText,
      },
      {
        label: "Documentation technique",
        path: "/documents",
        icon: BookOpen,
      },
      {
        label: "Annonces",
        path: "/annonces",
        icon: Megaphone,
      },
    ],
  },
  {
    group: "ADMINISTRATION",
    items: [
      {
        label: "Journal d'activité",
        path: "/journal",
        icon: History,
      },
      {
        label: "Paramètres",
        path: "/parametres",
        icon: Settings,
      },
    ],
  },
];

function readUser() {
  try {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      return {};
    }

    const user = JSON.parse(savedUser);

    return user && typeof user === "object" ? user : {};
  } catch (error) {
    console.error(
      "Erreur de lecture de l'utilisateur connecté :",
      error
    );

    return {};
  }
}

function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const user = readUser();

  const fullName =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.username ||
    user.identifiant ||
    "Utilisateur";

  const fonction =
    typeof user.fonction === "string" && user.fonction.trim()
      ? user.fonction.trim()
      : "Fonction non renseignée";

  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U";

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("connected");

    onClose();

    navigate("/login", { replace: true });
  }

  return (
    <aside
      className={`app-sidebar ${mobileOpen ? "is-open" : ""}`}
      aria-label="Navigation principale"
    >
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <ShieldCheck size={25} />
        </div>

        <div className="sidebar-brand-text">
          <strong>PORTAIL DSI</strong>
          <span>Gestion des services informatiques</span>
        </div>

        <button
          className="sidebar-mobile-close"
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
        >
          <X size={21} />
        </button>
      </div>

      <div className="sidebar-organization">
        <div className="sidebar-organization-icon">
          <ShieldCheck size={18} />
        </div>

        <div>
          <strong>
            Direction des Systèmes d’Information
          </strong>

          <span>
            Ministère chargé de la Refondation
          </span>
        </div>
      </div>

      <nav className="sidebar-navigation">
        {MENUS.map((group) => (
          <div
            className="sidebar-menu-group"
            key={group.group}
          >
            <p className="sidebar-group-title">
              {group.group}
            </p>

            <div className="sidebar-links">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={`${item.path}-${item.label}`}
                    to={item.path}
                    end={
                      item.path === "/dashboard" ||
                      item.path === "/tickets"
                    }
                    onClick={onClose}
                    className={({ isActive }) =>
                      `sidebar-link ${
                        isActive ? "active" : ""
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-account">
          <div className="sidebar-avatar">
            {initials}
          </div>

          <div className="sidebar-account-info">
            <strong title={fullName}>
              {fullName}
            </strong>

            <span title={fonction}>
              {fonction}
            </span>
          </div>
        </div>

        <button
          className="sidebar-logout"
          onClick={handleLogout}
          type="button"
        >
          <LogOut size={17} />
          <span>Déconnexion</span>
        </button>

        <div className="sidebar-version">
          PORTAIL DSI · Interface interne
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
