
import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  Search,
  RefreshCw,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  Eye,
  X,
  CalendarDays,
  UserRound,
  Ticket,
  FileText,
  XCircle,
  Filter,
} from "lucide-react";

import api from "../../services/api";
import "./InterventionsPage.css";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}

function readInterventions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.interventions)) return data.interventions;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function getText(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return (
      value.label ??
      value.nom ??
      value.name ??
      value.titre ??
      value.username ??
      value.identifiant ??
      value.reference ??
      "—"
    );
  }

  return "—";
}

function getPersonName(person) {
  if (!person) return "—";
  if (typeof person === "string") return person;

  const fullName = [
    person.first_name ?? person.prenom,
    person.last_name ?? person.nom,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    person.full_name ??
    person.nom_complet ??
    fullName ??
    person.username ??
    person.identifiant ??
    "—"
  );
}

function getTicket(intervention) {
  return (
    intervention.ticket ??
    intervention.demande ??
    intervention.tickets ??
    null
  );
}

function getTicketReference(intervention) {
  const ticket = getTicket(intervention);

  if (ticket && typeof ticket === "object") {
    return (
      ticket.reference ??
      ticket.numero_ticket ??
      ticket.numero ??
      ticket.code ??
      (ticket.id != null
        ? `DSI-${String(ticket.id).padStart(5, "0")}`
        : "—")
    );
  }

  if (ticket !== null && ticket !== undefined && ticket !== "") {
    return String(ticket);
  }

  return (
    intervention.ticket_reference ??
    intervention.reference_ticket ??
    intervention.numero_ticket ??
    "—"
  );
}

function getTechnician(intervention) {
  return getPersonName(
    intervention.technicien ??
    intervention.technicien_assigne ??
    intervention.intervenant ??
    intervention.assigne_a ??
    intervention.created_by
  );
}

function getResult(intervention) {
  return normalize(
    intervention.resultat ??
    intervention.resultat_intervention ??
    intervention.result ??
    "NON_RENSEIGNE"
  );
}

function getStatus(intervention) {
  return normalize(
    intervention.statut_final ??
    intervention.statut ??
    intervention.status ??
    "NON_RENSEIGNE"
  );
}

function resultLabel(result) {
  const labels = {
    RESOLU: "Résolu",
    RESOLUE: "Résolue",
    TERMINE: "Terminé",
    TERMINEE: "Terminée",
    PARTIEL: "Partiel",
    PARTIELLE: "Partielle",
    ECHEC: "Échec",
    NON_RESOLU: "Non résolu",
    EN_ATTENTE: "En attente",
    NON_RENSEIGNE: "Non renseigné",
    SUCCES: "Succès",
    REUSSI: "Réussi",
  };

  return labels[result] ?? result.replaceAll("_", " ");
}

function statusLabel(status) {
  const labels = {
    NOUVELLE: "Nouvelle",
    NOUVEAU: "Nouveau",
    EN_ATTENTE: "En attente",
    EN_COURS: "En cours",
    RESOLUE: "Résolue",
    RESOLU: "Résolu",
    CLOTUREE: "Clôturée",
    CLOTURE: "Clôturé",
    ANNULEE: "Annulée",
    NON_RENSEIGNE: "Non renseigné",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDate(intervention) {
  return (
    intervention.date_intervention ??
    intervention.date_creation ??
    intervention.created_at ??
    intervention.created ??
    intervention.date ??
    null
  );
}

function getDuration(intervention) {
  const duration =
    intervention.duree ??
    intervention.duree_minutes ??
    intervention.duration ??
    null;

  if (duration === null || duration === undefined || duration === "") {
    return "—";
  }

  const value = Number(duration);

  if (!Number.isFinite(value)) {
    return String(duration);
  }

  return `${value} min`;
}

function InterventionsPage() {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [resultFilter, setResultFilter] = useState("TOUS");
  const [selectedIntervention, setSelectedIntervention] = useState(null);

  async function loadInterventions() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/interventions/");
      setInterventions(readInterventions(response.data));
    } catch (err) {
      console.error("Erreur de chargement des interventions :", err);

      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Connectez-vous de nouveau."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Accès refusé : votre compte ne peut pas consulter ces interventions."
        );
      } else if (err.response?.status === 404) {
        setError(
          "L'adresse /api/interventions/ est introuvable. Vérifiez la route dans Django."
        );
      } else {
        setError(
          "Impossible de charger les interventions. Vérifiez que le serveur Django fonctionne."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInterventions();
  }, []);

  const filteredInterventions = useMemo(() => {
    const query = normalize(search);

    return interventions.filter((intervention) => {
      const searchableText = normalize(
        [
          getTicketReference(intervention),
          getTechnician(intervention),
          getText(intervention.description),
          getText(intervention.solution),
          getText(intervention.commentaire),
          getResult(intervention),
          getStatus(intervention),
        ].join(" ")
      );

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "TOUS" ||
        getStatus(intervention) === statusFilter;

      const matchesResult =
        resultFilter === "TOUS" ||
        getResult(intervention) === resultFilter;

      return matchesSearch && matchesStatus && matchesResult;
    });
  }, [interventions, search, statusFilter, resultFilter]);

  const counts = useMemo(() => {
    return {
      total: interventions.length,
      completed: interventions.filter((item) =>
        ["RESOLU", "RESOLUE", "TERMINE", "TERMINEE", "SUCCES", "REUSSI"]
          .includes(getResult(item))
      ).length,
      partial: interventions.filter((item) =>
        ["PARTIEL", "PARTIELLE"].includes(getResult(item))
      ).length,
      inProgress: interventions.filter((item) =>
        ["EN_COURS", "EN_ATTENTE"].includes(getStatus(item))
      ).length,
    };
  }, [interventions]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("TOUS");
    setResultFilter("TOUS");
  }

  return (
    <main className="interventions-page">
      <header className="interventions-header">
        <div>
          <div className="interventions-eyebrow">
            <Wrench size={15} />
            GESTION DU SUPPORT
          </div>

          <h1>Interventions</h1>

          <p>
            Consultez les opérations effectuées par les techniciens
            et les résultats du traitement des tickets DSI.
          </p>
        </div>

        <button
          type="button"
          className="interventions-refresh"
          onClick={loadInterventions}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "interventions-spinning" : ""}
          />
          Actualiser
        </button>
      </header>

      {error && (
        <div className="interventions-alert">
          <XCircle size={20} />
          <span>{error}</span>
          <button type="button" onClick={loadInterventions}>
            Réessayer
          </button>
        </div>
      )}

      <section className="interventions-summary">
        <article className="interventions-summary-card">
          <div className="interventions-summary-icon blue">
            <Wrench size={20} />
          </div>
          <div>
            <span>Total des interventions</span>
            <strong>{loading ? "…" : counts.total}</strong>
          </div>
        </article>

        <article className="interventions-summary-card">
          <div className="interventions-summary-icon green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Résultat terminé ou réussi</span>
            <strong>{loading ? "…" : counts.completed}</strong>
          </div>
        </article>

        <article className="interventions-summary-card">
          <div className="interventions-summary-icon orange">
            <AlertTriangle size={20} />
          </div>
          <div>
            <span>Résultats partiels</span>
            <strong>{loading ? "…" : counts.partial}</strong>
          </div>
        </article>

        <article className="interventions-summary-card">
          <div className="interventions-summary-icon purple">
            <Clock3 size={20} />
          </div>
          <div>
            <span>En cours ou en attente</span>
            <strong>{loading ? "…" : counts.inProgress}</strong>
          </div>
        </article>
      </section>

      <section className="interventions-list-panel">
        <div className="interventions-list-heading">
          <div>
            <h2>Historique des interventions</h2>
            <p>
              {loading
                ? "Chargement des données…"
                : `${filteredInterventions.length} résultat(s) sur ${interventions.length} intervention(s)`}
            </p>
          </div>

          <span className="interventions-api-indicator">
            <span />
            API Django
          </span>
        </div>

        <div className="interventions-filters">
          <label className="interventions-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un ticket, un technicien..."
              aria-label="Rechercher une intervention"
            />
          </label>

          <label className="interventions-select">
            <Filter size={15} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrer par statut final"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="NOUVELLE">Nouvelle</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="EN_COURS">En cours</option>
              <option value="RESOLUE">Résolue</option>
              <option value="CLOTUREE">Clôturée</option>
            </select>
          </label>

          <label className="interventions-select">
            <select
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value)}
              aria-label="Filtrer par résultat"
            >
              <option value="TOUS">Tous les résultats</option>
              <option value="RESOLU">Résolu</option>
              <option value="RESOLUE">Résolue</option>
              <option value="PARTIEL">Partiel</option>
              <option value="PARTIELLE">Partielle</option>
              <option value="ECHEC">Échec</option>
              <option value="NON_RESOLU">Non résolu</option>
              <option value="SUCCES">Succès</option>
            </select>
          </label>

          <button
            type="button"
            className="interventions-clear"
            onClick={clearFilters}
          >
            Effacer
          </button>
        </div>

        <div className="interventions-table-wrap">
          <table className="interventions-table">
            <thead>
              <tr>
                <th>Ticket associé</th>
                <th>Technicien</th>
                <th>Durée</th>
                <th>Résultat</th>
                <th>Statut final</th>
                <th>Date</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                !error &&
                filteredInterventions.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <div className="interventions-empty">
                        <Wrench size={29} />
                        <strong>Aucune intervention à afficher</strong>
                        <span>
                          Aucun résultat ne correspond aux filtres,
                          ou aucune intervention n'a encore été enregistrée.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

              {filteredInterventions.map((intervention) => {
                const result = getResult(intervention);
                const status = getStatus(intervention);

                return (
                  <tr key={intervention.id}>
                    <td>
                      <div className="intervention-ticket-cell">
                        <strong>
                          {getTicketReference(intervention)}
                        </strong>
                        <span>
                          {getText(
                            getTicket(intervention)?.titre ??
                            intervention.titre_ticket ??
                            intervention.sujet
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="intervention-person">
                        <UserRound size={15} />
                        <span>{getTechnician(intervention)}</span>
                      </div>
                    </td>

                    <td className="intervention-duration">
                      {getDuration(intervention)}
                    </td>

                    <td>
                      <span
                        className={`intervention-result result-${result.toLowerCase()}`}
                      >
                        {resultLabel(result)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`intervention-status status-${status.toLowerCase()}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </td>

                    <td className="intervention-date">
                      {formatDate(getDate(intervention))}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="intervention-view-button"
                        onClick={() =>
                          setSelectedIntervention(intervention)
                        }
                        aria-label="Voir les détails de l'intervention"
                        title="Voir les détails"
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && (
            <div className="interventions-loading">
              <RefreshCw
                size={18}
                className="interventions-spinning"
              />
              Chargement des interventions…
            </div>
          )}
        </div>
      </section>

      {selectedIntervention && (
        <div
          className="intervention-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIntervention(null);
            }
          }}
        >
          <section
            className="intervention-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intervention-modal-title"
          >
            <header className="intervention-modal-header">
              <div>
                <div className="interventions-eyebrow">
                  <FileText size={14} />
                  DÉTAIL DE L'INTERVENTION
                </div>
                <h2 id="intervention-modal-title">
                  Intervention #{selectedIntervention.id ?? "—"}
                </h2>
              </div>

              <button
                type="button"
                className="intervention-modal-close"
                onClick={() => setSelectedIntervention(null)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>

            <div className="intervention-modal-body">
              <div className="intervention-modal-ticket">
                <Ticket size={18} />
                <div>
                  <span>Ticket associé</span>
                  <strong>
                    {getTicketReference(selectedIntervention)}
                  </strong>
                </div>
              </div>

              <div className="intervention-detail-grid">
                <div className="intervention-detail-item">
                  <UserRound size={17} />
                  <div>
                    <span>Technicien</span>
                    <strong>{getTechnician(selectedIntervention)}</strong>
                  </div>
                </div>

                <div className="intervention-detail-item">
                  <Clock3 size={17} />
                  <div>
                    <span>Durée</span>
                    <strong>{getDuration(selectedIntervention)}</strong>
                  </div>
                </div>

                <div className="intervention-detail-item">
                  <CheckCircle2 size={17} />
                  <div>
                    <span>Résultat</span>
                    <strong>
                      {resultLabel(getResult(selectedIntervention))}
                    </strong>
                  </div>
                </div>

                <div className="intervention-detail-item">
                  <CalendarDays size={17} />
                  <div>
                    <span>Date</span>
                    <strong>
                      {formatDateTime(getDate(selectedIntervention))}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="intervention-detail-section">
                <h3>Description</h3>
                <p>
                  {selectedIntervention.description ??
                    selectedIntervention.details ??
                    selectedIntervention.commentaire ??
                    "Aucune description disponible."}
                </p>
              </div>

              <div className="intervention-detail-section">
                <h3>Solution apportée</h3>
                <p>
                  {selectedIntervention.solution ??
                    selectedIntervention.solution_apportee ??
                    selectedIntervention.resultat_detaille ??
                    "Aucune solution détaillée enregistrée."}
                </p>
              </div>

              <div className="intervention-modal-final-status">
                <span>Statut final du ticket</span>
                <strong>
                  {statusLabel(getStatus(selectedIntervention))}
                </strong>
              </div>
            </div>

            <footer className="intervention-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedIntervention(null)}
              >
                Fermer
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default InterventionsPage;
