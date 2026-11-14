
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";

import api from "../../services/api";
import "./Dashboard.css";

// ============================================================
// 1. CONFIGURATION DES DONNÉES
// ============================================================

const ARRAY_KEYS = {
  priorities: [
    "tickets_par_priorite",
    "tickets_par_priorité",
    "par_priorite",
    "priorites",
  ],
  categories: [
    "tickets_par_categorie",
    "tickets_par_category",
    "par_categorie",
    "categories",
  ],
  services: [
    "tickets_par_service",
    "par_service",
    "services",
  ],
  technicians: [
    "tickets_par_technicien",
    "par_technicien",
    "techniciens",
  ],
};

// ============================================================
// 2. FONCTIONS UTILITAIRES
// ============================================================

function getArray(data, keys) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
}

function formatNumber(value) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString("fr-FR", {
        maximumFractionDigits: 1,
      })
    : "0";
}

function formatDuration(value) {
  return `${formatNumber(value)} min`;
}

function getLabel(item, index) {
  if (typeof item === "string") {
    return item;
  }

  const label =
    item?.label ??
    item?.mois ??
    item?.month ??
    item?.categorie ??
    item?.category ??
    item?.priorite ??
    item?.priorité ??
    item?.statut ??
    item?.service ??
    item?.technicien ??
    item?.username ??
    item?.name ??
    item?.nom;

  if (label === undefined || label === null || label === "") {
    return `Élément ${index + 1}`;
  }

  return String(label);
}

function getValue(item) {
  if (typeof item === "number") {
    return item;
  }

  return Number(
    item?.total ??
      item?.nombre ??
      item?.count ??
      item?.nombre_tickets ??
      item?.total_tickets ??
      item?.nombre_interventions ??
      item?.valeur ??
      item?.value ??
      0
  );
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

// Normalise les accents, les espaces et les majuscules.
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ============================================================
// 3. LECTURE DES INTERVENTIONS
// ============================================================

function readInterventions(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.interventions)) {
    return data.interventions;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

// ============================================================
// 4. NORMALISATION DES RÉSULTATS
// ============================================================

function normalizeInterventionResult(value) {
  return String(value ?? "AUTRE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function getInterventionResult(intervention) {
  return normalizeInterventionResult(
    intervention.resultat ??
      intervention.resultat_intervention ??
      intervention.result ??
      "AUTRE"
  );
}

// ============================================================
// 5. IDENTIFICATION DU TECHNICIEN
// ============================================================

function getInterventionTechnician(intervention) {
  const person =
    intervention.technicien ??
    intervention.technicien_assigne ??
    intervention.intervenant ??
    intervention.assigne_a ??
    intervention.created_by;

  if (person === null || person === undefined) {
    return "Non attribué";
  }

  if (typeof person === "object") {
    const fullName = [
      person.first_name ?? person.prenom,
      person.last_name ?? person.nom,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      person.full_name ??
      person.nom_complet ??
      (fullName || null) ??
      person.username ??
      person.identifiant ??
      "Non attribué"
    );
  }

  if (typeof person === "number") {
    return `Technicien #${person}`;
  }

  return String(person);
}

// ============================================================
// 6. CATÉGORIES DE RÉSULTATS
// ============================================================

const SUCCESS_RESULTS = [
  "RESOLU",
  "RESOLUE",
  "TERMINE",
  "TERMINEE",
  "SUCCES",
  "REUSSI",
];

const PARTIAL_RESULTS = [
  "PARTIEL",
  "PARTIELLE",
];

const FAILED_RESULTS = [
  "ECHEC",
  "NON_RESOLU",
];

// ============================================================
// 7. COMPOSANT PRINCIPAL
// ============================================================

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [interventions, setInterventions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [interventionsLoading, setInterventionsLoading] =
    useState(true);

  const [error, setError] = useState("");

  // ==========================================================
  // 8. UTILISATEUR CONNECTÉ ET DROITS D'AFFICHAGE
  // ==========================================================

  const user = getStoredUser();

  const fonctionUtilisateur = normalizeText(user.fonction);

  const isAdmin =
    user.is_superuser === true ||
    String(user.role ?? "").toUpperCase() === "ADMIN";

  const isTechnician =
    fonctionUtilisateur === "technicien dsi";

  // Seuls l'administrateur et le technicien DSI
  // voient le tableau de bord complet.
  const isFullDashboard = isAdmin || isTechnician;

  const displayName =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ") ||
    user.username ||
    user.identifiant ||
    "Utilisateur";

  // ==========================================================
  // 9. CHARGEMENT DES STATISTIQUES
  // ==========================================================

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/");

      const result = response.data?.data ?? response.data;

      if (!result || typeof result !== "object") {
        throw new Error("Réponse invalide du serveur.");
      }

      setStats(result);
    } catch (err) {
      console.error("Erreur dashboard :", err);

      if (err.response?.status === 401) {
        setError(
          "Session expirée ou absente. Reconnecte-toi puis réessaie."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Tu n'as pas la permission de consulter ces statistiques."
        );
      } else {
        setError(
          "Impossible de charger les statistiques. Vérifie Django et l'API /api/dashboard/."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // 10. CHARGEMENT DES INTERVENTIONS
  // ==========================================================

  const loadInterventions = useCallback(async () => {
    setInterventionsLoading(true);

    try {
      const response = await api.get("/interventions/");

      const data = readInterventions(response.data);

      setInterventions(data);
    } catch (err) {
      console.error(
        "Erreur chargement des interventions :",
        err.response?.data || err.message
      );

      setInterventions([]);
    } finally {
      setInterventionsLoading(false);
    }
  }, []);

  // ==========================================================
  // 11. CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    loadDashboard();

    if (isFullDashboard) {
      loadInterventions();
    } else {
      setInterventionsLoading(false);
      setInterventions([]);
    }
  }, [
    loadDashboard,
    loadInterventions,
    isFullDashboard,
  ]);

  // ==========================================================
  // 12. CARTES DU DASHBOARD COMPLET
  // ==========================================================

  const cards = [
    {
      key: "total_tickets",
      label: "Total des tickets",
      value: stats?.total_tickets,
      icon: BarChart3,
      color: "blue",
      description: "Demandes enregistrées",
    },
    {
      key: "urgents",
      label: "Tickets très urgents",
      value: stats?.urgents,
      icon: AlertTriangle,
      color: "red",
      description: "À traiter en priorité",
    },
    {
      key: "en_cours",
      label: "Tickets en cours",
      value: stats?.en_cours,
      icon: Activity,
      color: "purple",
      description: "Demandes en traitement",
    },
    {
      key: "resolus",
      label: "Tickets résolus",
      value: stats?.resolus,
      icon: CheckCircle2,
      color: "green",
      description: "Demandes résolues",
    },
    {
      key: "total_interventions",
      label: "Interventions",
      value: stats?.total_interventions,
      icon: Wrench,
      color: "cyan",
      description: "Interventions enregistrées",
    },
    {
      key: "duree_moyenne_intervention",
      label: "Durée moyenne",
      value: stats?.duree_moyenne_intervention,
      icon: Clock3,
      color: "purple",
      description: "Durée moyenne par intervention",
      duration: true,
    },
  ];

  // ==========================================================
  // 13. CARTES DES UTILISATEURS ORDINAIRES
  // ==========================================================

  const serviceCards = [
    {
      key: "total_tickets",
      label: "Total des tickets",
      value: stats?.total_tickets,
      icon: BarChart3,
      color: "blue",
      description: "Tickets de votre service",
    },
    {
      key: "en_cours",
      label: "Tickets en cours",
      value: stats?.en_cours,
      icon: Activity,
      color: "purple",
      description: "Demandes en traitement",
    },
    {
      key: "resolus",
      label: "Tickets résolus",
      value: stats?.resolus,
      icon: CheckCircle2,
      color: "green",
      description: "Demandes résolues",
    },
  ];

  // ==========================================================
  // 14. DONNÉES DES PANNEAUX DU DASHBOARD COMPLET
  // ==========================================================

  const priorities = getArray(
    stats,
    ARRAY_KEYS.priorities
  )
    .slice()
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, 5);

  const categories = getArray(
    stats,
    ARRAY_KEYS.categories
  );

  const services = getArray(
    stats,
    ARRAY_KEYS.services
  );

  const technicians = getArray(
    stats,
    ARRAY_KEYS.technicians
  );

  const maxPriority = Math.max(
    1,
    ...priorities.map((item) => getValue(item))
  );

  // ==========================================================
  // 15. BILAN DES INTERVENTIONS
  // ==========================================================

  const interventionResults = [
    {
      key: "successful",
      label: "Résolues",
      count: interventions.filter((item) =>
        SUCCESS_RESULTS.includes(getInterventionResult(item))
      ).length,
    },
    {
      key: "partial",
      label: "Partielles",
      count: interventions.filter((item) =>
        PARTIAL_RESULTS.includes(getInterventionResult(item))
      ).length,
    },
    {
      key: "failed",
      label: "Échecs",
      count: interventions.filter((item) =>
        FAILED_RESULTS.includes(getInterventionResult(item))
      ).length,
    },
  ];

  const classifiedInterventions = interventionResults.reduce(
    (total, item) => total + item.count,
    0
  );

  const otherResults = Math.max(
    0,
    interventions.length - classifiedInterventions
  );

  interventionResults.push({
    key: "other",
    label: "Autres résultats",
    count: otherResults,
  });

  // ==========================================================
  // 16. INTERVENTIONS PAR TECHNICIEN
  // ==========================================================

  const interventionsByTechnician = Object.entries(
    interventions.reduce((groups, item) => {
      const name = getInterventionTechnician(item);

      groups[name] = (groups[name] || 0) + 1;

      return groups;
    }, {})
  )
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // ==========================================================
  // 17. AFFICHAGE SIMPLIFIÉ PAR SERVICE
  // ==========================================================

  if (!isFullDashboard) {
    const serviceName =
      stats?.service || user.service || "Service non renseigné";

    return (
      <main className="dashboard-page service-dashboard">

        <header className="dashboard-header">
          <div className="dashboard-heading">
            <div className="dashboard-eyebrow">
              <LayoutDashboard size={16} />
              ESPACE DE PILOTAGE
            </div>

            <h1>Tableau de bord</h1>

            <p>
              Bonjour {displayName}, voici la situation des tickets
              de votre service.
            </p>
          </div>

          <button
            className="dashboard-refresh"
            onClick={loadDashboard}
            disabled={loading}
            type="button"
          >
            <RefreshCw
              size={17}
              className={loading ? "refresh-spinning" : ""}
            />
            Actualiser
          </button>
        </header>

        {error && (
          <div className="dashboard-alert" role="alert">
            <XCircle size={20} />
            <span>{error}</span>

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
            >
              Réessayer
            </button>
          </div>
        )}

        <section className="dashboard-welcome">
          <div>
            <span className="welcome-label">
              VOTRE ESPACE
            </span>

            <h2>Suivi des tickets de votre service</h2>

            <p>
              Consultez les demandes enregistrées pour votre service.
            </p>

            <p className="service-dashboard-name">
              Service : <strong>{serviceName}</strong>
            </p>
          </div>

          <div className="welcome-icon">
            <LayoutDashboard size={38} />
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Indicateurs de votre service</h2>
              <p>
                Statistiques limitées aux tickets de votre service
              </p>
            </div>

            <span className="dashboard-live">
              <span />
              Données API
            </span>
          </div>

          <div className="dashboard-stats-grid service-stats-grid">
            {serviceCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  className="dashboard-stat-card"
                  key={card.key}
                >
                  <div className="stat-card-top">
                    <div className={`stat-icon ${card.color}`}>
                      <Icon size={21} />
                    </div>

                    <ArrowUpRight
                      size={17}
                      className="stat-arrow"
                    />
                  </div>

                  <p className="stat-label">
                    {card.label}
                  </p>

                  <div className="stat-value">
                    {loading && !stats
                      ? "—"
                      : formatNumber(card.value)}
                  </div>

                  <p className="stat-description">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="dashboard-footer">
          <span>
            DSI — Gestion des tickets et interventions
          </span>

          <span>
            Tableau de bord de votre service
          </span>
        </footer>
      </main>
    );
  }

  // ==========================================================
  // 18. AFFICHAGE DU DASHBOARD COMPLET
  // Administrateur et Technicien DSI
  // ==========================================================

  return (
    <main className="dashboard-page">

      {/* HEADER */}

      <header className="dashboard-header">
        <div className="dashboard-heading">
          <div className="dashboard-eyebrow">
            <LayoutDashboard size={16} />
            ESPACE DE PILOTAGE
          </div>

          <h1>Tableau de bord</h1>

          <p>
            Bonjour {displayName}, voici la situation actuelle
            du système de gestion des tickets DSI.
          </p>
        </div>

        <button
          className="dashboard-refresh"
          onClick={() => {
            loadDashboard();
            loadInterventions();
          }}
          disabled={loading || interventionsLoading}
          type="button"
        >
          <RefreshCw
            size={17}
            className={
              loading || interventionsLoading
                ? "refresh-spinning"
                : ""
            }
          />
          Actualiser
        </button>
      </header>

      {/* MESSAGE D'ERREUR */}

      {error && (
        <div className="dashboard-alert" role="alert">
          <XCircle size={20} />
          <span>{error}</span>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ACCUEIL */}

      <section className="dashboard-welcome">
        <div>
          <span className="welcome-label">
            VUE D'ENSEMBLE
          </span>

          <h2>Suivi de l'activité DSI</h2>

          <p>
            Consulte les demandes, les priorités et les
            interventions depuis un seul espace.
          </p>
        </div>

        <div className="welcome-icon">
          <BarChart3 size={38} />
        </div>
      </section>

      {/* INDICATEURS PRINCIPAUX */}

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>Indicateurs principaux</h2>
            <p>Les chiffres fournis par le serveur Django</p>
          </div>

          <span className="dashboard-live">
            <span />
            Données API
          </span>
        </div>

        <div className="dashboard-stats-grid">
          {cards.map((card) => {
            const Icon = card.icon;

            const value = card.duration
              ? formatDuration(card.value)
              : formatNumber(card.value);

            return (
              <article
                className="dashboard-stat-card"
                key={card.key}
              >
                <div className="stat-card-top">
                  <div className={`stat-icon ${card.color}`}>
                    <Icon size={21} />
                  </div>

                  <ArrowUpRight
                    size={17}
                    className="stat-arrow"
                  />
                </div>

                <p className="stat-label">
                  {card.label}
                </p>

                <div className="stat-value">
                  {loading && !stats ? "—" : value}
                </div>

                <p className="stat-description">
                  {card.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* PANNEAUX PRINCIPAUX */}

      <section className="dashboard-panels">

        {/* BILAN DES INTERVENTIONS */}

        <article className="dashboard-panel evolution-panel">
          <div className="panel-heading">
            <div className="panel-title-icon green">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h2>Bilan des interventions</h2>
              <p>
                Résultats des opérations effectuées par la DSI
              </p>
            </div>
          </div>

          {interventionsLoading ? (
            <div className="dashboard-empty">
              <RefreshCw
                size={24}
                className="refresh-spinning"
              />
              <p>
                Chargement du bilan des interventions...
              </p>
            </div>
          ) : interventions.length > 0 ? (
            <div className="priority-list">
              {interventionResults.map((item, index) => {
                const percentage =
                  (item.count / interventions.length) * 100;

                return (
                  <div
                    className="priority-item"
                    key={item.key}
                  >
                    <div className="priority-info">
                      <span>{item.label}</span>

                      <strong>
                        {formatNumber(item.count)}
                      </strong>
                    </div>

                    <div className="priority-track">
                      <div
                        className={`priority-fill priority-${index % 4}`}
                        style={{
                          width: `${percentage}%`,
                        }}
                        title={`${item.label} : ${formatNumber(item.count)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-empty">
              <Wrench size={28} />
              <p>
                Aucune intervention enregistrée pour le moment.
              </p>
            </div>
          )}

          <div className="priority-footer">
            <Wrench size={16} />

            <span>
              Total des interventions :{" "}
              <strong>
                {interventionsLoading
                  ? "—"
                  : formatNumber(interventions.length)}
              </strong>
            </span>
          </div>
        </article>

        {/* TOP 5 DES PRIORITÉS */}

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div className="panel-title-icon orange">
              <AlertTriangle size={19} />
            </div>

            <div>
              <h2>Top 5 des priorités</h2>
              <p>
                Les cinq priorités avec le plus de tickets
              </p>
            </div>
          </div>

          {priorities.length > 0 ? (
            <div className="priority-list">
              {priorities.map((item, index) => {
                const value = getValue(item);

                const percentage = Math.min(
                  100,
                  (value / maxPriority) * 100
                );

                const priorityLabel = getLabel(item, index);

                return (
                  <div
                    className="priority-item"
                    key={`${priorityLabel}-${index}`}
                  >
                    <div className="priority-info">
                      <span>
                        {priorityLabel.trim().toUpperCase() === "URGENT"
                          ? "TRÈS URGENT"
                          : priorityLabel}
                      </span>

                      <strong>
                        {formatNumber(value)}
                      </strong>
                    </div>

                    <div className="priority-track">
                      <div
                        className={`priority-fill priority-${index % 4}`}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <p>
                {loading
                  ? "Chargement..."
                  : "Aucune donnée de priorité disponible."}
              </p>
            </div>
          )}

          <div className="priority-footer">
            <AlertTriangle size={16} />

            <span>
              Tickets très urgents :{" "}
              <strong>
                {formatNumber(stats?.urgents)}
              </strong>
            </span>
          </div>
        </article>
      </section>

      {/* PANNEAUX SECONDAIRES */}

      <section className="dashboard-panels secondary-panels">

        {/* INTERVENTIONS PAR TECHNICIEN */}

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div className="panel-title-icon purple">
              <Users size={19} />
            </div>

            <div>
              <h2>Interventions par technicien</h2>
              <p>
                Classement selon les interventions effectuées
              </p>
            </div>
          </div>

          {interventionsLoading ? (
            <div className="dashboard-empty compact">
              <p>Chargement des techniciens...</p>
            </div>
          ) : interventionsByTechnician.length > 0 ? (
            <div className="simple-data-list">
              {interventionsByTechnician.map((item) => (
                <div
                  className="simple-data-row"
                  key={item.name}
                >
                  <span>{item.name}</span>

                  <strong>
                    {formatNumber(item.count)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <p>
                Aucune intervention attribuée à un technicien.
              </p>
            </div>
          )}
        </article>

        {/* TICKETS PAR CATÉGORIE */}

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div className="panel-title-icon cyan">
              <FileText size={19} />
            </div>

            <div>
              <h2>Tickets par catégorie</h2>
              <p>
                Répartition des demandes enregistrées
              </p>
            </div>
          </div>

          {categories.length > 0 ? (
            <div className="simple-data-list">
              {categories.map((item, index) => (
                <div
                  className="simple-data-row"
                  key={`${getLabel(item, index)}-${index}`}
                >
                  <span>
                    {getLabel(item, index)}
                  </span>

                  <strong>
                    {formatNumber(getValue(item))}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <p>
                {loading
                  ? "Chargement..."
                  : "Aucune catégorie disponible."}
              </p>
            </div>
          )}
        </article>

        {/* ACTIVITÉ DES SERVICES */}

        <article className="dashboard-panel">
          <div className="panel-heading">
            <div className="panel-title-icon purple">
              <Users size={19} />
            </div>

            <div>
              <h2>Activité des services</h2>
              <p>
                Tickets regroupés par service
              </p>
            </div>
          </div>

          {services.length > 0 ? (
            <div className="simple-data-list">
              {services.map((item, index) => (
                <div
                  className="simple-data-row"
                  key={`${getLabel(item, index)}-${index}`}
                >
                  <span>
                    {getLabel(item, index)}
                  </span>

                  <strong>
                    {formatNumber(getValue(item))}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <p>
                {loading
                  ? "Chargement..."
                  : "Aucune donnée de service disponible."}
              </p>
            </div>
          )}
        </article>
      </section>

      {/* ACTIVITÉ DES TECHNICIENS */}

      <section className="dashboard-panel technicians-panel">
        <div className="panel-heading">
          <div className="panel-title-icon blue">
            <Wrench size={19} />
          </div>

          <div>
            <h2>Activité des techniciens</h2>
            <p>
              Tickets regroupés par technicien
            </p>
          </div>
        </div>

        {technicians.length > 0 ? (
          <div className="technicians-table-wrap">
            <table className="technicians-table">
              <thead>
                <tr>
                  <th>Technicien</th>
                  <th>Nombre de tickets</th>
                </tr>
              </thead>

              <tbody>
                {technicians.map((item, index) => (
                  <tr
                    key={`${getLabel(item, index)}-${index}`}
                  >
                    <td>
                      {getLabel(item, index)}
                    </td>

                    <td>
                      {formatNumber(getValue(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty compact">
            <p>
              {loading
                ? "Chargement..."
                : "Aucune donnée technicien disponible."}
            </p>
          </div>
        )}
      </section>

      {/* FOOTER */}

      <footer className="dashboard-footer">
        <span>
          DSI — Gestion des tickets et interventions
        </span>

        <span>
          Tableau de bord connecté à Django REST API
        </span>
      </footer>
    </main>
  );
}

export default Dashboard;
