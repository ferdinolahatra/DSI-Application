
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Filter,
  Globe,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import "./JournalPage.css";

/* =====================================================
   CONFIGURATION
===================================================== */

const API_ENDPOINT = "/activity-logs/";
const PAGE_SIZE = 10;

const ACTION_LABELS = {
  CREATION: "Création",
  MODIFICATION: "Modification",
  SUPPRESSION: "Suppression",
  CONNEXION: "Connexion",
  DECONNEXION: "Déconnexion",
  AFFECTATION: "Affectation",
  CHANGEMENT_STATUT: "Changement de statut",
  COMMENTAIRE: "Ajout de commentaire",
  INTERVENTION: "Intervention",
  CONSULTATION: "Consultation",
  TELECHARGEMENT: "Téléchargement",
  PUBLICATION: "Publication",
  ACTIVATION: "Activation",
  DESACTIVATION: "Désactivation",
};

const ACTION_ICONS = {
  CREATION: CheckCircle2,
  MODIFICATION: FileText,
  SUPPRESSION: XCircle,
  CONNEXION: ShieldCheck,
  DECONNEXION: ShieldCheck,
  AFFECTATION: Users,
  CHANGEMENT_STATUT: Activity,
  COMMENTAIRE: FileText,
  INTERVENTION: Activity,
  CONSULTATION: Eye,
  TELECHARGEMENT: ArrowDownToLine,
  PUBLICATION: FileText,
};

/* =====================================================
   UTILITAIRES
===================================================== */

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

/* =====================================================
   UTILISATEUR CONNECTÉ
===================================================== */

function readUser() {
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

/*
 * IMPORTANT :
 * Cette fonction concerne uniquement le rôle
 * de l'utilisateur actuellement connecté.
 */
function getAccountRole(user) {
  return normalize(
    user?.role ??
    user?.profile?.role ??
    ""
  );
}

function isAdminUser(user) {
  const role = getAccountRole(user);

  return (
    role === "ADMIN" ||
    role === "ADMINISTRATEUR" ||
    user?.is_superuser === true
  );
}

function readList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.logs)) {
    return data.logs;
  }

  if (Array.isArray(data?.journaux)) {
    return data.journaux;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

/* =====================================================
   INFORMATIONS DES UTILISATEURS DU JOURNAL
===================================================== */

function getUserObject(item) {
  return (
    item?.utilisateur_detail ??
    item?.utilisateur ??
    item?.user ??
    item?.acteur ??
    {}
  );
}

function getUserName(item) {
  const user = getUserObject(item);

  if (typeof user === "string") {
    return user;
  }

  return (
    item?.utilisateur_username ||
    item?.utilisateur_nom ||
    item?.username ||
    user?.username ||
    user?.nom_complet ||
    user?.full_name ||
    [
      user?.first_name,
      user?.last_name,
    ].filter(Boolean).join(" ") ||
    "Utilisateur inconnu"
  );
}

/*
 * Cette deuxième fonction concerne le rôle
 * de l'utilisateur affiché dans une ligne du journal.
 *
 * Elle conserve volontairement le nom getUserRole.
 */
function getUserRole(item) {
  const user = getUserObject(item);

  if (typeof user === "string") {
    return item?.role || "Non renseigné";
  }

  return (
    item?.utilisateur_role ||
    user?.role ||
    item?.role ||
    "Non renseigné"
  );
}

function getInitials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/* =====================================================
   INFORMATIONS DE L'OPÉRATION
===================================================== */

function getActionCode(item) {
  return normalize(
    item?.action?.value ??
    item?.action?.code ??
    item?.action ??
    item?.type_action ??
    item?.type ??
    "AUTRE"
  );
}

function getActionLabel(item) {
  return (
    item?.action_display ||
    item?.action_label ||
    item?.get_action_display ||
    ACTION_LABELS[getActionCode(item)] ||
    String(getActionCode(item)).replaceAll("_", " ")
  );
}

function getDescription(item) {
  return (
    item?.description ||
    item?.details ||
    item?.message ||
    item?.commentaire ||
    "Aucune description disponible."
  );
}

function getIPAddress(item) {
  return (
    item?.adresse_ip ||
    item?.ip_address ||
    item?.ip ||
    "Non renseignée"
  );
}

/* =====================================================
   DATE ET HEURE
===================================================== */

function getEventDate(item) {
  return (
    item?.date_creation ||
    item?.date_action ||
    item?.created_at ||
    item?.timestamp ||
    item?.date ||
    null
  );
}

function toDate(value) {
  if (!value) {
    return null;
  }

  let date;

  if (typeof value === "number") {
    date = new Date(
      value < 1000000000000
        ? value * 1000
        : value
    );
  } else {
    date = new Date(value);
  }

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatDate(value) {
  const date = toDate(value);

  if (!date) {
    return "Date non renseignée";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = toDate(value);

  if (!date) {
    return "--:--";
  }

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value) {
  const date = toDate(value);

  if (!date) {
    return "Date non renseignée";
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "medium",
  });
}

function localDateInput(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =====================================================
   STATUT DES OPÉRATIONS
===================================================== */

function getActionClass(action) {
  switch (action) {
    case "CREATION":
    case "PUBLICATION":
    case "ACTIVATION":
      return "journal-action-success";

    case "MODIFICATION":
    case "AFFECTATION":
    case "CHANGEMENT_STATUT":
      return "journal-action-info";

    case "SUPPRESSION":
    case "DESACTIVATION":
      return "journal-action-danger";

    case "CONNEXION":
    case "DECONNEXION":
      return "journal-action-security";

    default:
      return "journal-action-default";
  }
}

function getActionIcon(action) {
  return ACTION_ICONS[action] || Activity;
}

/* =====================================================
   GESTION DES ERREURS API
===================================================== */

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data?.detail) {
    return String(data.detail);
  }

  if (data?.message) {
    return String(data.message);
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Vous n'avez pas l'autorisation de consulter le journal d'activité.";
  }

  if (error?.response?.status === 404) {
    return (
      "L'API du journal d'activité est introuvable. " +
      "Vérifiez le préfixe configuré dans activity_logs/urls.py."
    );
  }

  return "Impossible de charger le journal d'activité. Vérifiez le serveur Django.";
}

/* =====================================================
   EXPORT CSV
===================================================== */

function escapeCSV(value) {
  const text = String(value ?? "").replace(/"/g, '""');

  return `"${text}"`;
}

function exportCSV(logs) {
  const headers = [
    "Identifiant",
    "Utilisateur",
    "Rôle",
    "Action",
    "Description",
    "Adresse IP",
    "Date",
  ];

  const rows = logs.map((item) => [
    item.id,
    getUserName(item),
    getUserRole(item),
    getActionLabel(item),
    getDescription(item),
    getIPAddress(item),
    formatDateTime(getEventDate(item)),
  ]);

  const csv = [
    headers.map(escapeCSV).join(";"),
    ...rows.map((row) =>
      row.map(escapeCSV).join(";")
    ),
  ].join("\r\n");

  const blob = new Blob(
    ["\uFEFF", csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `journal-activite-DSI-${localDateInput()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

/* =====================================================
   COMPOSANT PRINCIPAL
===================================================== */

function JournalPage() {

  /* ===================================================
     UTILISATEUR CONNECTÉ
  =================================================== */

  const user = useMemo(
    () => readUser(),
    []
  );

  const isAdmin = isAdminUser(user);

  const displayName =
    [
      user?.first_name,
      user?.last_name,
    ].filter(Boolean).join(" ") ||
    user?.username ||
    "Administrateur";

  /* ===================================================
     ÉTATS
  =================================================== */

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("TOUS");

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  /* ===================================================
     CHARGEMENT DES DONNÉES
  =================================================== */

  const loadLogs = useCallback(async () => {

    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(API_ENDPOINT);

      const data = readList(response.data);

      setLogs(data);
      setLastUpdated(new Date());

    } catch (err) {
      console.error(
        "Erreur chargement journal d'activité :",
        err
      );

      setError(getErrorMessage(err));

    } finally {
      setLoading(false);
    }

  }, [isAdmin]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /* ===================================================
     TYPES D'ACTIONS DISPONIBLES
  =================================================== */

  const availableActions = useMemo(() => {

    const actions = [
      ...new Set(
        logs.map((item) => getActionCode(item))
      ),
    ];

    return actions.sort();

  }, [logs]);

  /* ===================================================
     FILTRAGE
  =================================================== */

  const filteredLogs = useMemo(() => {

    const query = normalize(search);

    return logs.filter((item) => {

      const matchesSearch =
        !query ||
        normalize([
          item.id,
          getUserName(item),
          getUserRole(item),
          getActionLabel(item),
          getActionCode(item),
          getDescription(item),
          getIPAddress(item),
        ].join(" ")).includes(query);

      const matchesAction =
        actionFilter === "TOUS" ||
        getActionCode(item) === actionFilter;

      const eventDate = toDate(
        getEventDate(item)
      );

      const eventDateString = eventDate
        ? localDateInput(eventDate)
        : "";

      const matchesStart =
        !dateStart ||
        (
          eventDateString &&
          eventDateString >= dateStart
        );

      const matchesEnd =
        !dateEnd ||
        (
          eventDateString &&
          eventDateString <= dateEnd
        );

      return (
        matchesSearch &&
        matchesAction &&
        matchesStart &&
        matchesEnd
      );

    });

  }, [
    logs,
    search,
    actionFilter,
    dateStart,
    dateEnd,
  ]);

  /* ===================================================
     PAGINATION
  =================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / PAGE_SIZE)
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedLogs = useMemo(() => {

    const start =
      (safeCurrentPage - 1) * PAGE_SIZE;

    return filteredLogs.slice(
      start,
      start + PAGE_SIZE
    );

  }, [
    filteredLogs,
    safeCurrentPage,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    actionFilter,
    dateStart,
    dateEnd,
  ]);

  /* ===================================================
     STATISTIQUES
  =================================================== */

  const statistics = useMemo(() => {

    const today = localDateInput();

    const todayLogs = logs.filter((item) => {
      const date = toDate(getEventDate(item));

      return (
        date &&
        localDateInput(date) === today
      );
    });

    const users = new Set(
      logs.map((item) => getUserName(item))
        .filter(
          (name) => name !== "Utilisateur inconnu"
        )
    );

    const actions = new Set(
      logs.map((item) => getActionCode(item))
    );

    return {
      total: logs.length,
      today: todayLogs.length,
      users: users.size,
      actions: actions.size,
    };

  }, [logs]);

  /* ===================================================
     RÉINITIALISER LES FILTRES
  =================================================== */

  const resetFilters = () => {
    setSearch("");
    setActionFilter("TOUS");
    setDateStart("");
    setDateEnd("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(search) ||
    actionFilter !== "TOUS" ||
    Boolean(dateStart) ||
    Boolean(dateEnd);

  /* ===================================================
     ACCÈS REFUSÉ
  =================================================== */

  if (!isAdmin) {
    return (
      <main className="journal-page">

        <div className="journal-access-denied">

          <div className="journal-access-icon">
            <ShieldCheck size={36} />
          </div>

          <h1>Accès réservé</h1>

          <p>
            Le journal d'activité est réservé
            à l'Administrateur DSI.
          </p>

        </div>

      </main>
    );
  }

  /* ===================================================
     AFFICHAGE PRINCIPAL
  =================================================== */

  return (
    <main className="journal-page">

      {/* EN-TÊTE */}

      <header className="journal-header">

        <div className="journal-heading">

          <div className="journal-breadcrumb">
            Administration
            <span>/</span>
            Traçabilité
          </div>

          <div className="journal-eyebrow">
            <ShieldCheck size={16} />
            SÉCURITÉ ET AUDIT
          </div>

          <h1>Journal d'activité</h1>

          <p>
            Consultez et surveillez les opérations effectuées
            sur la plateforme de gestion des services DSI.
          </p>

        </div>

        <div className="journal-header-actions">

          <button
            type="button"
            className="journal-refresh-button"
            onClick={loadLogs}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "journal-spin" : ""}
            />
            Actualiser
          </button>

          <button
            type="button"
            className="journal-export-button"
            onClick={() => exportCSV(filteredLogs)}
            disabled={filteredLogs.length === 0}
          >
            <ArrowDownToLine size={17} />
            Exporter CSV
          </button>

        </div>

      </header>

      {/* BANDEAU DE PRÉSENTATION */}

      <section className="journal-welcome">

        <div className="journal-welcome-content">

          <span>ESPACE D'ADMINISTRATION</span>

          <h2>
            Traçabilité des opérations DSI
          </h2>

          <p>
            Bonjour {displayName}. Consultez les événements,
            identifiez leurs auteurs et contrôlez les actions
            effectuées sur votre plateforme.
          </p>

        </div>

        <div className="journal-welcome-icon">
          <Activity size={42} />
        </div>

      </section>

      {/* STATISTIQUES */}

      <section className="journal-stats-grid">

        <article className="journal-stat-card">

          <div className="journal-stat-top">
            <div className="journal-stat-icon blue">
              <Activity size={21} />
            </div>

            <span>GLOBAL</span>
          </div>

          <strong>
            {statistics.total.toLocaleString("fr-FR")}
          </strong>

          <p>Événements enregistrés</p>

        </article>

        <article className="journal-stat-card">

          <div className="journal-stat-top">
            <div className="journal-stat-icon green">
              <CalendarDays size={21} />
            </div>

            <span>AUJOURD'HUI</span>
          </div>

          <strong>
            {statistics.today.toLocaleString("fr-FR")}
          </strong>

          <p>Activités enregistrées aujourd'hui</p>

        </article>

        <article className="journal-stat-card">

          <div className="journal-stat-top">
            <div className="journal-stat-icon purple">
              <Users size={21} />
            </div>

            <span>UTILISATEURS</span>
          </div>

          <strong>
            {statistics.users.toLocaleString("fr-FR")}
          </strong>

          <p>Auteurs présents dans le journal</p>

        </article>

        <article className="journal-stat-card">

          <div className="journal-stat-top">
            <div className="journal-stat-icon orange">
              <ShieldCheck size={21} />
            </div>

            <span>OPÉRATIONS</span>
          </div>

          <strong>
            {statistics.actions.toLocaleString("fr-FR")}
          </strong>

          <p>Types d'opérations rencontrés</p>

        </article>

      </section>

      {/* ERREUR */}

      {error && (
        <div className="journal-alert" role="alert">

          <AlertCircle size={21} />

          <div>
            <strong>Impossible de charger le journal</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={loadLogs}
          >
            Réessayer
          </button>

        </div>
      )}

      {/* OUTILS DE RECHERCHE */}

      <section className="journal-toolbar">

        <div className="journal-toolbar-heading">

          <div>
            <h2>Historique des opérations</h2>

            <p>
              Consultez les événements enregistrés par le système.
            </p>
          </div>

          <span className="journal-total">
            {filteredLogs.length} résultat(s)
          </span>

        </div>

        <div className="journal-search-row">

          <div className="journal-search-box">

            <Search size={19} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un utilisateur, une action, une IP..."
              aria-label="Rechercher dans le journal"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Effacer la recherche"
              >
                <X size={16} />
              </button>
            )}

          </div>

          <button
            type="button"
            className={`journal-filter-toggle ${
              showFilters ? "active" : ""
            }`}
            onClick={() =>
              setShowFilters((previous) => !previous)
            }
          >
            <SlidersHorizontal size={17} />
            Filtres
            <Filter size={14} />
          </button>

        </div>

        {showFilters && (
          <div className="journal-filters-panel">

            <div className="journal-filter-field">

              <label htmlFor="journal-action">
                Type d'opération
              </label>

              <select
                id="journal-action"
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(event.target.value)
                }
              >
                <option value="TOUS">
                  Toutes les opérations
                </option>

                {availableActions.map((action) => (
                  <option
                    key={action}
                    value={action}
                  >
                    {ACTION_LABELS[action] ||
                      action.replaceAll("_", " ")}
                  </option>
                ))}

              </select>

            </div>

            <div className="journal-filter-field">

              <label htmlFor="journal-start">
                Date de début
              </label>

              <input
                id="journal-start"
                type="date"
                value={dateStart}
                max={dateEnd || undefined}
                onChange={(event) =>
                  setDateStart(event.target.value)
                }
              />

            </div>

            <div className="journal-filter-field">

              <label htmlFor="journal-end">
                Date de fin
              </label>

              <input
                id="journal-end"
                type="date"
                value={dateEnd}
                min={dateStart || undefined}
                onChange={(event) =>
                  setDateEnd(event.target.value)
                }
              />

            </div>

            <button
              type="button"
              className="journal-reset-button"
              onClick={resetFilters}
            >
              <X size={16} />
              Réinitialiser
            </button>

          </div>
        )}

        {hasActiveFilters && (
          <div className="journal-active-filters">

            <span>Filtres actifs :</span>

            {actionFilter !== "TOUS" && (
              <span className="journal-filter-chip">
                {ACTION_LABELS[actionFilter] || actionFilter}
              </span>
            )}

            {dateStart && (
              <span className="journal-filter-chip">
                Depuis le {dateStart}
              </span>
            )}

            {dateEnd && (
              <span className="journal-filter-chip">
                Jusqu'au {dateEnd}
              </span>
            )}

            <button
              type="button"
              onClick={resetFilters}
            >
              Tout effacer
            </button>

          </div>
        )}

      </section>

      {/* TABLEAU DES ACTIVITÉS */}

      <section className="journal-table-card">

        <div className="journal-table-header">

          <div>
            <h3>Journal des événements</h3>

            <p>
              Traçabilité des opérations réalisées sur le système.
            </p>
          </div>

          <div className="journal-update-info">

            <span className="journal-live-dot" />

            <span>
              {lastUpdated
                ? `Actualisé à ${formatTime(lastUpdated)}`
                : "En attente des données"}
            </span>

          </div>

        </div>

        {loading ? (

          <div className="journal-state">

            <RefreshCw className="journal-spin" size={28} />

            <h3>Chargement du journal</h3>

            <p>
              Récupération des événements depuis le serveur...
            </p>

          </div>

        ) : error ? (

          <div className="journal-state">

            <AlertCircle size={30} />

            <h3>Journal indisponible</h3>

            <p>
              Vérifiez la connexion au serveur et la route API.
            </p>

          </div>

        ) : filteredLogs.length === 0 ? (

          <div className="journal-state">

            <div className="journal-empty-icon">
              <History size={32} />
            </div>

            <h3>Aucune activité trouvée</h3>

            <p>
              Aucune opération ne correspond à tes critères
              ou le journal ne contient pas encore d'événement.
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                className="journal-reset-button"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            )}

          </div>

        ) : (

          <>

            <div className="journal-table-wrapper">

              <table className="journal-table">

                <thead>
                  <tr>
                    <th>DATE ET HEURE</th>
                    <th>UTILISATEUR</th>
                    <th>OPÉRATION</th>
                    <th>DESCRIPTION</th>
                    <th>ADRESSE IP</th>
                    <th>DÉTAILS</th>
                  </tr>
                </thead>

                <tbody>

                  {paginatedLogs.map((item, index) => {

                    const action = getActionCode(item);
                    const ActionIcon = getActionIcon(action);
                    const userName = getUserName(item);
                    const ip = getIPAddress(item);

                    return (
                      <tr key={item.id ?? index}>

                        <td>
                          <div className="journal-date-cell">

                            <strong>
                              {formatDate(getEventDate(item))}
                            </strong>

                            <span>
                              <Clock3 size={13} />
                              {formatTime(getEventDate(item))}
                            </span>

                          </div>
                        </td>

                        <td>
                          <div className="journal-user-cell">

                            <div className="journal-avatar">
                              {getInitials(userName)}
                            </div>

                            <div>
                              <strong>{userName}</strong>

                              <span>
                                {getUserRole(item)}
                              </span>
                            </div>

                          </div>
                        </td>

                        <td>
                          <span
                            className={`journal-action-badge ${
                              getActionClass(action)
                            }`}
                          >
                            <ActionIcon size={14} />
                            {getActionLabel(item)}
                          </span>
                        </td>

                        <td>
                          <p className="journal-description-cell">
                            {getDescription(item)}
                          </p>
                        </td>

                        <td>
                          <span className="journal-ip-cell">
                            <Globe size={14} />
                            {ip}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="journal-detail-button"
                            onClick={() => setSelectedLog(item)}
                            aria-label={`Voir les détails de l'activité ${item.id}`}
                          >
                            <Eye size={17} />
                            Détails
                          </button>
                        </td>

                      </tr>
                    );

                  })}

                </tbody>

              </table>

            </div>

            {/* PAGINATION */}

            <div className="journal-pagination">

              <span>
                Affichage de{" "}
                {(safeCurrentPage - 1) * PAGE_SIZE + 1}
                {" à "}
                {Math.min(
                  safeCurrentPage * PAGE_SIZE,
                  filteredLogs.length
                )}
                {" sur "}
                {filteredLogs.length} opérations
              </span>

              <div className="journal-pagination-controls">

                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={18} />
                </button>

                <span>
                  Page {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  aria-label="Page suivante"
                >
                  <ChevronRight size={18} />
                </button>

              </div>

            </div>

          </>

        )}

      </section>

      {/* FENÊTRE DE DÉTAIL */}

      {selectedLog && (

        <div
          className="journal-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedLog(null);
            }
          }}
        >

          <section
            className="journal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-modal-title"
          >

            <div className="journal-modal-header">

              <div>
                <span>CONSULTATION DE L'ÉVÉNEMENT</span>

                <h2 id="journal-modal-title">
                  Détails de l'activité
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>

            </div>

            <div className="journal-modal-body">

              <div className="journal-modal-action">

                {(() => {

                  const action = getActionCode(selectedLog);
                  const Icon = getActionIcon(action);

                  return (
                    <div
                      className={`journal-modal-action-icon ${
                        getActionClass(action)
                      }`}
                    >
                      <Icon size={25} />
                    </div>
                  );

                })()}

                <div>
                  <span>Type d'opération</span>

                  <strong>
                    {getActionLabel(selectedLog)}
                  </strong>
                </div>

              </div>

              <div className="journal-detail-grid">

                <div className="journal-detail-field">
                  <span>Identifiant</span>
                  <strong>
                    #{selectedLog.id ?? "—"}
                  </strong>
                </div>

                <div className="journal-detail-field">
                  <span>Date et heure</span>
                  <strong>
                    {formatDateTime(
                      getEventDate(selectedLog)
                    )}
                  </strong>
                </div>

                <div className="journal-detail-field">
                  <span>Utilisateur</span>
                  <strong>
                    {getUserName(selectedLog)}
                  </strong>
                </div>

                <div className="journal-detail-field">
                  <span>Rôle</span>
                  <strong>
                    {getUserRole(selectedLog)}
                  </strong>
                </div>

                <div className="journal-detail-field">
                  <span>Adresse IP</span>
                  <strong>
                    {getIPAddress(selectedLog)}
                  </strong>
                </div>

              </div>

              <div className="journal-detail-description">

                <span>Description complète</span>

                <p>
                  {getDescription(selectedLog)}
                </p>

              </div>

            </div>

            <div className="journal-modal-footer">

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
              >
                Fermer
              </button>

            </div>

          </section>

        </div>

      )}

    </main>
  );
}

export default JournalPage;
