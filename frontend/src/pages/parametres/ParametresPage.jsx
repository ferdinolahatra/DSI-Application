
import { useEffect, useState } from "react";

import {
  Activity,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  Eye,
  Info,
  LayoutDashboard,
  LockKeyhole,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
  Settings2,
  Type,
  Laptop,
} from "lucide-react";

import "./ParametresPage.css";

const STORAGE_KEY = "dsi-app-settings-v1";

const DEFAULT_SETTINGS = {
  theme: "dark",
  accent: "#3979ed",
  density: "comfortable",
  textSize: "normal",
  reducedMotion: false,
  startPage: "/dashboard",
  browserNotifications: false,
};

const COLORS = [
  { name: "Bleu", value: "#3979ed" },
  { name: "Violet", value: "#8959e8" },
  { name: "Turquoise", value: "#0d9488" },
  { name: "Vert", value: "#16a36a" },
  { name: "Orange", value: "#e58a24" },
  { name: "Rose", value: "#df5b88" },
];

const SECTIONS = [
  {
    id: "general",
    label: "Général",
    description: "Configuration générale de l'application",
    icon: SlidersHorizontal,
  },
  {
    id: "appearance",
    label: "Apparence",
    description: "Personnalisation visuelle",
    icon: Palette,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alertes et notifications du navigateur",
    icon: Bell,
  },
  {
    id: "security",
    label: "Confidentialité et sécurité",
    description: "Informations de sécurité du compte",
    icon: ShieldCheck,
  },
  {
    id: "account",
    label: "Compte",
    description: "Informations sur l'utilisateur connecté",
    icon: UserRound,
  },
  {
    id: "privacy",
    label: "Données et confidentialité",
    description: "Gestion des préférences locales",
    icon: Database,
  },
  {
    id: "about",
    label: "À propos",
    description: "Informations sur la plateforme",
    icon: Info,
  },
];

function readSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function getCurrentUser() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    return (
      stored?.user ??
      stored?.data?.user ??
      stored?.data ??
      stored
    );
  } catch {
    return {};
  }
}

function getUserRole(user) {
  return String(
    user?.role ??
      user?.type_utilisateur ??
      user?.profil ??
      ""
  ).toUpperCase();
}

function getStartPageOptions(role) {
  const common = [
    { value: "/dashboard", label: "Tableau de bord" },
    { value: "/notifications", label: "Notifications" },
    { value: "/documents", label: "Documents" },
    { value: "/annonces", label: "Annonces" },
  ];

  if (role === "ADMIN") {
    return [
      ...common,
      { value: "/tickets", label: "Gestion des tickets" },
      { value: "/interventions", label: "Interventions" },
      { value: "/statistiques", label: "Statistiques" },
      { value: "/journal", label: "Journal d'activité" },
      { value: "/parametres", label: "Paramètres" },
    ];
  }

  if (role === "TECHNICIEN") {
    return [
      ...common,
      { value: "/tickets/assignes", label: "Mes tickets assignés" },
      { value: "/interventions", label: "Interventions" },
    ];
  }

  if (role === "AGENT") {
    return [
      ...common,
      { value: "/tickets/nouveau", label: "Nouvelle demande" },
      { value: "/mes-tickets", label: "Mes tickets" },
    ];
  }

  return common;
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`settings-toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  children,
  className = "",
}) {
  return (
    <div className={`settings-row ${className}`}>
      <div className="settings-row-icon">
        <Icon size={19} />
      </div>

      <div className="settings-row-content">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>

      {children && (
        <div className="settings-row-control">
          {children}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="settings-section-title">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function ParametresPage() {
  const [settings, setSettings] = useState(readSettings);
  const [activeSection, setActiveSection] = useState("general");
  const [notice, setNotice] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState(() =>
      "Notification" in window
        ? Notification.permission
        : "unsupported"
    );

  const [isDark, setIsDark] = useState(() => {
    const initial = readSettings();

    if (initial.theme === "dark") return true;
    if (initial.theme === "light") return false;

    return window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches ?? true;
  });

  const user = getCurrentUser();
  const role = getUserRole(user);

  const displayName =
    user?.nom_complet ??
    user?.full_name ??
    user?.username ??
    user?.nom ??
    user?.email ??
    "Utilisateur connecté";

  const username =
    user?.username ??
    user?.email ??
    "Non renseigné";

  const email = user?.email ?? "Non renseigné";

  const startPageOptions = getStartPageOptions(role);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );

    document.documentElement.style.setProperty(
      "--dsi-accent",
      settings.accent
    );

    document.documentElement.dataset.dsiDensity =
      settings.density;

    document.documentElement.dataset.dsiText =
      settings.textSize;

    document.body.classList.toggle(
      "dsi-reduced-motion",
      settings.reducedMotion
    );
  }, [settings]);

  useEffect(() => {
    const applyTheme = () => {
      const systemDark =
        window.matchMedia?.(
          "(prefers-color-scheme: dark)"
        ).matches ?? true;

      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" && systemDark);

      setIsDark(dark);

      document.body.classList.toggle(
        "dark-mode",
        dark
      );
    };

    applyTheme();

    const media = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    );

    if (settings.theme !== "system" || !media) {
      return undefined;
    }

    media.addEventListener("change", applyTheme);

    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [settings.theme]);

  const updateSettings = (changes) => {
    setSettings((previous) => ({
      ...previous,
      ...changes,
    }));

    setNotice("Préférences enregistrées automatiquement.");
  };

  const enableBrowserNotifications = async (enabled) => {
    if (!enabled) {
      updateSettings({
        browserNotifications: false,
      });

      setNotice(
        "Les notifications de bureau sont désactivées pour cette application."
      );

      return;
    }

    if (!("Notification" in window)) {
      setNotice(
        "Ce navigateur ne prend pas en charge les notifications de bureau."
      );
      return;
    }

    try {
      const permission =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;

      setNotificationPermission(permission);

      if (permission === "granted") {
        updateSettings({
          browserNotifications: true,
        });

        setNotice(
          "Autorisation des notifications accordée."
        );
      } else {
        updateSettings({
          browserNotifications: false,
        });

        setNotice(
          permission === "denied"
            ? "Autorisation refusée. Vérifiez les paramètres du navigateur."
            : "Autorisation des notifications non accordée."
        );
      }
    } catch (error) {
      console.error(
        "Erreur de permission des notifications :",
        error
      );

      setNotice(
        "Impossible de demander l'autorisation des notifications."
      );
    }
  };

  const testBrowserNotification = () => {
    if (!("Notification" in window)) {
      setNotice("Notifications non prises en charge.");
      return;
    }

    if (Notification.permission !== "granted") {
      setNotice(
        "Autorisez d'abord les notifications de bureau."
      );
      return;
    }

    if (!settings.browserNotifications) {
      setNotice(
        "Activez d'abord les notifications dans les réglages."
      );
      return;
    }

    new Notification("Plateforme DSI", {
      body: "Les notifications de bureau fonctionnent correctement.",
      icon: "/favicon.ico",
    });

    setNotice("Notification de test envoyée.");
  };

  const exportSettings = () => {
    const content = {
      application: "DSI Application",
      exported_at: new Date().toISOString(),
      preferences: settings,
    };

    const blob = new Blob(
      [JSON.stringify(content, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "dsi-preferences.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    setNotice("Export des préférences terminé.");
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment réinitialiser toutes les préférences de cette application sur cet appareil ?"
    );

    if (!confirmed) return;

    setSettings({ ...DEFAULT_SETTINGS });
    setNotice("Les préférences ont été réinitialisées.");
  };

  const activeItem = SECTIONS.find(
    (section) => section.id === activeSection
  );

  const ActiveIcon = activeItem?.icon ?? Settings2;

  return (
    <main
      className={[
        "settings-page",
        isDark ? "" : "settings-light",
        settings.density === "compact"
          ? "settings-compact"
          : "",
      ].join(" ")}
    >
      <header className="settings-header">
        <div>
          <div className="settings-eyebrow">
            <Settings2 size={16} />
            CONFIGURATION DE LA PLATEFORME
          </div>

          <h1>Paramètres</h1>

          <p>
            Personnalisez votre environnement de travail et
            gérez les préférences de votre application DSI.
          </p>
        </div>

        <div className="settings-save-status">
          <span className="settings-save-dot" />
          Enregistrement automatique
        </div>
      </header>

      {notice && (
        <div className="settings-notice" role="status">
          <Check size={16} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Fermer le message"
          >
            ×
          </button>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-heading">
            RÉGLAGES
          </div>

          <nav aria-label="Rubriques des paramètres">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const active =
                activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={[
                    "settings-nav-item",
                    active ? "active" : "",
                  ].join(" ")}
                  onClick={() =>
                    setActiveSection(section.id)
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <span className="settings-nav-icon">
                    <Icon size={18} />
                  </span>

                  <span className="settings-nav-label">
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </span>

                  <ChevronRight
                    size={15}
                    className="settings-nav-arrow"
                  />
                </button>
              );
            })}
          </nav>

          <div className="settings-account-mini">
            <div className="settings-avatar">
              <UserRound size={20} />
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>{role || "Utilisateur"}</span>
            </div>
          </div>
        </aside>

        <section className="settings-content">
          <div className="settings-content-heading">
            <div className="settings-content-title-icon">
              <ActiveIcon size={21} />
            </div>

            <div>
              <span>PARAMÈTRES</span>
              <h2>{activeItem?.label}</h2>
              <p>{activeItem?.description}</p>
            </div>
          </div>

          {activeSection === "general" && (
            <>
              <SectionTitle
                eyebrow="PERSONNALISATION"
                title="Préférences générales"
                description="Définissez le comportement de votre espace de travail."
              />

              <div className="settings-group">
                <SettingRow
                  icon={LayoutDashboard}
                  title="Page d'accueil"
                  description="Page affichée lorsque vous ouvrez la racine de l'application."
                >
                  <select
                    className="settings-select"
                    value={
                      startPageOptions.some(
                        (option) =>
                          option.value === settings.startPage
                      )
                        ? settings.startPage
                        : "/dashboard"
                    }
                    onChange={(event) =>
                      updateSettings({
                        startPage: event.target.value,
                      })
                    }
                  >
                    {startPageOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SettingRow>

                <SettingRow
                  icon={Monitor}
                  title="Densité de l'affichage"
                  description="Choisissez l'espacement des éléments de l'interface."
                >
                  <div className="settings-segmented">
                    <button
                      type="button"
                      className={
                        settings.density === "comfortable"
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        updateSettings({
                          density: "comfortable",
                        })
                      }
                    >
                      Confortable
                    </button>

                    <button
                      type="button"
                      className={
                        settings.density === "compact"
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        updateSettings({
                          density: "compact",
                        })
                      }
                    >
                      Compact
                    </button>
                  </div>
                </SettingRow>

                <SettingRow
                  icon={Type}
                  title="Taille du texte"
                  description="Ajustez la taille de base des textes de l'interface."
                >
                  <div className="settings-segmented">
                    <button
                      type="button"
                      className={
                        settings.textSize === "normal"
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        updateSettings({
                          textSize: "normal",
                        })
                      }
                    >
                      Normal
                    </button>

                    <button
                      type="button"
                      className={
                        settings.textSize === "large"
                          ? "selected"
                          : ""
                      }
                      onClick={() =>
                        updateSettings({
                          textSize: "large",
                        })
                      }
                    >
                      Grand
                    </button>
                  </div>
                </SettingRow>
              </div>
            </>
          )}

          {activeSection === "appearance" && (
            <>
              <SectionTitle
                eyebrow="EXPÉRIENCE VISUELLE"
                title="Apparence et affichage"
                description="Adaptez les couleurs et le comportement visuel de la plateforme."
              />

              <div className="settings-group">
                <div className="settings-group-label">
                  THÈME DE L'APPLICATION
                </div>

                <div className="settings-theme-grid">
                  {[
                    {
                      value: "light",
                      label: "Clair",
                      description: "Interface lumineuse",
                      icon: Sun,
                    },
                    {
                      value: "dark",
                      label: "Sombre",
                      description: "Interface bleu nuit",
                      icon: Moon,
                    },
                    {
                      value: "system",
                      label: "Automatique",
                      description: "Selon votre appareil",
                      icon: Laptop,
                    },
                  ].map((theme) => {
                    const Icon = theme.icon;
                    const selected =
                      settings.theme === theme.value;

                    return (
                      <button
                        type="button"
                        key={theme.value}
                        className={[
                          "settings-theme-option",
                          selected ? "selected" : "",
                        ].join(" ")}
                        onClick={() =>
                          updateSettings({
                            theme: theme.value,
                          })
                        }
                        aria-pressed={selected}
                      >
                        <div
                          className={`settings-theme-preview ${theme.value}`}
                        >
                          <div />
                          <div />
                          <div />
                        </div>

                        <div className="settings-theme-option-bottom">
                          <Icon size={17} />
                          <span>
                            <strong>{theme.label}</strong>
                            <small>{theme.description}</small>
                          </span>
                          {selected && (
                            <Check
                              size={17}
                              className="settings-selected-check"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <SettingRow
                  icon={Palette}
                  title="Couleur principale"
                  description="Choisissez la couleur utilisée dans les contrôles de cette interface."
                  className="settings-color-row"
                >
                  <div className="settings-color-options">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={[
                          "settings-color-choice",
                          settings.accent === color.value
                            ? "selected"
                            : "",
                        ].join(" ")}
                        style={{
                          "--choice-color": color.value,
                        }}
                        title={color.name}
                        aria-label={`Couleur ${color.name}`}
                        aria-pressed={
                          settings.accent === color.value
                        }
                        onClick={() =>
                          updateSettings({
                            accent: color.value,
                          })
                        }
                      >
                        {settings.accent === color.value && (
                          <Check size={15} />
                        )}
                      </button>
                    ))}
                  </div>
                </SettingRow>

                <SettingRow
                  icon={Activity}
                  title="Réduire les animations"
                  description="Désactive les animations et transitions décoratives."
                >
                  <Toggle
                    checked={settings.reducedMotion}
                    onChange={(value) =>
                      updateSettings({
                        reducedMotion: value,
                      })
                    }
                    label="Réduire les animations"
                  />
                </SettingRow>
              </div>
            </>
          )}

          {activeSection === "notifications" && (
            <>
              <SectionTitle
                eyebrow="ALERTES"
                title="Préférences de notification"
                description="Gérez l'autorisation des notifications affichées par votre navigateur."
              />

              <div className="settings-group">
                <SettingRow
                  icon={Bell}
                  title="Notifications de bureau"
                  description="Autoriser l'application à afficher des notifications système sur cet appareil."
                >
                  <Toggle
                    checked={settings.browserNotifications}
                    onChange={enableBrowserNotifications}
                    label="Notifications de bureau"
                  />
                </SettingRow>

                <SettingRow
                  icon={ShieldCheck}
                  title="Autorisation du navigateur"
                  description="État actuel de l'autorisation accordée au navigateur."
                >
                  <span
                    className={`settings-state ${
                      notificationPermission === "granted"
                        ? "success"
                        : notificationPermission === "denied"
                          ? "danger"
                          : ""
                    }`}
                  >
                    {notificationPermission === "granted"
                      ? "Autorisée"
                      : notificationPermission === "denied"
                        ? "Refusée"
                        : notificationPermission === "unsupported"
                          ? "Non prise en charge"
                          : "Non définie"}
                  </span>
                </SettingRow>

                <div className="settings-action-row">
                  <div>
                    <strong>Tester les notifications</strong>
                    <p>
                      Afficher une notification de test sur cet appareil.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={testBrowserNotification}
                  >
                    Tester
                  </button>
                </div>
              </div>

              <div className="settings-info-box">
                <Info size={19} />
                <p>
                  Ces réglages concernent les notifications du navigateur.
                  Les alertes métier (tickets, interventions et annonces)
                  restent gérées par le module Notifications et son backend.
                  Leur filtrage selon ces préférences nécessitera une
                  connexion spécifique entre les deux modules.
                </p>
              </div>
            </>
          )}

          {activeSection === "security" && (
            <>
              <SectionTitle
                eyebrow="PROTECTION DU COMPTE"
                title="Confidentialité et sécurité"
                description="Consultez les informations de sécurité de votre session."
              />

              <div className="settings-group">
                <SettingRow
                  icon={LockKeyhole}
                  title="Authentification"
                  description="Votre application utilise une connexion sécurisée par jeton."
                >
                  <span className="settings-state success">
                    Active
                  </span>
                </SettingRow>

                <SettingRow
                  icon={ShieldCheck}
                  title="Session utilisateur"
                  description="Un jeton d'accès est présent dans le navigateur."
                >
                  <span className="settings-state success">
                    {localStorage.getItem("access_token")
                      ? "Connectée"
                      : "Non détectée"}
                  </span>
                </SettingRow>

                <SettingRow
                  icon={Monitor}
                  title="Appareil"
                  description="Cette session utilise le navigateur actuel."
                >
                  <span className="settings-state">
                    Appareil actuel
                  </span>
                </SettingRow>
              </div>

              <div className="settings-info-box">
                <ShieldCheck size={19} />
                <p>
                  La durée de validité du jeton, le renouvellement
                  de session, la modification du mot de passe et les
                  règles d'accès sont gérés côté Django. Cette page
                  ne modifie pas ces règles serveur.
                </p>
              </div>
            </>
          )}

          {activeSection === "account" && (
            <>
              <SectionTitle
                eyebrow="IDENTITÉ"
                title="Compte utilisateur"
                description="Informations du compte actuellement connecté."
              />

              <div className="settings-profile-card">
                <div className="settings-profile-avatar">
                  <UserRound size={30} />
                </div>

                <div>
                  <h3>{displayName}</h3>
                  <span>{role || "Utilisateur"}</span>
                </div>
              </div>

              <div className="settings-group">
                <SettingRow
                  icon={UserRound}
                  title="Nom d'utilisateur"
                  description="Identifiant enregistré dans la session."
                >
                  <strong className="settings-value">
                    {username}
                  </strong>
                </SettingRow>

                <SettingRow
                  icon={Bell}
                  title="Adresse e-mail"
                  description="Adresse associée au compte connecté."
                >
                  <strong className="settings-value">
                    {email}
                  </strong>
                </SettingRow>

                <SettingRow
                  icon={ShieldCheck}
                  title="Rôle"
                  description="Niveau d'accès de ce compte."
                >
                  <span className="settings-state">
                    {role || "Non renseigné"}
                  </span>
                </SettingRow>
              </div>

              <div className="settings-info-box">
                <Info size={19} />
                <p>
                  Les informations ci-dessus sont lues depuis la session
                  actuellement enregistrée. La modification du profil
                  devra être reliée à l'API de gestion des utilisateurs.
                </p>
              </div>
            </>
          )}

          {activeSection === "privacy" && (
            <>
              <SectionTitle
                eyebrow="DONNÉES LOCALES"
                title="Données et confidentialité"
                description="Gérez les préférences enregistrées dans ce navigateur."
              />

              <div className="settings-group">
                <SettingRow
                  icon={Database}
                  title="Stockage des préférences"
                  description="Vos réglages d'affichage sont enregistrés localement dans ce navigateur."
                >
                  <span className="settings-state success">
                    Actif
                  </span>
                </SettingRow>

                <div className="settings-action-row">
                  <div>
                    <strong>Exporter les préférences</strong>
                    <p>
                      Télécharger une copie de vos réglages au format JSON.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="settings-action-button"
                    onClick={exportSettings}
                  >
                    <Download size={15} />
                    Exporter
                  </button>
                </div>

                <div className="settings-action-row settings-danger-row">
                  <div>
                    <strong>Réinitialiser les paramètres</strong>
                    <p>
                      Restaurer les préférences par défaut sur cet appareil.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="settings-action-button danger"
                    onClick={resetSettings}
                  >
                    <RotateCcw size={15} />
                    Réinitialiser
                  </button>
                </div>
              </div>

              <div className="settings-info-box">
                <Info size={19} />
                <p>
                  La réinitialisation concerne uniquement les préférences
                  de cette page. Elle ne supprime ni les tickets, ni les
                  utilisateurs, ni les données PostgreSQL.
                </p>
              </div>
            </>
          )}

          {activeSection === "about" && (
            <>
              <SectionTitle
                eyebrow="INFORMATIONS"
                title="À propos de la plateforme"
                description="Présentation de votre environnement de gestion DSI."
              />

              <div className="settings-about-card">
                <div className="settings-about-logo">
                  <Settings2 size={34} />
                </div>

                <h3>DSI Application</h3>

                <p>
                  Plateforme de gestion des services informatiques,
                  des demandes d'assistance et des interventions.
                </p>

                <span className="settings-about-tag">
                  Plateforme de gestion interne
                </span>
              </div>

              <div className="settings-group">
                <SettingRow
                  icon={Monitor}
                  title="Interface"
                  description="Application web React."
                >
                  <span className="settings-state">
                    React
                  </span>
                </SettingRow>

                <SettingRow
                  icon={Database}
                  title="Serveur métier"
                  description="API de gestion et données de l'application."
                >
                  <span className="settings-state">
                    Django / PostgreSQL
                  </span>
                </SettingRow>

                <SettingRow
                  icon={CircleHelp}
                  title="Assistance"
                  description="Contactez l'administrateur de la plateforme pour toute demande d'aide."
                />
              </div>
            </>
          )}

          <div className="settings-content-footer">
            <span>DSI Application</span>
            <span>Préférences de l'application</span>
          </div>
        </section>
      </div>
    </main>
  );
}
