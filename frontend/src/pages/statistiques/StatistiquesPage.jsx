
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleX,
  Clock,
  RefreshCw,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../../services/api";
import "./StatistiquesPage.css";

/* =====================================================
   COULEURS ET LIBELLÉS
===================================================== */

const COLORS = [
  "#3979ed",
  "#8b5cf6",
  "#16a6a1",
  "#f59e0b",
  "#e65b79",
  "#64748b",
];

const STATUS_COLORS = {
  NOUVELLE: "#3979ed",
  NOUVEAU: "#3979ed",
  EN_ATTENTE: "#f59e0b",
  EN_COURS: "#8b5cf6",
  RESOLUE: "#16a6a1",
  RESOLU: "#16a6a1",
  CLOTUREE: "#64748b",
  CLOTURE: "#64748b",
};

const LABELS = {
  NOUVELLE: "Nouvelle",
  NOUVEAU: "Nouveau",
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  RESOLUE: "Résolue",
  RESOLU: "Résolu",
  CLOTUREE: "Clôturée",
  CLOTURE: "Clôturé",
  FAIBLE: "Faible",
  MOYENNE: "Moyenne",
  URGENTE: "Urgente",
  TRES_URGENTE: "Très urgente",
  TRES_URGENT: "Très urgent",
  PRIORITAIRE: "Très urgent",
  CRITIQUE: "Critique",
  MATERIEL: "Matériel",
  LOGICIEL: "Logiciel",
  RESEAU: "Réseau",
  RESEAU_INTERNET: "Réseau / Internet",
  COMPTE: "Compte utilisateur",
  AUTRE: "Autre",
};

const ALIASES = {
  status: [
    "tickets_par_statut",
    "par_statut",
    "repartition_statut",
    "statuts",
  ],

  priority: [
    "tickets_par_priorite",
    "par_priorite",
    "repartition_priorite",
    "priorites",
  ],

  category: [
    "tickets_par_categorie",
    "par_categorie",
    "repartition_categorie",
    "categories",
  ],

  service: [
    "tickets_par_service",
    "par_service",
    "repartition_service",
    "services",
  ],

  technician: [
    "tickets_par_technicien",
    "par_technicien",
    "repartition_technicien",
    "techniciens",
  ],

  evolution: [
    "evolution_mensuelle",
    "evolution",
    "tickets_par_mois",
  ],
};

/* =====================================================
   FONCTIONS UTILITAIRES
===================================================== */

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function numberFormat(value) {
  return new Intl.NumberFormat("fr-FR").format(
    numberValue(value)
  );
}

function percentFormat(value) {
  return `${numberValue(value)
    .toFixed(1)
    .replace(".", ",")} %`;
}

function getValue(data, keys, fallback = 0) {
  for (const key of keys) {
    const value = data?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return numberValue(value);
    }
  }

  return fallback;
}

function findValue(data, keys) {
  for (const key of keys) {
    if (
      data?.[key] !== undefined &&
      data?.[key] !== null
    ) {
      return data[key];
    }
  }

  return null;
}

function labelOf(value) {
  const original = String(value ?? "").trim();

  if (!original) return "Non renseigné";

  const normalized = original.toUpperCase();

  return (
    LABELS[normalized] ||
    original
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

function rowLabel(item, fallback) {
  if (
    typeof item === "string" ||
    typeof item === "number"
  ) {
    return String(item);
  }

  return (
    item?.label ??
    item?.nom ??
    item?.name ??
    item?.statut ??
    item?.priorite ??
    item?.categorie ??
    item?.service ??
    item?.technicien ??
    item?.username ??
    item?.mois ??
    item?.date ??
    fallback
  );
}

function rowNumber(item) {
  if (
    typeof item === "number" ||
    typeof item === "string"
  ) {
    return numberValue(item);
  }

  return numberValue(
    item?.value ??
      item?.total ??
      item?.nombre ??
      item?.count ??
      item?.nombre_tickets ??
      item?.tickets ??
      item?.interventions ??
      0
  );
}

function normalizeDistribution(data, aliases) {
  const source = findValue(data, aliases);

  if (!source) return [];

  let rows = [];

  if (Array.isArray(source)) {
    rows = source.map((item, index) => ({
      name: labelOf(
        rowLabel(item, `Élément ${index + 1}`)
      ),
      value: rowNumber(item),
      original: item,
    }));
  } else if (typeof source === "object") {
    rows = Object.entries(source).map(
      ([name, value]) => ({
        name: labelOf(name),
        value: rowNumber(value),
        original: name,
      })
    );
  }

  return rows
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function formatMonth(value) {
  const match = String(value).match(
    /^(\d{4})-(\d{1,2})$/
  );

  if (!match) return value;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    1
  );

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function normalizeEvolution(data) {
  const source = findValue(data, ALIASES.evolution);

  if (!source) return [];

  let rows = [];

  if (Array.isArray(source)) {
    rows = source.map((item) => ({
      period: String(
        item?.mois ??
          item?.date ??
          item?.periode ??
          item?.label ??
          ""
      ),
      tickets: rowNumber(item),
    }));
  } else if (typeof source === "object") {
    rows = Object.entries(source).map(
      ([period, value]) => ({
        period,
        tickets: rowNumber(value),
      })
    );
  }

  return rows
    .filter((item) => item.period)
    .sort((a, b) =>
      a.period.localeCompare(b.period)
    )
    .map((item) => ({
      ...item,
      label: formatMonth(item.period),
    }));
}

function buildStatusRows(data) {
  const rows = normalizeDistribution(
    data,
    ALIASES.status
  );

  if (rows.length) return rows;

  const directStatuses = [
    ["NOUVELLE", "nouveaux"],
    ["EN_ATTENTE", "en_attente"],
    ["EN_COURS", "en_cours"],
    ["RESOLUE", "resolus"],
    ["CLOTUREE", "clotures"],
  ];

  return directStatuses
    .map(([label, key]) => ({
      name: labelOf(label),
      value: getValue(data, [key]),
      code: label,
    }))
    .filter((item) => item.value > 0);
}

function monthLimit(rows, period) {
  if (period === "all") return rows;

  const limit = Number(period);

  return rows.slice(-limit);
}

function getVariation(rows) {
  if (rows.length < 2) return null;

  const current = rows[rows.length - 1].tickets;
  const previous = rows[rows.length - 2].tickets;

  if (previous === 0) {
    return current > 0 ? "Nouveau volume" : "Stable";
  }

  const variation =
    ((current - previous) / previous) * 100;

  return `${variation > 0 ? "+" : ""}${variation
    .toFixed(1)
    .replace(".", ",")} %`;
}

function isResolvedStatus(status) {
  const value = String(status ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "_");

  return [
    "RESOLU",
    "RESOLUE",
    "CLOTURE",
    "CLOTUREE",
    "FERME",
    "FERMEE",
  ].includes(value);
}

function getStatusColor(name, index) {
  const normalized = String(name ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll(" ", "_");

  return (
    STATUS_COLORS[normalized] ||
    COLORS[index % COLORS.length]
  );
}

/* =====================================================
   CORRECTION : COULEURS DE DISTRIBUTION
===================================================== */

function getDistributionColor(index) {
  const distributionColors = [
    "#3979ed",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
    "#f97316",
    "#6366f1",
  ];

  return distributionColors[
    index % distributionColors.length
  ];
}

/* =====================================================
   POURCENTAGES ANIMÉS
===================================================== */

function AnimatedPercentage({
  label,
  value,
  description,
  tone = "blue",
  icon: Icon = Activity,
}) {
  const percentage = Math.min(
    100,
    Math.max(0, numberValue(value))
  );

  return (
    <article
      className={`analysis-rate-card analysis-rate-${tone}`}
    >
      <div className="analysis-rate-top">
        <div className="analysis-rate-icon">
          <Icon size={20} />
        </div>

        <span className="analysis-rate-label">
          {label}
        </span>
      </div>

      <div className="analysis-rate-value">
        {percentFormat(percentage)}
      </div>

      <div
        className="analysis-rate-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentage)}
      >
        <div
          className="analysis-rate-progress"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <p>{description}</p>
    </article>
  );
}

/* =====================================================
   COMPOSANTS GRAPHIQUES
===================================================== */

function CustomTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analysis-tooltip">
      <strong>{label}</strong>

      {payload.map((item, index) => (
        <div key={index}>
          <span
            className="analysis-tooltip-dot"
            style={{
              background: item.color || item.fill,
            }}
          />

          {item.name || "Tickets"} :{" "}

          <b>{numberFormat(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={`analysis-card ${className}`}
    >
      <div className="analysis-card-heading">
        <div>
          <h2>{title}</h2>

          {subtitle && <p>{subtitle}</p>}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function EmptyChart({
  message = "Aucune donnée disponible pour cette analyse.",
}) {
  return (
    <div className="analysis-empty">
      <BarChart3 size={25} />
      <span>{message}</span>
    </div>
  );
}

function AnalyticalMetric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}) {
  return (
    <article className="analysis-metric">
      <div
        className={`analysis-metric-icon ${tone}`}
      >
        <Icon size={20} />
      </div>

      <div className="analysis-metric-body">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

/* =====================================================
   PAGE STATISTIQUES
===================================================== */

export default function StatistiquesPage() {
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [period, setPeriod] = useState("6");

  const [updatedAt, setUpdatedAt] = useState(null);

  /* ===================================================
     CHARGEMENT DES DONNÉES
  =================================================== */

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/");

      setData(response.data ?? {});

      setUpdatedAt(new Date());
    } catch (err) {
      console.error(
        "Erreur statistiques :",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Impossible de récupérer les données statistiques."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  /* ===================================================
     CALCUL DES INDICATEURS
  =================================================== */

  const analysis = useMemo(() => {
    const source = data || {};

    const total = getValue(source, [
      "total_tickets",
      "total",
    ]);

    const newTickets = getValue(source, [
      "nouveaux",
      "nouveau",
    ]);

    const waiting = getValue(source, [
      "en_attente",
      "attente",
    ]);

    const inProgress = getValue(source, [
      "en_cours",
      "encours",
    ]);

    const resolved = getValue(source, [
      "resolus",
      "résolus",
      "resolues",
    ]);

    const closed = getValue(source, [
      "clotures",
      "clôtures",
      "cloturees",
    ]);

    const urgent = getValue(source, [
      "urgents",
      "tickets_urgents",
      "tres_urgents",
      "tickets_tres_urgents",
    ]);

    const open =
      newTickets + waiting + inProgress;

    const finished = resolved + closed;

    const unresolved = Math.max(
      0,
      total - finished
    );

    const resolutionRate =
      total > 0
        ? (finished / total) * 100
        : 0;

    const nonResolutionRate =
      total > 0
        ? (unresolved / total) * 100
        : 0;

    const urgentRate =
      total > 0
        ? (urgent / total) * 100
        : 0;

    const openRate =
      total > 0
        ? (open / total) * 100
        : 0;

    const statusRows = buildStatusRows(source);

    const priorityRows = normalizeDistribution(
      source,
      ALIASES.priority
    );

    const categoryRows = normalizeDistribution(
      source,
      ALIASES.category
    );

    const serviceRows = normalizeDistribution(
      source,
      ALIASES.service
    );

    const technicianRows = normalizeDistribution(
      source,
      ALIASES.technician
    );

    const evolutionRows = normalizeEvolution(source);

    const frequentProblems = categoryRows
      .slice()
      .sort((a, b) => b.value - a.value);

    return {
      total,
      newTickets,
      waiting,
      inProgress,
      resolved,
      closed,
      urgent,
      open,
      finished,
      unresolved,
      resolutionRate,
      nonResolutionRate,
      urgentRate,
      openRate,
      statusRows,
      priorityRows,
      categoryRows,
      serviceRows,
      technicianRows,
      evolutionRows,
      frequentProblems,
    };
  }, [data]);

  /* ===================================================
     ÉVOLUTION TEMPORELLE
  =================================================== */

  const evolution = useMemo(
    () =>
      monthLimit(
        analysis.evolutionRows,
        period
      ),
    [analysis.evolutionRows, period]
  );

  const variation = getVariation(evolution);

  /* ===================================================
     ÉLÉMENTS DOMINANTS
  =================================================== */

  const highestPriority =
    analysis.priorityRows[0]?.name ||
    "Non disponible";

  const leadingCategory =
    analysis.categoryRows[0]?.name ||
    "Non disponible";

  const leadingTechnician =
    analysis.technicianRows[0]?.name ||
    "Non disponible";

  const frequentProblem =
    analysis.frequentProblems[0]?.name ||
    "Non disponible";

  /* ===================================================
     AFFICHAGE
  =================================================== */

  return (
    <main className="analysis-page">

      {/* EN-TÊTE */}

      <header className="analysis-header">
        <div>
          <div className="analysis-eyebrow">
            <BarChart3 size={15} />

            DIRECTION DES SYSTÈMES D'INFORMATION
          </div>

          <h1>Centre d'analyse statistique</h1>

          <p>
            Explorez les tendances, identifiez les
            problèmes informatiques et analysez les
            performances de traitement des tickets.
          </p>
        </div>

        <button
          type="button"
          className="analysis-refresh"
          onClick={loadStatistics}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={
              loading ? "analysis-spin" : ""
            }
          />

          Actualiser les données
        </button>
      </header>

      {/* INFORMATIONS DE MISE À JOUR */}

      <div className="analysis-meta">
        <div>
          <span className="analysis-status-dot" />

          Analyse basée sur les données enregistrées
        </div>

        <span>
          {updatedAt
            ? `Dernière actualisation : ${updatedAt.toLocaleString(
                "fr-FR"
              )}`
            : "Données non chargées"}
        </span>
      </div>

      {/* ERREUR */}

      {error && (
        <div
          className="analysis-error"
          role="alert"
        >
          <AlertTriangle size={18} />

          <span>{error}</span>

          <button
            onClick={loadStatistics}
            type="button"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* CHARGEMENT */}

      {loading && !data ? (
        <div className="analysis-loading">
          <RefreshCw
            size={25}
            className="analysis-spin"
          />

          Chargement des analyses statistiques...
        </div>
      ) : data ? (
        <>

          {/* =========================================
              1. INDICATEURS PRINCIPAUX
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  VUE GÉNÉRALE
                </span>

                <h2>Situation globale des tickets</h2>

                <p>
                  Vue d'ensemble des demandes
                  enregistrées dans la plateforme DSI.
                </p>
              </div>
            </div>

            <div className="analysis-metrics-grid">

              <AnalyticalMetric
                icon={Ticket}
                label="Total des tickets"
                value={numberFormat(
                  analysis.total
                )}
                note="Toutes les demandes enregistrées"
                tone="blue"
              />

              <AnalyticalMetric
                icon={AlertTriangle}
                label="Tickets très urgents"
                value={numberFormat(
                  analysis.urgent
                )}
                note="Demandes de priorité très urgente"
                tone="orange"
              />

              <AnalyticalMetric
                icon={Clock}
                label="Tickets non résolus"
                value={numberFormat(
                  analysis.unresolved
                )}
                note="Demandes qui ne sont pas encore résolues"
                tone="purple"
              />

              <AnalyticalMetric
                icon={CheckCircle2}
                label="Tickets résolus"
                value={numberFormat(
                  analysis.finished
                )}
                note="Tickets résolus ou clôturés"
                tone="green"
              />

            </div>
          </section>

          {/* =========================================
              2. TAUX ET POURCENTAGES
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  PERFORMANCE DE TRAITEMENT
                </span>

                <h2>Indicateurs de performance</h2>

                <p>
                  Analyse des taux de résolution,
                  de non-résolution et des urgences.
                </p>
              </div>
            </div>

            <div className="analysis-rates-grid">

              <AnimatedPercentage
                label="Taux de résolution"
                value={analysis.resolutionRate}
                description="Part des tickets résolus ou clôturés sur le total."
                tone="green"
                icon={CheckCircle2}
              />

              <AnimatedPercentage
                label="Taux de non-résolution"
                value={analysis.nonResolutionRate}
                description="Part des tickets qui restent sans résolution."
                tone="red"
                icon={CircleX}
              />

              <AnimatedPercentage
                label="Taux de tickets très urgents"
                value={analysis.urgentRate}
                description="Part des tickets très urgents dans le volume global."
                tone="orange"
                icon={AlertTriangle}
              />

              <AnimatedPercentage
                label="Taux de tickets ouverts"
                value={analysis.openRate}
                description="Part des tickets nouveaux, en attente ou en cours."
                tone="blue"
                icon={Activity}
              />

            </div>
          </section>

          {/* =========================================
              3. PROBLÈMES INFORMATIQUES FRÉQUENTS
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  ANALYSE DES INCIDENTS
                </span>

                <h2>Problèmes informatiques fréquents</h2>

                <p>
                  Identification des catégories de
                  problèmes les plus signalées.
                </p>
              </div>
            </div>

            <div className="analysis-problem-summary">

              <div className="analysis-problem-feature">
                <div className="analysis-problem-icon">
                  <AlertTriangle size={22} />
                </div>

                <div>
                  <span>
                    Problème le plus fréquent
                  </span>

                  <strong>
                    {frequentProblem}
                  </strong>

                  <small>
                    Catégorie ayant le plus grand
                    nombre de tickets.
                  </small>
                </div>
              </div>

              <div className="analysis-problem-total">
                <span>
                  Catégories identifiées
                </span>

                <strong>
                  {numberFormat(
                    analysis.categoryRows.length
                  )}
                </strong>
              </div>

            </div>

            <ChartCard
              title="Fréquence des problèmes"
              subtitle="Nombre de tickets par catégorie informatique"
            >
              {analysis.frequentProblems.length ? (
                <BarChart
                  responsive
                  data={analysis.frequentProblems}
                  style={{
                    width: "100%",
                    height: 330,
                  }}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 24,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    stroke="#e9eef5"
                    strokeDasharray="4 5"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#8793a5",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={145}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                  />

                  <Bar
                    dataKey="value"
                    name="Tickets"
                    fill="#3979ed"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={27}
                  >
                    {analysis.frequentProblems.map(
                      (item, index) => (
                        <Cell
                          key={`${item.name}-${index}`}
                          fill={getDistributionColor(
                            index
                          )}
                        />
                      )
                    )}
                  </Bar>
                </BarChart>
              ) : (
                <EmptyChart
                  message="Aucune catégorie de problème disponible."
                />
              )}
            </ChartCard>
          </section>

          {/* =========================================
              4. ÉVOLUTION TEMPORELLE
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  ANALYSE TEMPORELLE
                </span>

                <h2>Évolution des volumes</h2>

                <p>
                  Comparaison des volumes mensuels
                  de tickets.
                </p>
              </div>

              <label className="analysis-period">
                <CalendarDays size={16} />

                <select
                  value={period}
                  onChange={(event) =>
                    setPeriod(event.target.value)
                  }
                  aria-label="Période du graphique"
                >
                  <option value="6">
                    6 derniers mois
                  </option>

                  <option value="12">
                    12 derniers mois
                  </option>

                  <option value="all">
                    Toute la période
                  </option>
                </select>
              </label>
            </div>

            <div className="analysis-main-chart-grid">

              <ChartCard
                title="Tendance mensuelle"
                subtitle="Nombre de tickets enregistrés par mois"
                className="analysis-large-card"
                action={
                  <span className="analysis-chart-badge">
                    <TrendingUp size={14} />

                    {variation ?? "Évolution"}
                  </span>
                }
              >
                {evolution.length ? (
                  <div className="analysis-chart-area">
                    <AreaChart
                      responsive
                      data={evolution}
                      style={{
                        width: "100%",
                        height: 310,
                      }}
                      margin={{
                        top: 15,
                        right: 12,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="ticketTrendGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3979ed"
                            stopOpacity={0.28}
                          />

                          <stop
                            offset="95%"
                            stopColor="#3979ed"
                            stopOpacity={0.015}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        stroke="#e9eef5"
                        strokeDasharray="4 5"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#8793a5",
                          fontSize: 11,
                        }}
                        dy={10}
                      />

                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#8793a5",
                          fontSize: 11,
                        }}
                        width={35}
                      />

                      <Tooltip
                        content={<CustomTooltip />}
                      />

                      <Area
                        type="monotone"
                        dataKey="tickets"
                        name="Tickets"
                        stroke="#3979ed"
                        strokeWidth={3}
                        fill="url(#ticketTrendGradient)"
                        activeDot={{
                          r: 6,
                          stroke: "#fff",
                          strokeWidth: 3,
                        }}
                      />
                    </AreaChart>
                  </div>
                ) : (
                  <EmptyChart
                    message="Aucune évolution mensuelle fournie par le serveur."
                  />
                )}
              </ChartCard>

              {/* RÉPARTITION DES STATUTS */}

              <ChartCard
                title="Structure des statuts"
                subtitle="Poids de chaque état dans le volume connu"
              >
                {analysis.statusRows.length ? (
                  <>
                    <div className="analysis-donut-wrap">
                      <PieChart
                        responsive
                        style={{
                          width: "100%",
                          height: 245,
                        }}
                      >
                        <Pie
                          data={analysis.statusRows}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="88%"
                          paddingAngle={3}
                          stroke="none"
                        >
                          {analysis.statusRows.map(
                            (item, index) => (
                              <Cell
                                key={`${item.name}-${index}`}
                                fill={getStatusColor(
                                  item.name,
                                  index
                                )}
                              />
                            )
                          )}
                        </Pie>

                        <Tooltip
                          content={<CustomTooltip />}
                        />
                      </PieChart>

                      <div className="analysis-donut-center">
                        <strong>
                          {numberFormat(
                            analysis.statusRows.reduce(
                              (sum, item) =>
                                sum + item.value,
                              0
                            )
                          )}
                        </strong>

                        <span>Tickets</span>
                      </div>
                    </div>

                    <div className="analysis-legend">
                      {analysis.statusRows.map(
                        (item, index) => (
                          <div
                            key={`${item.name}-${index}`}
                          >
                            <span
                              className="analysis-legend-dot"
                              style={{
                                background:
                                  getStatusColor(
                                    item.name,
                                    index
                                  ),
                              }}
                            />

                            <span>{item.name}</span>

                            <strong>
                              {numberFormat(item.value)}
                            </strong>
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

            </div>
          </section>

          {/* =========================================
              5. RÉPARTITION PAR PRIORITÉ, CATÉGORIE
              ET SERVICE
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  ANALYSE COMPARATIVE
                </span>

                <h2>Répartition et concentration</h2>

                <p>
                  Comprenez quelles demandes
                  représentent la plus grande part
                  de l'activité.
                </p>
              </div>
            </div>

            <div className="analysis-three-columns">

              {/* PRIORITÉS */}

              <ChartCard
                title="Priorités"
                subtitle="Volume par niveau de priorité"
              >
                {analysis.priorityRows.length ? (
                  <BarChart
                    responsive
                    data={analysis.priorityRows}
                    style={{
                      width: "100%",
                      height: 260,
                    }}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 12,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#e9eef5"
                      strokeDasharray="4 5"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#8793a5",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                    />

                    <Bar
                      dataKey="value"
                      name="Tickets"
                      fill="#8b5cf6"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={25}
                    />
                  </BarChart>
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

              {/* CATÉGORIES */}

              <ChartCard
                title="Catégories"
                subtitle="Nature des demandes"
              >
                {analysis.categoryRows.length ? (
                  <BarChart
                    responsive
                    data={analysis.categoryRows}
                    style={{
                      width: "100%",
                      height: 260,
                    }}
                    margin={{
                      top: 8,
                      right: 8,
                      left: -18,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#e9eef5"
                      strokeDasharray="4 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                      interval={0}
                    />

                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#8793a5",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                    />

                    <Bar
                      dataKey="value"
                      name="Tickets"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    >
                      {analysis.categoryRows.map(
                        (item, index) => (
                          <Cell
                            key={`${item.name}-${index}`}
                            fill={getDistributionColor(
                              index
                            )}
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

              {/* SERVICES */}

              <ChartCard
                title="Services"
                subtitle="Volume de demandes par service"
              >
                {analysis.serviceRows.length ? (
                  <BarChart
                    responsive
                    data={analysis.serviceRows}
                    style={{
                      width: "100%",
                      height: 260,
                    }}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 12,
                      left: 5,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#e9eef5"
                      strokeDasharray="4 5"
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#8793a5",
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={85}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#64748b",
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                    />

                    <Bar
                      dataKey="value"
                      name="Tickets"
                      fill="#16a6a1"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={25}
                    />
                  </BarChart>
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

            </div>
          </section>

          {/* =========================================
              6. ACTIVITÉ TECHNIQUE
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  ACTIVITÉ TECHNIQUE
                </span>

                <h2>Répartition par technicien</h2>

                <p>
                  Comparaison des volumes de tickets
                  associés à chaque technicien.
                  Ce classement mesure le volume,
                  pas la qualité du travail.
                </p>
              </div>
            </div>

            <ChartCard
              title="Volumes de tickets par technicien"
              subtitle="Nombre de tickets associés à chaque technicien"
              action={
                <span className="analysis-chart-badge">
                  <Users size={14} />

                  {analysis.technicianRows.length} technicien(s)
                </span>
              }
            >
              {analysis.technicianRows.length ? (
                <BarChart
                  responsive
                  data={analysis.technicianRows}
                  style={{
                    width: "100%",
                    height: 330,
                  }}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 24,
                    left: 10,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    stroke="#e9eef5"
                    strokeDasharray="4 5"
                    horizontal={false}
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#8793a5",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={145}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    content={<CustomTooltip />}
                  />

                  <Bar
                    dataKey="value"
                    name="Tickets"
                    fill="#3979ed"
                    radius={[0, 7, 7, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              ) : (
                <EmptyChart
                  message="Aucune répartition par technicien disponible."
                />
              )}
            </ChartCard>
          </section>

          {/* =========================================
              7. ÉLÉMENTS DOMINANTS
          ========================================= */}

          <section className="analysis-section">
            <div className="analysis-section-heading">
              <div>
                <span className="analysis-kicker">
                  POINTS DE CONCENTRATION
                </span>

                <h2>Les éléments dominants</h2>

                <p>
                  Repérage des plus grands volumes
                  dans les répartitions reçues.
                </p>
              </div>
            </div>

            <div className="analysis-highlights">

              <article>
                <span>
                  Priorité la plus représentée
                </span>

                <strong>
                  {highestPriority}
                </strong>
              </article>

              <article>
                <span>
                  Catégorie dominante
                </span>

                <strong>
                  {leadingCategory}
                </strong>
              </article>

              <article>
                <span>
                  Plus grand volume technicien
                </span>

                <strong>
                  {leadingTechnician}
                </strong>
              </article>

            </div>
          </section>

          {/* =========================================
              PIED DE PAGE
          ========================================= */}

          <footer className="analysis-footer">
            <span>
              DSI · Centre d'analyse statistique
            </span>

            <span>
              Les taux sont calculés à partir
              des compteurs disponibles dans l'API.
            </span>
          </footer>

        </>
      ) : (
        !error && <EmptyChart />
      )}

    </main>
  );
}
