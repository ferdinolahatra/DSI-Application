
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Tag,
  UserRound,
  History,
  FileText,
  ClipboardCheck,
  Wrench,
  PlayCircle,
  Save,
} from "lucide-react";

import api from "../../services/api";
import TicketCommentaire from "./TicketCommentaire";
import "./TicketDetails.css";

/* =====================================================
   CONSTANTES
===================================================== */

const STATUS_LABELS = {
  NOUVELLE: "Nouvelle",
  NOUVEAU: "Nouveau",
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  RESOLUE: "Résolue",
  RESOLU: "Résolu",
  CLOTUREE: "Clôturée",
  CLOTURE: "Clôturé",
};

const PRIORITY_LABELS = {
  FAIBLE: "Faible",
  MOYENNE: "Moyenne",
  URGENTE: "Très urgente",
  TRES_URGENTE: "Très urgente",
};

const RESULT_OPTIONS = [
  { value: "RESOLU", label: "Résolu" },
  { value: "NON_RESOLU", label: "Non résolu" },
];

const INITIAL_INTERVENTION = {
  resultat: "",
  diagnostic: "",
  solution: "",
};

/* =====================================================
   FONCTIONS UTILITAIRES
===================================================== */

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.tickets)) return data.tickets;
  if (Array.isArray(data?.interventions)) return data.interventions;

  return [];
}

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

function getStoredUser() {
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
  } catch (error) {
    console.error(
      "Impossible de récupérer l'utilisateur connecté :",
      error
    );

    return {};
  }
}

/* =====================================================
   AUTORISATIONS BASÉES SUR LA FONCTION
===================================================== */

function isAdminUser(user) {
  return (
    user?.is_superuser === true ||
    user?.is_staff === true
  );
}

function isTechnicianUser(user) {
  const fonction = normalize(
    user?.fonction ??
    user?.profile?.fonction ??
    user?.user?.fonction ??
    ""
  );

  return fonction === "TECHNICIEN_DSI";
}

/* =====================================================
   IDENTIFIANTS ET AFFICHAGE
===================================================== */

function relationId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "object") {
    const id = value.id ?? value.pk ?? value.value;

    if (id === undefined || id === null) {
      return null;
    }

    const number = Number(id);

    return Number.isFinite(number) ? number : null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Non renseigné";
  }

  if (typeof value === "object") {
    return (
      value.username ||
      value.nom_complet ||
      value.full_name ||
      value.nom ||
      value.name ||
      value.label ||
      value.id ||
      "Non renseigné"
    );
  }

  return String(value);
}

function displayDate(value) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return displayValue(value);
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  return normalize(status)
    .toLowerCase()
    .replaceAll("_", "-");
}

function resultLabel(value) {
  const result = normalize(value);

  if (result === "RESOLU") return "Résolu";
  if (result === "NON_RESOLU") return "Non résolu";

  return displayValue(value);
}

function getAutomaticTicketStatus(resultat) {
  return normalize(resultat) === "RESOLU"
    ? "RESOLUE"
    : "EN_ATTENTE";
}

function getTicketStatus(ticket) {
  return normalize(
    ticket?.statut?.code ??
    ticket?.statut?.value ??
    ticket?.statut ??
    ticket?.status ??
    ""
  );
}

function getTicketPriority(ticket) {
  return normalize(
    ticket?.priorite?.code ??
    ticket?.priorite?.value ??
    ticket?.priorite ??
    ticket?.priority ??
    ""
  );
}

/* =====================================================
   HISTORIQUE
===================================================== */

function historyUser(item) {
  return displayValue(
    item.utilisateur_username ||
    item.utilisateur_nom ||
    item.utilisateur ||
    item.user
  );
}

function historyDate(item) {
  return (
    item.date_action ||
    item.date_creation ||
    item.created_at ||
    item.date ||
    null
  );
}

/* =====================================================
   INTERVENTIONS
===================================================== */

function interventionTicketId(item) {
  return relationId(
    item.ticket_id ??
    item.ticket ??
    item.ticket_detail
  );
}

function getInterventionDate(item) {
  return (
    item?.date_intervention ||
    item?.date_creation ||
    item?.created_at ||
    item?.date ||
    null
  );
}

function getLatestIntervention(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return [...items].sort((a, b) => {
    const dateA = new Date(
      getInterventionDate(a) || 0
    ).getTime();

    const dateB = new Date(
      getInterventionDate(b) || 0
    ).getTime();

    return dateB - dateA;
  })[0];
}

/* =====================================================
   GESTION DES ERREURS API
===================================================== */

function getApiError(error, defaultMessage) {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    if (data.detail) {
      return String(data.detail);
    }

    if (data.message) {
      return String(data.message);
    }

    const messages = Object.entries(data).flatMap(
      ([field, value]) => {
        const values = Array.isArray(value)
          ? value
          : [value];

        return values.map((message) => {
          if (typeof message === "object") {
            return `${field} : erreur de validation`;
          }

          return `${field} : ${String(message)}`;
        });
      }
    );

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Votre fonction ne vous autorise pas à effectuer cette action.";
  }

  return defaultMessage;
}

/* =====================================================
   CHRONOMÈTRE
===================================================== */

function formatElapsedTime(milliseconds) {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

/* =====================================================
   PAGE PRINCIPALE
===================================================== */

function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* ---------------------------------------------------
     UTILISATEUR CONNECTÉ
  --------------------------------------------------- */

  const user = getStoredUser();

  const isAdmin = isAdminUser(user);
  const isTechnician = isTechnicianUser(user);

  const canManage = isAdmin || isTechnician;

  const currentUserId = relationId(
    user.id ?? user.user_id ?? user.pk
  );

  /* ---------------------------------------------------
     ÉTATS
  --------------------------------------------------- */

  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [interventions, setInterventions] = useState([]);

  const [interventionForm, setInterventionForm] = useState({
    ...INITIAL_INTERVENTION,
  });

  const [clockNow, setClockNow] = useState(Date.now());
  const [activeSessionStart, setActiveSessionStart] = useState(null);
  const [interventionsLoaded, setInterventionsLoaded] = useState(false);
  const [showInterventionForm, setShowInterventionForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [takingCharge, setTakingCharge] = useState(false);
  const [savingIntervention, setSavingIntervention] = useState(false);

  const [error, setError] = useState("");
  const [interventionError, setInterventionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  /* ===================================================
     DATE DE PRISE EN CHARGE ET ÉTAT DU TICKET
  =================================================== */

  const startTimestamp = ticket?.date_prise_en_charge
    ? new Date(ticket.date_prise_en_charge).getTime()
    : null;

  const hasStarted =
    startTimestamp !== null &&
    Number.isFinite(startTimestamp);

  const ticketStatus = getTicketStatus(ticket);

  const isFinalStatus = [
    "RESOLUE",
    "CLOTUREE",
  ].includes(ticketStatus);

  const timerStorageKey = `dsi-ticket-${id}-active-session-start`;

  /* ===================================================
     RESTAURER OU INITIALISER LA SESSION
  =================================================== */

  useEffect(() => {
    if (!ticket || !interventionsLoaded) {
      return;
    }

    if (
      isFinalStatus ||
      ticketStatus !== "EN_COURS"
    ) {
      localStorage.removeItem(timerStorageKey);
      setActiveSessionStart(null);
      return;
    }

    const savedStart = Number(
      localStorage.getItem(timerStorageKey)
    );

    if (
      Number.isFinite(savedStart) &&
      savedStart > 0
    ) {
      setActiveSessionStart(savedStart);
      return;
    }

    if (interventions.length === 0 && hasStarted) {
      localStorage.setItem(
        timerStorageKey,
        String(startTimestamp)
      );

      setActiveSessionStart(startTimestamp);
      return;
    }

    setActiveSessionStart(null);

  }, [
    ticket?.id,
    ticketStatus,
    isFinalStatus,
    interventionsLoaded,
    interventions.length,
    hasStarted,
    startTimestamp,
    timerStorageKey,
  ]);

  const isTimerRunning =
    activeSessionStart !== null &&
    hasStarted &&
    ticketStatus === "EN_COURS" &&
    !isFinalStatus;

  const canResumeTreatment =
    canManage &&
    hasStarted &&
    !isFinalStatus &&
    !isTimerRunning;

  /* ===================================================
     MISE À JOUR DU CHRONOMÈTRE
  =================================================== */

  useEffect(() => {
    if (!isTimerRunning) {
      return undefined;
    }

    setClockNow(Date.now());

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);

  }, [
    isTimerRunning,
    activeSessionStart,
  ]);

  const latestIntervention = getLatestIntervention(interventions);

  const elapsedMilliseconds = isTimerRunning
    ? Math.max(0, clockNow - activeSessionStart)
    : 0;

  const elapsedLabel = formatElapsedTime(
    elapsedMilliseconds
  );

  /* ===================================================
     CHARGEMENT DU TICKET
  =================================================== */

  const loadTicket = useCallback(async () => {
    const response = await api.get(`/tickets/${id}/`);

    setTicket(response.data);
  }, [id]);

  /* ===================================================
     CHARGEMENT DE L'HISTORIQUE
  =================================================== */

  const loadHistory = useCallback(async () => {
    const response = await api.get(
      `/tickets/${id}/historique/`
    );

    setHistory(normalizeList(response.data));
  }, [id]);

  /* ===================================================
     CHARGEMENT DES INTERVENTIONS
  =================================================== */

  const loadInterventions = useCallback(async () => {
    setInterventionsLoaded(false);

    try {
      const response = await api.get("/interventions/", {
        params: {
          ticket: id,
        },
      });

      const data = normalizeList(response.data);

      const related = data.filter(
        (item) =>
          interventionTicketId(item) === Number(id)
      );

      setInterventions(related);

    } catch (err) {
      setInterventions([]);

      console.error(
        "Erreur de chargement des interventions :",
        err
      );

    } finally {
      setInterventionsLoaded(true);
    }

  }, [id]);

  /* =====================================================
     CHARGEMENT GLOBAL
  ===================================================== */

  const loadData = useCallback(async () => {
    setLoading(true);

    setError("");
    setActionError("");
    setSuccess("");

    try {
      await loadTicket();

      const results = await Promise.allSettled([
        loadHistory(),
        loadInterventions(),
      ]);

      if (results[0].status === "rejected") {
        console.error(
          "Erreur de chargement de l'historique :",
          results[0].reason
        );
      }

    } catch (err) {
      console.error(
        "Erreur chargement du ticket :",
        err
      );

      if (err.response?.status === 404) {
        setError(
          "Ticket introuvable ou inaccessible avec ce compte."
        );

      } else if (err.response?.status === 403) {
        setError(
          "Vous n'avez pas la permission de consulter ce ticket."
        );

      } else {
        setError(
          getApiError(
            err,
            "Impossible de charger le ticket. Vérifiez que Django fonctionne."
          )
        );
      }

    } finally {
      setLoading(false);
    }

  }, [
    loadTicket,
    loadHistory,
    loadInterventions,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ===================================================
     DONNÉES DU TECHNICIEN
  ===================================================== */

  const technicianId = relationId(
    ticket?.technicien_id ??
    ticket?.technicien
  );

  const technicianUsername =
    ticket?.technicien_username ||
    ticket?.technicien?.username ||
    "";

  const isAssignedToCurrentTechnician =
    isTechnician &&
    (
      (
        currentUserId !== null &&
        technicianId === currentUserId
      ) ||
      (
        Boolean(user.username) &&
        Boolean(technicianUsername) &&
        String(user.username).toLowerCase().trim() ===
          String(technicianUsername).toLowerCase().trim()
      )
    );

  const hasTechnician =
    technicianId !== null ||
    Boolean(technicianUsername);

  /* ===================================================
     AUTORISATION DE PRISE EN CHARGE
  =================================================== */

  const canTakeCharge =
    canManage &&
    !hasStarted &&
    !isFinalStatus &&
    (
      isAdmin ||
      !hasTechnician ||
      isAssignedToCurrentTechnician
    );

  /* =====================================================
     PRENDRE LE TICKET
  ===================================================== */

  const handleTakeCharge = async () => {
    if (!canManage) {
      setActionError(
        "Seul l'administrateur ou le Technicien DSI peut prendre ce ticket en charge."
      );
      return;
    }

    if (!canTakeCharge) {
      setActionError(
        "Ce ticket ne peut pas être pris en charge avec ce compte."
      );
      return;
    }

    setTakingCharge(true);
    setActionError("");
    setSuccess("");

    try {
      await api.post(
        `/tickets/${id}/prendre-en-charge/`
      );

      const ticketAfterTakeCharge = await api.get(`/tickets/${id}/`);

      if (getTicketStatus(ticketAfterTakeCharge.data) !== "EN_COURS") {
        await api.patch(`/tickets/${id}/statut/`, {
          statut: "EN_COURS",
        });
      }

      localStorage.removeItem(timerStorageKey);
      setActiveSessionStart(null);
      setShowInterventionForm(false);
      setInterventionForm({ ...INITIAL_INTERVENTION });

      await loadData();

      setSuccess(
        "Ticket pris en charge. Le chronomètre de traitement a démarré."
      );

    } catch (err) {
      console.error(
        "Erreur de prise en charge :",
        err
      );

      setActionError(
        getApiError(
          err,
          "Impossible de prendre ce ticket en charge."
        )
      );

    } finally {
      setTakingCharge(false);
    }
  };

  /* ===================================================
     REPRENDRE LE TRAITEMENT
  =================================================== */

  const handleResumeTreatment = async () => {
    if (!canManage || !hasStarted || isFinalStatus) {
      setActionError(
        "Ce ticket ne peut pas être repris avec ce compte ou dans son statut actuel."
      );
      return;
    }

    setTakingCharge(true);
    setActionError("");
    setSuccess("");

    try {
      await api.patch(`/tickets/${id}/statut/`, {
        statut: "EN_COURS",
      });

      const resumedAt = Date.now();

      localStorage.setItem(
        timerStorageKey,
        String(resumedAt)
      );

      setActiveSessionStart(resumedAt);
      setClockNow(resumedAt);
      setShowInterventionForm(false);

      await loadData();

      setSuccess(
        "Traitement repris. Le chronomètre a redémarré pour cette nouvelle session."
      );

    } catch (err) {
      console.error(
        "Erreur de reprise du traitement :",
        err
      );

      setActionError(
        getApiError(
          err,
          "Impossible de reprendre le traitement du ticket."
        )
      );

    } finally {
      setTakingCharge(false);
    }
  };

  /* ===================================================
     FORMULAIRE D'INTERVENTION
  =================================================== */

  const handleInterventionChange = (event) => {
    const { name, value } = event.target;

    setInterventionForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setInterventionError("");
    setSuccess("");
  };

  /* ===================================================
     ENREGISTRER UNE INTERVENTION
  =================================================== */

  const handleSubmitIntervention = async (event) => {
    event.preventDefault();

    if (!canManage) {
      setInterventionError(
        "Seul l'administrateur ou le Technicien DSI peut enregistrer une intervention."
      );
      return;
    }

    if (!isTimerRunning || activeSessionStart === null) {
      setInterventionError(
        "Le chronomètre est en pause. Reprenez le traitement avant d'enregistrer une intervention."
      );
      return;
    }

    const resultat = normalize(interventionForm.resultat);
    const diagnostic = interventionForm.diagnostic.trim();
    const solution = interventionForm.solution.trim();

    if (!["RESOLU", "NON_RESOLU"].includes(resultat)) {
      setInterventionError(
        "Veuillez sélectionner le résultat de l'intervention : Résolu ou Non résolu."
      );
      return;
    }

    if (!diagnostic || !solution) {
      setInterventionError(
        "Veuillez remplir le diagnostic et la solution apportée."
      );
      return;
    }

    const statutFinal = getAutomaticTicketStatus(resultat);

    const description = [
      `Résultat : ${resultLabel(resultat)}`,
      `Diagnostic : ${diagnostic}`,
      `Solution : ${solution}`,
    ].join("\n\n");

    const stoppedAt = Date.now();

    const duree = Math.max(
      1,
      Math.ceil((stoppedAt - activeSessionStart) / 60000)
    );

    if (!currentUserId) {
      setInterventionError(
        "Impossible de retrouver l'identifiant de l'utilisateur connecté. Reconnectez-vous."
      );
      return;
    }

    setSavingIntervention(true);
    setInterventionError("");
    setActionError("");
    setSuccess("");

    try {
      const payload = {
        ticket: Number(id),
        technicien: currentUserId,
        date_intervention: new Date(stoppedAt).toISOString(),
        description,
        duree,
        diagnostic,
        solution,
        resultat,
        statut_final: statutFinal,
      };

      await api.post("/interventions/", payload);

      localStorage.removeItem(timerStorageKey);
      setActiveSessionStart(null);
      setClockNow(stoppedAt);

      let statusUpdated = true;

      try {
        await api.patch(`/tickets/${id}/statut/`, {
          statut: statutFinal,
        });
      } catch (statusError) {
        statusUpdated = false;

        console.error(
          "Intervention enregistrée, mais le statut du ticket n'a pas pu être actualisé :",
          statusError
        );

        setActionError(
          "L'intervention est enregistrée et le chronomètre est arrêté, mais le statut automatique du ticket n'a pas pu être mis à jour."
        );
      }

      setInterventionForm({ ...INITIAL_INTERVENTION });
      setShowInterventionForm(false);

      await Promise.allSettled([
        loadTicket(),
        loadInterventions(),
        loadHistory(),
      ]);

      setSuccess(
        `Intervention enregistrée. Durée : ${duree} minute(s). ${
          statusUpdated
            ? `Statut automatique : ${STATUS_LABELS[statutFinal] || statutFinal}.`
            : "Le statut devra être vérifié."
        }`
      );

    } catch (err) {
      console.error(
        "Erreur enregistrement intervention :",
        err
      );

      setInterventionError(
        getApiError(
          err,
          "Impossible d'enregistrer l'intervention. Vérifiez les champs attendus par l'API Django."
        )
      );

    } finally {
      setSavingIntervention(false);
    }
  };

  /* ===================================================
     CHARGEMENT EN COURS
  =================================================== */

  if (loading) {
    return (
      <div className="ticket-details-page">
        <div className="ticket-details-state">
          <RefreshCw
            className="ticket-details-spinner"
            size={24}
          />
          <p>Chargement du ticket...</p>
        </div>
      </div>
    );
  }

  /* ===================================================
     ERREUR DE CHARGEMENT
  =================================================== */

  if (error || !ticket) {
    return (
      <div className="ticket-details-page">

        <button
          className="ticket-details-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={17} />
          Retour
        </button>

        <div className="ticket-details-error">
          {error || "Ticket introuvable."}
        </div>

        <button
          className="ticket-details-refresh"
          type="button"
          onClick={loadData}
        >
          <RefreshCw size={16} />
          Réessayer
        </button>

      </div>
    );
  }

  /* ===================================================
     DONNÉES DU TICKET
  =================================================== */

  const status = getTicketStatus(ticket);
  const priority = getTicketPriority(ticket);

  const ticketNumber =
    ticket.numero ||
    ticket.numero_ticket ||
    `DSI-${String(ticket.id).padStart(5, "0")}`;

  const requester =
    ticket.demandeur_username ||
    ticket.demandeur_nom ||
    ticket.demandeur;

  const technician =
    ticket.technicien_username ||
    ticket.technicien_nom ||
    ticket.technicien;

  const createdAt =
    ticket.date_creation ||
    ticket.created_at ||
    ticket.created;

  /* ===================================================
     AFFICHAGE PRINCIPAL
  =================================================== */

  return (
    <div className="ticket-details-page">

      {/* EN-TÊTE */}

      <div className="ticket-details-header">

        <button
          className="ticket-details-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={17} />
          Retour aux tickets
        </button>

        <button
          className="ticket-details-refresh"
          type="button"
          onClick={loadData}
        >
          <RefreshCw size={16} />
          Actualiser
        </button>

      </div>

      <section className="ticket-details-title-section">

        <div>
          <p className="ticket-details-eyebrow">
            GESTION ET SUIVI
          </p>

          <h1>{ticketNumber}</h1>

          <h2>
            {ticket.objet || "Demande d'assistance"}
          </h2>
        </div>

        <span
          className={`ticket-details-badge status-${statusClass(status)}`}
        >
          {STATUS_LABELS[status] || displayValue(status)}
        </span>

      </section>

      {/* MESSAGES */}

      {actionError && (
        <div className="ticket-details-message error">
          {actionError}
        </div>
      )}

      {success && (
        <div className="ticket-details-message success">
          {success}
        </div>
      )}

      {/* INFORMATIONS GÉNÉRALES */}

      <section className="ticket-details-card">

        <h3 className="ticket-details-section-title">
          <FileText size={19} />
          Informations du ticket
        </h3>

        <div className="ticket-details-grid">

          <div className="ticket-details-item">
            <UserRound size={18} />
            <div>
              <span>Demandeur</span>
              <strong>{displayValue(requester)}</strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <UserRound size={18} />
            <div>
              <span>Technicien affecté</span>
              <strong>{displayValue(technician)}</strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <Tag size={18} />
            <div>
              <span>Catégorie</span>
              <strong>{displayValue(ticket.categorie)}</strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <Clock3 size={18} />
            <div>
              <span>Priorité</span>
              <strong>
                {PRIORITY_LABELS[priority] ||
                  displayValue(priority)}
              </strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <CalendarDays size={18} />
            <div>
              <span>Date de création</span>
              <strong>{displayDate(createdAt)}</strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <CheckCircle2 size={18} />
            <div>
              <span>Service</span>
              <strong>{displayValue(ticket.service)}</strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <CalendarDays size={18} />
            <div>
              <span>Heure de prise en charge</span>
              <strong>
                {displayDate(ticket.date_prise_en_charge)}
              </strong>
            </div>
          </div>

          <div className="ticket-details-item">
            <CalendarDays size={18} />
            <div>
              <span>Date de résolution</span>
              <strong>
                {displayDate(ticket.date_resolution)}
              </strong>
            </div>
          </div>

        </div>

        <div className="ticket-details-description">
          <h4>Description de la demande</h4>

          <p style={{ whiteSpace: "pre-line" }}>
            {ticket.description ||
              "Aucune description détaillée n'a été fournie."}
          </p>
        </div>

      </section>

      {/* TRAITEMENT DE LA DEMANDE */}

      <section className="ticket-details-card">

        <h3 className="ticket-details-section-title">
          <ClipboardCheck size={19} />
          Traitement de la demande
        </h3>

        {canTakeCharge && (
          <div className="ticket-processing-actions">

            <button
              type="button"
              className="ticket-action-button primary"
              onClick={handleTakeCharge}
              disabled={takingCharge}
            >
              <PlayCircle size={17} />

              {takingCharge
                ? "Prise en charge..."
                : "Prendre le ticket"}
            </button>

          </div>
        )}

        {hasStarted && isTimerRunning && (
          <div className="ticket-details-message success">
            <Clock3 size={18} />

            <span>
              Traitement en cours. Session démarrée le{" "}
              {displayDate(
                new Date(activeSessionStart).toISOString()
              )}.
            </span>
          </div>
        )}

        {hasStarted && !isTimerRunning && !isFinalStatus && (
          <div className="ticket-details-message">
            <Clock3 size={18} />

            <span>
              Le chronomètre est en pause. Les durées des
              interventions déjà enregistrées sont conservées.
              Reprenez le traitement pour démarrer une nouvelle session.
            </span>
          </div>
        )}

        {canResumeTreatment && (
          <div className="ticket-processing-actions">

            <button
              type="button"
              className="ticket-action-button primary"
              onClick={handleResumeTreatment}
              disabled={takingCharge}
            >
              <PlayCircle size={17} />

              {takingCharge
                ? "Reprise..."
                : "Reprendre le traitement"}
            </button>

          </div>
        )}

        {isFinalStatus && (
          <p className="ticket-details-empty">
            Ce ticket est terminé. Le chronomètre ne peut plus être démarré.
          </p>
        )}

        {!hasStarted && isAdmin && (
          <p className="ticket-details-help">
            En tant qu'administrateur, vous pouvez prendre en charge
            directement ce ticket, même sans technicien affecté.
          </p>
        )}

        {!hasStarted &&
          isTechnician &&
          hasTechnician &&
          !isAssignedToCurrentTechnician && (
            <p className="ticket-details-empty">
              Ce ticket est déjà affecté à un autre technicien.
            </p>
          )}

      </section>

      {/* FORMULAIRE D'INTERVENTION */}

      {canManage && (
        <section className="ticket-details-card ticket-intervention-section">

          <h3 className="ticket-details-section-title">
            <Wrench size={19} />
            Intervention technique
          </h3>

          <div className="ticket-form-field full ticket-session-clock">

            <label htmlFor="intervention-session-clock">
              Temps de la session de traitement
            </label>

            <input
              id="intervention-session-clock"
              type="text"
              value={
                isTimerRunning
                  ? elapsedLabel
                  : latestIntervention
                    ? `${latestIntervention.duree ?? 0} minute(s) — En pause`
                    : hasStarted
                      ? "En pause — Reprendre le traitement"
                      : "En attente de la prise en charge"
              }
              readOnly
              disabled={!isTimerRunning}
            />

          </div>

          {!isTimerRunning && !isFinalStatus && (
            <div className="ticket-details-message error ticket-intervention-notice">
              <Clock3 size={18} />
              <span>
                {hasStarted
                  ? "Le chronomètre est en pause. Cliquez sur « Reprendre le traitement » pour poursuivre l'intervention."
                  : "Vous devez d'abord cliquer sur « Prendre le ticket » pour démarrer le traitement."}
              </span>
            </div>
          )}

          {isFinalStatus && (
            <div className="ticket-details-message success ticket-intervention-notice">
              <CheckCircle2 size={18} />
              <span>
                Ce ticket est résolu ou clôturé. Aucune nouvelle intervention ne peut être enregistrée.
              </span>
            </div>
          )}

          {isTimerRunning && !isFinalStatus && (
            <div className="ticket-intervention-trigger-wrap">
              <p className="ticket-details-help">
                Lorsque votre intervention est terminée, cliquez ici pour renseigner son résultat,
                votre diagnostic et la solution appliquée.
              </p>

              <button
                type="button"
                className="ticket-action-button primary ticket-intervention-trigger"
                onClick={() => {
                  setShowInterventionForm((previous) => !previous);
                  setInterventionError("");
                }}
                disabled={savingIntervention}
                aria-expanded={showInterventionForm}
              >
                <ClipboardCheck size={17} />
                {showInterventionForm
                  ? "Masquer le formulaire"
                  : "Terminer l'intervention et saisir le résultat"}
              </button>
            </div>
          )}

          {showInterventionForm && isTimerRunning && !isFinalStatus && (
            <form
              className="ticket-intervention-form"
              onSubmit={handleSubmitIntervention}
            >

              <div className="ticket-intervention-form-intro full">
                <strong>Résultat de l'intervention</strong>
                <span>
                  Le statut du ticket sera mis à jour automatiquement selon votre réponse.
                </span>
              </div>

              {/* CHAMP 1 : RÉSULTAT */}

              <div className="ticket-form-field full">
                <label htmlFor="intervention-resultat">
                  Résultat *
                </label>

                <select
                  id="intervention-resultat"
                  name="resultat"
                  value={interventionForm.resultat}
                  onChange={handleInterventionChange}
                  required
                  disabled={!isTimerRunning || savingIntervention}
                >
                  <option value="" disabled>
                    Sélectionner le résultat
                  </option>

                  {RESULT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <small className="ticket-field-hint">
                  Résolu : le ticket passera automatiquement à « Résolue ».
                  Non résolu : le ticket retournera automatiquement à « En attente ».
                </small>
              </div>

              {/* CHAMP 2 : DIAGNOSTIC */}

              <div className="ticket-form-field full">
                <label htmlFor="intervention-diagnostic">
                  Diagnostic technique *
                </label>

                <textarea
                  id="intervention-diagnostic"
                  name="diagnostic"
                  value={interventionForm.diagnostic}
                  onChange={handleInterventionChange}
                  placeholder="Indiquez la cause du problème..."
                  rows={3}
                  required
                  disabled={!isTimerRunning || savingIntervention}
                />
              </div>

              {/* CHAMP 3 : SOLUTION */}

              <div className="ticket-form-field full">
                <label htmlFor="intervention-solution">
                  Solution apportée *
                </label>

                <textarea
                  id="intervention-solution"
                  name="solution"
                  value={interventionForm.solution}
                  onChange={handleInterventionChange}
                  placeholder="Expliquez la solution appliquée..."
                  rows={3}
                  required
                  disabled={!isTimerRunning || savingIntervention}
                />
              </div>

              {interventionError && (
                <p className="ticket-details-message error full">
                  {interventionError}
                </p>
              )}

              <div className="ticket-form-actions full">

                <button
                  type="submit"
                  className="ticket-action-button primary"
                  disabled={!isTimerRunning || savingIntervention}
                >
                  <Save size={17} />
                  {savingIntervention
                    ? "Enregistrement..."
                    : "Enregistrer le résultat"}
                </button>

                <button
                  type="button"
                  className="ticket-action-button secondary"
                  disabled={savingIntervention}
                  onClick={() => {
                    setShowInterventionForm(false);
                    setInterventionForm({ ...INITIAL_INTERVENTION });
                    setInterventionError("");
                  }}
                >
                  Annuler
                </button>

              </div>

            </form>
          )}

        </section>
      )}

      {/* HISTORIQUE DES INTERVENTIONS */}

      <section className="ticket-details-card">

        <h3 className="ticket-details-section-title">
          <Wrench size={19} />
          Historique des interventions

          <span className="ticket-details-count">
            {interventions.length}
          </span>
        </h3>

        {interventions.length === 0 ? (
          <p className="ticket-details-empty">
            Aucune intervention trouvée pour ce ticket,
            ou l'API ne permet pas encore de récupérer cette liste.
          </p>
        ) : (
          <div className="ticket-interventions-list">

            {interventions.map((item, index) => (
              <article
                className="ticket-intervention-item"
                key={item.id ?? index}
              >

                <div className="ticket-intervention-heading">

                  <strong>
                    Intervention #{item.id ?? index + 1}
                  </strong>

                  <span>
                    {displayDate(
                      getInterventionDate(item)
                    )}
                  </span>

                </div>

                <div className="ticket-intervention-meta">

                  <span>
                    <Clock3 size={14} />
                    {item.duree ?? "—"} minute(s)
                  </span>

                  <span>
                    <UserRound size={14} />
                    {displayValue(
                      item.technicien_username ||
                      item.technicien_nom ||
                      item.technicien
                    )}
                  </span>

                </div>

                {item.diagnostic && (
                  <p>
                    <strong>Diagnostic :</strong>{" "}
                    {item.diagnostic}
                  </p>
                )}

                {(item.solution_apportee || item.solution) && (
                  <p>
                    <strong>Solution :</strong>{" "}
                    {item.solution_apportee || item.solution}
                  </p>
                )}

                {item.resultat && (
                  <p>
                    <strong>Résultat :</strong>{" "}
                    {resultLabel(item.resultat)}
                  </p>
                )}

                {item.statut_final && (
                  <p>
                    <strong>Statut automatique :</strong>{" "}
                    {STATUS_LABELS[item.statut_final] ||
                      displayValue(item.statut_final)}
                  </p>
                )}

                {/* DESCRIPTION DE SECOURS SI LES CHAMPS SÉPARÉS NE SONT PAS RENVOYÉS */}

                {!item.diagnostic &&
                  !item.solution &&
                  !item.solution_apportee &&
                  !item.resultat &&
                  item.description && (
                    <p style={{ whiteSpace: "pre-line" }}>
                      {item.description}
                    </p>
                  )}

              </article>
            ))}

          </div>
        )}

      </section>

      {/* COMMENTAIRES */}

      <TicketCommentaire
        ticketId={id}
        onCommentAdded={loadHistory}
        onSuccess={setSuccess}
      />

      {/* HISTORIQUE DU TICKET */}

      <section className="ticket-details-card">

        <h3 className="ticket-details-section-title">
          <History size={19} />
          Historique du ticket
        </h3>

        {history.length === 0 ? (
          <p className="ticket-details-empty">
            Aucun historique disponible.
          </p>
        ) : (
          <div className="ticket-history-list">

            {history.map((item, index) => (
              <article
                className="ticket-history-item"
                key={item.id ?? index}
              >

                <span className="ticket-history-dot" />

                <div className="ticket-history-content">

                  <strong>
                    {displayValue(
                      item.action_label || item.action
                    )}
                  </strong>

                  <span>
                    Par {historyUser(item)} —{" "}
                    {displayDate(historyDate(item))}
                  </span>

                  {(item.ancienne_valeur ||
                    item.nouvelle_valeur) && (
                    <p>
                      {item.ancienne_valeur
                        ? `Ancienne valeur : ${item.ancienne_valeur}`
                        : ""}

                      {item.ancienne_valeur &&
                      item.nouvelle_valeur
                        ? " → "
                        : ""}

                      {item.nouvelle_valeur
                        ? `Nouvelle valeur : ${item.nouvelle_valeur}`
                        : ""}
                    </p>
                  )}

                </div>

              </article>
            ))}

          </div>
        )}

      </section>

    </div>
  );
}

export default TicketDetails;
