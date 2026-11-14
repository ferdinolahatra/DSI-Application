
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Ticket,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Eye,
  ClipboardCheck,
  Pencil,
  PlusCircle,
  X,
  CalendarDays,
  UserRound,
  Tag,
  FileText,
  Filter,
  XCircle,
  PlayCircle,
  ShieldCheck,
  LockKeyhole,
  MessageSquare,
  Send,
} from "lucide-react";

import api from "../../services/api";
import TicketForm from "./TicketForm";
import "./TicketsPage.css";

/* =====================================================
   CONSTANTES
===================================================== */

const STATUS_OPTIONS = [
  { value: "TOUS", label: "Tous les statuts" },
  { value: "NOUVELLE", label: "Nouvelle" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "EN_COURS", label: "En cours" },
  { value: "RESOLUE", label: "Résolue" },
  { value: "CLOTUREE", label: "Clôturée" },
];

const STATUS_LABELS = {
  NOUVELLE: "Nouvelle",
  NOUVEAU: "Nouveau",
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours",
  RESOLUE: "Résolue",
  RESOLU: "Résolu",
  CLOTUREE: "Clôturée",
  CLOTURE: "Clôturé",
  ANNULEE: "Annulée",
  ANNULE: "Annulé",
};

const PRIORITY_LABELS = {
  BASSE: "Basse",
  FAIBLE: "Faible",
  NORMALE: "Normale",
  MOYENNE: "Moyenne",
  HAUTE: "Haute",
  ELEVEE: "Élevée",
  URGENTE: "Urgente",
  URGENT: "Urgente",
  TRES_URGENTE: "Très urgente",
  CRITIQUE: "Critique",
};

const FINAL_TICKET_STATUSES = [
  "RESOLUE",
  "RESOLU",
  "CLOTUREE",
  "CLOTURE",
  "ANNULEE",
  "ANNULE",
];

const PROCESSING_MESSAGE =
  "Seuls l'administrateur et le Technicien DSI peuvent traiter les tickets.";

/* =====================================================
   NORMALISATION
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
      "Erreur de récupération de l'utilisateur :",
      error
    );

    return {};
  }
}

function unwrapUser(data) {
  return (
    data?.user ??
    data?.data?.user ??
    data?.data ??
    data ??
    {}
  );
}

/* =====================================================
   DROITS UTILISATEUR
===================================================== */

function isAdminUser(user) {
  return (
    user?.is_superuser === true ||
    user?.is_staff === true
  );
}

function isDsiTechnician(user) {
  const fonction = normalize(
    user?.fonction ??
    user?.user?.fonction ??
    ""
  );

  return fonction === "TECHNICIEN_DSI";
}

/* =====================================================
   LECTURE DES DONNÉES API
===================================================== */

function readTickets(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.tickets)) return data.tickets;
  if (Array.isArray(data?.interventions)) return data.interventions;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

/* =====================================================
   AFFICHAGE DES VALEURS
===================================================== */

function getText(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
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
      "—"
    );
  }

  return "—";
}

/* =====================================================
   AFFICHAGE DES PERSONNES
===================================================== */

function getPersonName(person) {
  if (!person) return "—";

  if (
    typeof person === "string" ||
    typeof person === "number"
  ) {
    return String(person);
  }

  const fullName = [
    person.first_name ?? person.prenom,
    person.last_name ?? person.nom,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    person.full_name ||
    person.nom_complet ||
    fullName ||
    person.username ||
    person.identifiant ||
    "—"
  );
}

function requester(ticket) {
  return (
    ticket.demandeur_username ||
    ticket.demandeur_nom ||
    getPersonName(
      ticket.demandeur ??
      ticket.agent ??
      ticket.utilisateur ??
      ticket.created_by ??
      ticket.createur ??
      ticket.user
    )
  );
}

function assignedTechnician(ticket) {
  return (
    ticket.technicien_username ||
    ticket.technicien_assigne_username ||
    getPersonName(
      ticket.technicien_assigne ??
      ticket.technicien ??
      ticket.assigne_a ??
      ticket.assigned_to
    )
  );
}

/* =====================================================
   RÉFÉRENCE ET OBJET DU TICKET
===================================================== */

function ticketReference(ticket) {
  return (
    ticket.reference ??
    ticket.numero_ticket ??
    ticket.numero ??
    ticket.code ??
    (
      ticket.id != null
        ? `DSI-${String(ticket.id).padStart(5, "0")}`
        : "Ticket"
    )
  );
}

function ticketTitle(ticket) {
  return (
    ticket.titre ??
    ticket.sujet ??
    ticket.objet ??
    ticket.title ??
    "Demande d'assistance"
  );
}

/* =====================================================
   STATUT
===================================================== */

function ticketStatus(ticket) {
  return normalize(
    ticket.statut?.code ??
    ticket.statut?.value ??
    ticket.statut ??
    ticket.status ??
    "INCONNU"
  );
}

function statusLabel(status) {
  return (
    STATUS_LABELS[status] ??
    status.replaceAll("_", " ")
  );
}

/* =====================================================
   PRIORITÉ
===================================================== */

function ticketPriority(ticket) {
  return normalize(
    ticket.priorite?.code ??
    ticket.priorite?.value ??
    ticket.priorite ??
    ticket.priority ??
    "NORMALE"
  );
}

function priorityLabel(priority) {
  return (
    PRIORITY_LABELS[priority] ??
    priority.replaceAll("_", " ")
  );
}

function isUrgent(ticket) {
  return [
    "URGENTE",
    "URGENT",
    "TRES_URGENTE",
    "CRITIQUE",
    "HAUTE",
    "ELEVEE",
  ].includes(ticketPriority(ticket));
}

/* =====================================================
   DATES
===================================================== */

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

function ticketDate(ticket) {
  return (
    ticket.date_creation ??
    ticket.created_at ??
    ticket.date_demande ??
    ticket.created ??
    null
  );
}

function ticketStartDate(ticket) {
  return ticket.date_prise_en_charge ?? null;
}

/* =====================================================
   CHRONOMÈTRE
===================================================== */

function interventionTicketId(intervention) {
  const value =
    intervention?.ticket_id ??
    intervention?.ticket?.id ??
    intervention?.ticket ??
    intervention?.ticket_detail?.id ??
    intervention?.ticket_detail;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id = typeof value === "object"
    ? value.id ?? value.pk
    : value;

  const number = Number(id);

  return Number.isFinite(number) ? number : null;
}

function getRecordedDurationMilliseconds(ticket, interventions) {
  const ticketId = Number(ticket?.id);

  if (!Number.isFinite(ticketId)) {
    return 0;
  }

  return interventions
    .filter(
      (item) =>
        interventionTicketId(item) === ticketId
    )
    .reduce((total, item) => {
      const minutes = Number(
        item?.duree ??
        item?.duration_minutes ??
        item?.duration ??
        0
      );

      if (
        !Number.isFinite(minutes) ||
        minutes <= 0
      ) {
        return total;
      }

      return total + minutes * 60 * 1000;
    }, 0);
}

function getTimerStorageKey(ticket) {
  return `dsi-ticket-${ticket?.id}-active-session-start`;
}

function getActiveSessionStart(ticket, interventions) {
  if (
    !ticket?.id ||
    !ticketStartDate(ticket)
  ) {
    return null;
  }

  const status = ticketStatus(ticket);

  if (
    status !== "EN_COURS" ||
    FINAL_TICKET_STATUSES.includes(status)
  ) {
    return null;
  }

  try {
    const storedStart = Number(
      localStorage.getItem(
        getTimerStorageKey(ticket)
      )
    );

    if (
      Number.isFinite(storedStart) &&
      storedStart > 0
    ) {
      return storedStart;
    }
  } catch (error) {
    console.warn(
      "Lecture du chronomètre local impossible :",
      error
    );
  }

  const hasRecordedIntervention = interventions.some(
    (item) =>
      interventionTicketId(item) === Number(ticket.id)
  );

  if (!hasRecordedIntervention) {
    const initialStart = new Date(
      ticketStartDate(ticket)
    ).getTime();

    return Number.isFinite(initialStart)
      ? initialStart
      : null;
  }

  return null;
}

function formatElapsedDuration(milliseconds) {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 0
  ) {
    return "00:00:00";
  }

  const totalSeconds = Math.floor(
    milliseconds / 1000
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

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

function getTicketTimerDisplay(ticket, interventions, now) {
  const status = ticketStatus(ticket);
  const startDate = ticketStartDate(ticket);

  if (!startDate) {
    return {
      value: "Non démarré",
      state: "not-started",
      running: false,
    };
  }

  const recordedMilliseconds =
    getRecordedDurationMilliseconds(
      ticket,
      interventions
    );

  const activeStart = getActiveSessionStart(
    ticket,
    interventions
  );

  const running = activeStart !== null;

  const elapsedMilliseconds =
    recordedMilliseconds +
    (
      running
        ? Math.max(0, now - activeStart)
        : 0
    );

  if (FINAL_TICKET_STATUSES.includes(status)) {
    return {
      value: recordedMilliseconds > 0
        ? formatElapsedDuration(recordedMilliseconds)
        : "Chronomètre arrêté",
      state: "finished",
      running: false,
    };
  }

  if (status === "EN_ATTENTE") {
    return {
      value: recordedMilliseconds > 0
        ? `${formatElapsedDuration(recordedMilliseconds)} — En pause`
        : "En pause",
      state: "paused",
      running: false,
    };
  }

  if (status === "EN_COURS") {
    if (running) {
      return {
        value: `${formatElapsedDuration(elapsedMilliseconds)} — En cours`,
        state: "running",
        running: true,
      };
    }

    return {
      value: recordedMilliseconds > 0
        ? `${formatElapsedDuration(recordedMilliseconds)} — Reprise non démarrée ici`
        : "En cours — session non synchronisée",
      state: "not-synced",
      running: false,
    };
  }

  return {
    value: recordedMilliseconds > 0
      ? formatElapsedDuration(recordedMilliseconds)
      : "Chronomètre arrêté",
    state: "stopped",
    running: false,
  };
}

/* =====================================================
   ERREURS API
===================================================== */

function getErrorMessage(error) {
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

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(" ")
          : String(messages);

        return `${field} : ${message}`;
      })
      .join(" | ");
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Connectez-vous de nouveau.";
  }

  if (error?.response?.status === 403) {
    return PROCESSING_MESSAGE;
  }

  return (
    error?.message ||
    "Une erreur est survenue. Veuillez réessayer."
  );
}

/* =====================================================
   COMPOSANT PRINCIPAL
===================================================== */

function TicketsPage() {
  const navigate = useNavigate();

  /* UTILISATEUR CONNECTÉ */

  const [currentUser, setCurrentUser] = useState(
    () => getStoredUser()
  );

  const isAdmin = isAdminUser(currentUser);
  const isTechnician = isDsiTechnician(currentUser);

  // Tous les utilisateurs peuvent créer.
  const canCreateTicket = true;

  // Seuls l'administrateur et le Technicien DSI traitent.
  const canProcessTickets = isAdmin || isTechnician;

  /* DONNÉES */

  const [tickets, setTickets] = useState([]);
  const [interventions, setInterventions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* RECHERCHE ET FILTRES */

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TOUS");
  const [priorityFilter, setPriorityFilter] = useState("TOUTES");

  /* MODALES */

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);

  /* MESSAGERIE DES TICKETS */

  const [replyTicket, setReplyTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyToComment, setReplyToComment] = useState(null);
  const [sendingComment, setSendingComment] = useState(false);

  /* ACTIONS */

  const [busyId, setBusyId] = useState(null);

  /* CHRONOMÈTRE */

  const [clockNow, setClockNow] = useState(Date.now());

  /* ===================================================
     PROFIL CONNECTÉ
===================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCurrentUser() {
      try {
        const response = await api.get("/auth/me/");

        if (mounted) {
          const user = unwrapUser(response.data);

          setCurrentUser(user);

          localStorage.setItem(
            "user",
            JSON.stringify(user)
          );
        }
      } catch (err) {
        console.warn(
          "Impossible de recharger le profil connecté :",
          err
        );
      }
    }

    loadCurrentUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* ===================================================
     CHARGEMENT DES TICKETS ET INTERVENTIONS
===================================================== */

  async function loadTickets() {
    setLoading(true);
    setError("");

    try {
      const [
        ticketResult,
        interventionResult,
      ] = await Promise.allSettled([
        api.get("/tickets/"),
        api.get("/interventions/"),
      ]);

      if (ticketResult.status === "rejected") {
        throw ticketResult.reason;
      }

      setTickets(
        readTickets(ticketResult.value.data)
      );

      if (interventionResult.status === "fulfilled") {
        setInterventions(
          readTickets(interventionResult.value.data)
        );
      } else {
        setInterventions([]);

        console.warn(
          "Impossible de récupérer les interventions :",
          interventionResult.reason
        );
      }

      setClockNow(Date.now());

    } catch (err) {
      console.error(
        "Erreur de chargement des tickets :",
        err
      );

      setTickets([]);
      setInterventions([]);

      if (err.response?.status === 401) {
        setError(
          "Votre session a expiré. Connectez-vous de nouveau."
        );
      } else if (err.response?.status === 403) {
        setError(
          "Accès refusé : votre compte ne peut pas consulter cette liste."
        );
      } else if (err.response?.status === 404) {
        setError(
          "L'adresse /api/tickets/ est introuvable. Vérifiez la route dans Django."
        );
      } else {
        setError(
          "Impossible de charger les tickets. Vérifiez que le serveur Django fonctionne."
        );
      }

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  /* ===================================================
     ACTUALISATION DU CHRONOMÈTRE
===================================================== */

  useEffect(() => {
    const hasActiveTimer = tickets.some((ticket) =>
      getActiveSessionStart(
        ticket,
        interventions
      ) !== null
    );

    if (!hasActiveTimer) {
      return undefined;
    }

    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [tickets, interventions]);

  /* ===================================================
     RECHERCHE ET FILTRES
===================================================== */

  const filteredTickets = useMemo(() => {
    const query = normalize(search);

    return tickets.filter((ticket) => {
      const searchableText = normalize(
        [
          ticketReference(ticket),
          ticketTitle(ticket),
          ticket.description,
          requester(ticket),
          assignedTechnician(ticket),
          getText(ticket.categorie ?? ticket.category),
          ticketPriority(ticket),
          ticketStatus(ticket),
          ticket.service,
        ].join(" ")
      );

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "TOUS" ||
        ticketStatus(ticket) === statusFilter;

      const matchesPriority =
        priorityFilter === "TOUTES" ||
        ticketPriority(ticket) === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tickets,
    search,
    statusFilter,
    priorityFilter,
  ]);

  /* ===================================================
     STATISTIQUES
===================================================== */

  const counts = useMemo(
    () => ({
      total: tickets.length,

      new: tickets.filter((ticket) =>
        [
          "NOUVELLE",
          "NOUVEAU",
          "EN_ATTENTE",
        ].includes(ticketStatus(ticket))
      ).length,

      progress: tickets.filter(
        (ticket) => ticketStatus(ticket) === "EN_COURS"
      ).length,

      urgent: tickets.filter(isUrgent).length,

      completed: tickets.filter((ticket) =>
        FINAL_TICKET_STATUSES.includes(
          ticketStatus(ticket)
        )
      ).length,
    }),
    [tickets]
  );

  /* ===================================================
     FILTRES
===================================================== */

  function clearFilters() {
    setSearch("");
    setStatusFilter("TOUS");
    setPriorityFilter("TOUTES");
  }

  /* ===================================================
     CRÉATION D'UN TICKET
     AUTORISÉE POUR TOUS LES UTILISATEURS
===================================================== */

  function openCreateForm() {
    setEditingTicket(null);
    setSelectedTicket(null);
    setShowTicketForm(true);
  }

  /* ===================================================
     MODIFICATION
     RÉSERVÉE À L'ADMINISTRATEUR
===================================================== */

  function openEditForm(ticket) {
    if (!isAdmin) {
      setError(
        "Seul l'administrateur peut modifier un ticket."
      );
      return;
    }

    setEditingTicket(ticket);
    setSelectedTicket(null);
    setShowTicketForm(true);
  }

  function closeTicketForm() {
    setShowTicketForm(false);
    setEditingTicket(null);
  }

  async function handleTicketSaved() {
    closeTicketForm();
    await loadTickets();

    setNotice("Le ticket a été enregistré avec succès.");
  }

  /* ===================================================
     OUVRIR LE TRAITEMENT / INTERVENTION
===================================================== */

  function openTicketProcessing(ticket) {
    if (!canProcessTickets) {
      setError(PROCESSING_MESSAGE);
      return;
    }

    if (!ticket?.id) {
      setError(
        "Impossible d'ouvrir le traitement : identifiant introuvable."
      );
      return;
    }

    setSelectedTicket(null);
    navigate(`/tickets/${ticket.id}`);
  }

  /* ===================================================
     PRENDRE UN TICKET EN CHARGE
===================================================== */

  async function takeTicket(ticket) {
    if (!canProcessTickets) {
      setError(PROCESSING_MESSAGE);
      return false;
    }

    if (!ticket?.id) {
      setError("Identifiant du ticket introuvable.");
      return false;
    }

    if (ticketStartDate(ticket)) {
      setNotice(
        `Le ticket ${ticketReference(ticket)} est déjà pris en charge.`
      );
      return false;
    }

    if (
      FINAL_TICKET_STATUSES.includes(
        ticketStatus(ticket)
      )
    ) {
      setError(
        "Un ticket déjà terminé ne peut pas être pris en charge."
      );
      return false;
    }

    setBusyId(ticket.id);
    setError("");
    setNotice("");

    try {
      await api.post(
        `/tickets/${ticket.id}/prendre-en-charge/`
      );

      setNotice(
        `Le ticket ${ticketReference(ticket)} a été pris en charge. Le chronomètre a démarré.`
      );

      await loadTickets();

      return true;

    } catch (err) {
      console.error(
        "Erreur de prise en charge :",
        err
      );

      setError(getErrorMessage(err));

      return false;

    } finally {
      setBusyId(null);
    }
  }

  /* ===================================================
     APERÇU RAPIDE
===================================================== */

  function openQuickView(ticket) {
    setSelectedTicket(ticket);
  }

  /* ===================================================
     MESSAGERIE ET RÉPONSES AUX TICKETS
===================================================== */

  async function openReplyModal(ticket) {
    if (!ticket?.id) {
      setError("Identifiant du ticket introuvable.");
      return;
    }

    setReplyTicket(ticket);
    setComments([]);
    setCommentText("");
    setReplyToComment(null);
    setCommentsLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await api.get(
        `/tickets/${ticket.id}/commentaires/`
      );

      setComments(readTickets(response.data));
    } catch (err) {
      console.error(
        "Erreur de chargement des commentaires :",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setCommentsLoading(false);
    }
  }

  function closeReplyModal() {
    setReplyTicket(null);
    setComments([]);
    setCommentText("");
    setReplyToComment(null);
  }

  async function refreshComments(ticketId) {
    const response = await api.get(
      `/tickets/${ticketId}/commentaires/`
    );

    setComments(readTickets(response.data));
  }

  async function sendComment(event) {
    event.preventDefault();

    if (!replyTicket?.id) {
      setError("Aucun ticket sélectionné.");
      return;
    }

    const contenu = commentText.trim();

    if (!contenu) {
      setError("Veuillez saisir votre message.");
      return;
    }

    setSendingComment(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        contenu,
      };

      if (replyToComment) {
        payload.reponse_a = replyToComment.id;
      }

      await api.post(
        `/tickets/${replyTicket.id}/commentaires/`,
        payload
      );

      await refreshComments(replyTicket.id);

      setCommentText("");
      setReplyToComment(null);

      setNotice(
        `Votre message a été envoyé sur le ticket ${ticketReference(replyTicket)}.`
      );

    } catch (err) {
      console.error(
        "Erreur d'envoi du commentaire :",
        err
      );

      setError(getErrorMessage(err));
    } finally {
      setSendingComment(false);
    }
  }

  function getCommentAuthor(comment) {
    return (
      comment.auteur_username ||
      comment.auteur?.username ||
      comment.auteur?.nom_complet ||
      getText(comment.auteur) ||
      "Utilisateur"
    );
  }

  function getCommentContent(comment) {
    return (
      comment.contenu ||
      comment.commentaire ||
      comment.message ||
      ""
    );
  }

  /* ===================================================
     RENDU
===================================================== */

  return (
    <main className="tickets-page">

      {/* EN-TÊTE */}

      <header className="tickets-header">

        <div>
          <div className="tickets-eyebrow">
            <ShieldCheck size={15} />
            ESPACE GESTION DSI
          </div>

          <h1>Gestion des tickets</h1>

          <p>
            Consultez vos demandes, créez des tickets et
            suivez leur évolution au sein de la DSI.
          </p>
        </div>

        <div className="tickets-header-actions">

          {canCreateTicket && (
            <button
              type="button"
              className="tickets-create-button"
              onClick={openCreateForm}
            >
              <PlusCircle size={17} />
              Nouveau ticket
            </button>
          )}

          <button
            type="button"
            className="tickets-refresh"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading ? "tickets-spinning" : ""
              }
            />
            Actualiser
          </button>

        </div>
      </header>

      {/* PANNEAU DES DROITS D'ACCÈS */}

      {!canProcessTickets && (
        <section
          className="tickets-access-card"
          aria-label="Informations sur les droits d'accès"
        >
          <div className="tickets-access-icon">
            <LockKeyhole size={25} strokeWidth={1.8} />
            <span className="tickets-access-icon-pulse" />
          </div>

          <div className="tickets-access-content">

            <div className="tickets-access-heading">

              <div>
                <span className="tickets-access-eyebrow">
                  INFORMATIONS SUR VOTRE COMPTE
                </span>

                <h3>Accès et autorisations</h3>
              </div>

              <span className="tickets-access-badge">
                <ShieldCheck size={13} />
                Accès utilisateur
              </span>

            </div>

            <div className="tickets-access-separator" />

            <div className="tickets-access-permissions">

              <div className="tickets-access-permission">
                <span className="tickets-access-check">
                  <CheckCircle2 size={17} />
                </span>

                <p>
                  Vous pouvez <strong>créer des tickets</strong> et
                  <strong> consulter vos propres demandes</strong>.
                </p>
              </div>

              <div className="tickets-access-permission">
                <span className="tickets-access-lock">
                  <LockKeyhole size={16} />
                </span>

                <p>
                  <strong>Traitement réservé</strong> à l'administrateur
                  et au Technicien DSI.
                </p>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* MESSAGES */}

      {error && (
        <div className="tickets-alert">
          <XCircle size={20} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => {
              setError("");
              loadTickets();
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      {notice && (
        <div className="tickets-alert">
          <CheckCircle2 size={20} />

          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
          >
            Fermer
          </button>
        </div>
      )}

      {/* STATISTIQUES */}

      <section className="tickets-summary">

        <article className="tickets-summary-card">
          <div className="tickets-summary-icon blue">
            <Ticket size={20} />
          </div>

          <div>
            <span>Total des tickets</span>
            <strong>
              {loading ? "…" : counts.total}
            </strong>
          </div>
        </article>

        <article className="tickets-summary-card">
          <div className="tickets-summary-icon cyan">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Nouvelles demandes</span>
            <strong>
              {loading ? "…" : counts.new}
            </strong>
          </div>
        </article>

        <article className="tickets-summary-card">
          <div className="tickets-summary-icon purple">
            <RefreshCw size={20} />
          </div>

          <div>
            <span>En cours</span>
            <strong>
              {loading ? "…" : counts.progress}
            </strong>
          </div>
        </article>

        <article className="tickets-summary-card">
          <div className="tickets-summary-icon red">
            <AlertTriangle size={20} />
          </div>

          <div>
            <span>Priorité élevée</span>
            <strong>
              {loading ? "…" : counts.urgent}
            </strong>
          </div>
        </article>

        <article className="tickets-summary-card">
          <div className="tickets-summary-icon green">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Tickets terminés</span>
            <strong>
              {loading ? "…" : counts.completed}
            </strong>
          </div>
        </article>

      </section>

      {/* LISTE DES TICKETS */}

      <section className="tickets-list-panel">

        <div className="tickets-list-heading">

          <div>
            <h2>Liste des demandes</h2>

            <p>
              {loading
                ? "Chargement des données…"
                : `${filteredTickets.length} résultat(s) affiché(s) sur ${tickets.length}`}
            </p>
          </div>

          <span className="tickets-api-indicator">
            <span />
            API Django
          </span>

        </div>

        {/* RECHERCHE ET FILTRES */}

        <div className="tickets-filters">

          <label className="tickets-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un ticket, un agent, un technicien..."
              aria-label="Rechercher un ticket"
            />
          </label>

          <label className="tickets-select-wrap">
            <Filter size={16} />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filtrer par statut"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="tickets-select-wrap">
            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
              aria-label="Filtrer par priorité"
            >
              <option value="TOUTES">
                Toutes les priorités
              </option>

              <option value="FAIBLE">Faible</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="URGENTE">Urgente</option>
              <option value="TRES_URGENTE">Très urgente</option>
              <option value="BASSE">Basse</option>
              <option value="NORMALE">Normale</option>
              <option value="HAUTE">Haute</option>
              <option value="ELEVEE">Élevée</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </label>

          <button
            type="button"
            className="tickets-clear-filters"
            onClick={clearFilters}
          >
            Effacer
          </button>

        </div>

        {/* TABLEAU */}

        <div className="tickets-table-wrap">

          <table className="tickets-table">

            <thead>
              <tr>
                <th>Référence / demande</th>
                <th>Demandeur</th>
                <th>Priorité</th>
                <th>Statut</th>
                <th>Création</th>
                <th>Technicien</th>
                <th>Prise en charge</th>
                <th aria-label="Actions">Actions</th>
              </tr>
            </thead>

            <tbody>

              {!loading &&
                !error &&
                filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan="8">

                      <div className="tickets-empty">
                        <Ticket size={30} />

                        <strong>
                          Aucun ticket à afficher
                        </strong>

                        <span>
                          Aucune demande ne correspond aux
                          filtres actuels, ou aucune demande
                          n'a encore été enregistrée.
                        </span>

                        <button
                          type="button"
                          className="tickets-create-button"
                          onClick={openCreateForm}
                        >
                          <PlusCircle size={16} />
                          Créer un ticket
                        </button>
                      </div>

                    </td>
                  </tr>
                )}

              {filteredTickets.map((ticket) => {
                const status = ticketStatus(ticket);
                const priority = ticketPriority(ticket);
                const startDate = ticketStartDate(ticket);

                const isFinal =
                  FINAL_TICKET_STATUSES.includes(status);

                return (
                  <tr
                    key={
                      ticket.id ??
                      ticketReference(ticket)
                    }
                  >

                    <td>
                      <div className="ticket-main-cell">
                        <strong>
                          {ticketReference(ticket)}
                        </strong>

                        <span>
                          {ticketTitle(ticket)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="ticket-person">
                        <UserRound size={15} />

                        <span>
                          {requester(ticket)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`ticket-priority priority-${priority.toLowerCase()}`}
                      >
                        <span />
                        {priorityLabel(priority)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`ticket-status status-${status.toLowerCase()}`}
                      >
                        {statusLabel(status)}
                      </span>
                    </td>

                    <td className="ticket-date">
                      {formatDate(ticketDate(ticket))}
                    </td>

                    <td className="ticket-technician">
                      {assignedTechnician(ticket)}
                    </td>

                    <td>
                      {(() => {
                        const timer = getTicketTimerDisplay(
                          ticket,
                          interventions,
                          clockNow
                        );

                        return (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "6px",
                              minWidth: "150px",
                            }}
                          >
                            {startDate && (
                              <span
                                style={{
                                  display: "block",
                                  color: "#cbd5e1",
                                  fontSize: "12px",
                                  lineHeight: 1.4,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <strong
                                  style={{ color: "#94a3b8" }}
                                >
                                  Début :
                                </strong>{" "}
                                {formatDateTime(startDate)}
                              </span>
                            )}

                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color:
                                  timer.state === "running"
                                    ? "#34d399"
                                    : timer.state === "finished"
                                      ? "#94a3b8"
                                      : timer.state === "paused"
                                        ? "#fbbf24"
                                        : "#94a3b8",
                                fontSize: "12px",
                                fontWeight: 700,
                                lineHeight: 1.5,
                              }}
                            >
                              <Clock3 size={13} />
                              <span>{timer.value}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* ACTIONS */}

                    <td>
                      <div className="ticket-row-actions">

                        {/* APERÇU RAPIDE */}

                        <button
                          type="button"
                          className="ticket-view-button"
                          onClick={() =>
                            openQuickView(ticket)
                          }
                          aria-label={`Voir ${ticketReference(ticket)}`}
                          title="Aperçu rapide"
                        >
                          <Eye size={17} />
                        </button>

                        {/* RÉPONDRE : TOUS LES UTILISATEURS */}

                        <button
                          type="button"
                          onClick={() =>
                            openReplyModal(ticket)
                          }
                          title="Voir les commentaires et répondre"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            border: "1px solid #0d9488",
                            borderRadius: "8px",
                            padding: "7px 9px",
                            background: "#134e4a",
                            color: "#ccfbf1",
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                          }}
                        >
                          <MessageSquare size={14} />
                          Répondre
                        </button>

                        {/* ACTIONS ADMINISTRATEUR ET TECHNICIEN */}

                        {canProcessTickets && (
                          <>
                            {!startDate && !isFinal && (
                              <button
                                type="button"
                                onClick={() =>
                                  takeTicket(ticket)
                                }
                                disabled={busyId === ticket.id}
                                title="Prendre en charge le ticket"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "5px",
                                  border: "1px solid #0284c7",
                                  borderRadius: "8px",
                                  padding: "7px 9px",
                                  background: "#0c4a6e",
                                  color: "#e0f2fe",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  cursor: busyId === ticket.id
                                    ? "wait"
                                    : "pointer",
                                  opacity: busyId === ticket.id
                                    ? 0.7
                                    : 1,
                                }}
                              >
                                {busyId === ticket.id ? (
                                  <RefreshCw
                                    size={14}
                                    className="tickets-spinning"
                                  />
                                ) : (
                                  <PlayCircle size={14} />
                                )}

                                Prendre
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                openTicketProcessing(ticket)
                              }
                              disabled={!ticket.id}
                              title="Ouvrir la page des interventions"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "5px",
                                border: "1px solid #0284c7",
                                borderRadius: "8px",
                                padding: "7px 9px",
                                background: "#0369a1",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                              }}
                            >
                              <ClipboardCheck size={14} />
                              Intervention
                            </button>
                          </>
                        )}

                        {/* MODIFICATION ADMINISTRATEUR */}

                        {isAdmin && (
                          <button
                            type="button"
                            className="ticket-edit-button"
                            onClick={() =>
                              openEditForm(ticket)
                            }
                            aria-label={`Modifier ${ticketReference(ticket)}`}
                            title="Modifier le ticket"
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {/* INFORMATION POUR LES AUTRES UTILISATEURS */}

                        {!canProcessTickets && (
                          <button
                            type="button"
                            disabled
                            title={PROCESSING_MESSAGE}
                            style={{
                              border: "1px solid #64748b",
                              borderRadius: "8px",
                              padding: "7px 9px",
                              background: "#334155",
                              color: "#cbd5e1",
                              fontSize: "11px",
                              cursor: "not-allowed",
                              opacity: 0.7,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Traitement réservé
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}

            </tbody>
          </table>

          {loading && (
            <div className="tickets-loading">
              <RefreshCw
                size={19}
                className="tickets-spinning"
              />

              Chargement des tickets…
            </div>
          )}

        </div>
      </section>

      {/* ===================================================
          APERÇU RAPIDE
      =================================================== */}

      {selectedTicket && (
        <div
          className="ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTicket(null);
            }
          }}
        >
          <section
            className="ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-modal-title"
          >

            <header className="ticket-modal-header">

              <div>
                <span className="tickets-eyebrow">
                  <FileText size={14} />
                  DÉTAIL DE LA DEMANDE
                </span>

                <h2 id="ticket-modal-title">
                  {ticketReference(selectedTicket)}
                </h2>
              </div>

              <button
                type="button"
                className="ticket-modal-close"
                onClick={() => setSelectedTicket(null)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>

            </header>

            <div className="ticket-modal-body">

              <h3>
                {ticketTitle(selectedTicket)}
              </h3>

              <div className="ticket-modal-badges">

                <span
                  className={`ticket-status status-${ticketStatus(selectedTicket).toLowerCase()}`}
                >
                  {statusLabel(
                    ticketStatus(selectedTicket)
                  )}
                </span>

                <span
                  className={`ticket-priority priority-${ticketPriority(selectedTicket).toLowerCase()}`}
                >
                  <span />

                  {priorityLabel(
                    ticketPriority(selectedTicket)
                  )}
                </span>

              </div>

              <div className="ticket-detail-grid">

                <div className="ticket-detail-item">
                  <UserRound size={17} />

                  <div>
                    <span>Demandeur</span>

                    <strong>
                      {requester(selectedTicket)}
                    </strong>
                  </div>
                </div>

                <div className="ticket-detail-item">
                  <CheckCircle2 size={17} />

                  <div>
                    <span>Technicien assigné</span>

                    <strong>
                      {assignedTechnician(selectedTicket)}
                    </strong>
                  </div>
                </div>

                <div className="ticket-detail-item">
                  <Tag size={17} />

                  <div>
                    <span>Catégorie</span>

                    <strong>
                      {getText(
                        selectedTicket.categorie ??
                        selectedTicket.category
                      )}
                    </strong>
                  </div>
                </div>

                <div className="ticket-detail-item">
                  <CalendarDays size={17} />

                  <div>
                    <span>Date de création</span>

                    <strong>
                      {formatDateTime(
                        ticketDate(selectedTicket)
                      )}
                    </strong>
                  </div>
                </div>

                <div className="ticket-detail-item">
                  <Clock3 size={17} />

                  <div>
                    <span>Prise en charge</span>

                    <strong>
                      {formatDateTime(
                        ticketStartDate(selectedTicket)
                      )}
                    </strong>
                  </div>
                </div>

                <div className="ticket-detail-item">
                  <FileText size={17} />

                  <div>
                    <span>Service</span>

                    <strong>
                      {getText(selectedTicket.service)}
                    </strong>
                  </div>
                </div>

              </div>

              <div className="ticket-description">
                <h4>Description de la demande</h4>

                <p style={{ whiteSpace: "pre-line" }}>
                  {selectedTicket.description ||
                    selectedTicket.details ||
                    selectedTicket.message ||
                    "Aucune description n'a été fournie."}
                </p>
              </div>

              {/* ACTIONS ADMINISTRATEUR ET TECHNICIEN */}

              {canProcessTickets && (
                <div
                  className="ticket-modal-edit-action"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >

                  {!ticketStartDate(selectedTicket) &&
                    !FINAL_TICKET_STATUSES.includes(
                      ticketStatus(selectedTicket)
                    ) && (
                      <button
                        type="button"
                        className="tickets-create-button"
                        onClick={async () => {
                          const succeeded = await takeTicket(
                            selectedTicket
                          );

                          if (succeeded) {
                            setSelectedTicket(null);
                          }
                        }}
                        disabled={busyId === selectedTicket.id}
                      >
                        <PlayCircle size={16} />
                        Prendre le ticket
                      </button>
                    )}

                  <button
                    type="button"
                    className="tickets-create-button"
                    onClick={() =>
                      openTicketProcessing(selectedTicket)
                    }
                    disabled={!selectedTicket.id}
                  >
                    <ClipboardCheck size={16} />
                    Intervention
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="tickets-create-button"
                      onClick={() =>
                        openEditForm(selectedTicket)
                      }
                    >
                      <Pencil size={16} />
                      Modifier ce ticket
                    </button>
                  )}

                </div>
              )}

            </div>

            <footer className="ticket-modal-footer">
              <button
                type="button"
                className="tickets-modal-done"
                onClick={() => setSelectedTicket(null)}
              >
                Fermer
              </button>
            </footer>

          </section>
        </div>
      )}

      {/* ===================================================
          MESSAGERIE ET RÉPONSES
      =================================================== */}

      {replyTicket && (
        <div
          className="ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReplyModal();
            }
          }}
        >
          <section
            className="ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-reply-title"
            style={{
              maxWidth: "700px",
              width: "95%",
            }}
          >

            <header className="ticket-modal-header">

              <div>
                <span className="tickets-eyebrow">
                  <MessageSquare size={14} />
                  MESSAGERIE DU TICKET
                </span>

                <h2 id="ticket-reply-title">
                  {ticketReference(replyTicket)}
                </h2>

                <p>{ticketTitle(replyTicket)}</p>
              </div>

              <button
                type="button"
                className="ticket-modal-close"
                onClick={closeReplyModal}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>

            </header>

            <div className="ticket-modal-body">

              <h3>Commentaires et réponses</h3>

              {/* HISTORIQUE DES COMMENTAIRES */}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxHeight: "350px",
                  overflowY: "auto",
                  padding: "12px 0",
                }}
              >

                {commentsLoading ? (
                  <div className="tickets-loading">
                    <RefreshCw
                      size={18}
                      className="tickets-spinning"
                    />

                    Chargement des commentaires...
                  </div>
                ) : comments.length === 0 ? (
                  <div className="tickets-empty">
                    <MessageSquare size={28} />

                    <strong>Aucun commentaire</strong>

                    <span>
                      Soyez le premier à envoyer un message sur ce ticket.
                    </span>
                  </div>
                ) : (
                  comments
                    .filter((comment) => !comment.reponse_a)
                    .map((comment) => {
                      const replies = comments.filter(
                        (item) =>
                          Number(item.reponse_a) ===
                          Number(comment.id)
                      );

                      return (
                        <article
                          key={comment.id}
                          style={{
                            padding: "14px",
                            border: "1px solid #334155",
                            borderRadius: "10px",
                            background: "#172033",
                          }}
                        >

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginBottom: "9px",
                            }}
                          >
                            <strong
                              style={{ color: "#7dd3fc" }}
                            >
                              <UserRound
                                size={14}
                                style={{
                                  display: "inline",
                                  marginRight: "5px",
                                  verticalAlign: "middle",
                                }}
                              />

                              {getCommentAuthor(comment)}
                            </strong>

                            <span
                              style={{
                                color: "#94a3b8",
                                fontSize: "12px",
                              }}
                            >
                              {formatDateTime(comment.date_creation)}
                            </span>
                          </div>

                          <p
                            style={{
                              whiteSpace: "pre-line",
                              overflowWrap: "anywhere",
                              color: "#e2e8f0",
                              margin: 0,
                            }}
                          >
                            {getCommentContent(comment)}
                          </p>

                          {/* RÉPONDRE À UN COMMENTAIRE */}

                          <button
                            type="button"
                            onClick={() => {
                              setReplyToComment(comment);
                              setCommentText("");
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              marginTop: "12px",
                              padding: "7px 10px",
                              border: "1px solid #0d9488",
                              borderRadius: "7px",
                              background: "#134e4a",
                              color: "#ccfbf1",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            <MessageSquare size={14} />
                            Répondre à ce commentaire
                          </button>

                          {/* RÉPONSES EXISTANTES */}

                          {replies.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "9px",
                                marginTop: "13px",
                                marginLeft: "15px",
                                paddingLeft: "12px",
                                borderLeft: "2px solid #0d9488",
                              }}
                            >

                              {replies.map((reply) => (
                                <div
                                  key={reply.id}
                                  style={{
                                    padding: "11px",
                                    borderRadius: "8px",
                                    background: "#0f172a",
                                  }}
                                >

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      flexWrap: "wrap",
                                      gap: "6px",
                                      marginBottom: "7px",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: "#5eead4",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {getCommentAuthor(reply)}
                                    </strong>

                                    <span
                                      style={{
                                        color: "#94a3b8",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {formatDateTime(reply.date_creation)}
                                    </span>
                                  </div>

                                  <p
                                    style={{
                                      whiteSpace: "pre-line",
                                      overflowWrap: "anywhere",
                                      color: "#cbd5e1",
                                      margin: 0,
                                      fontSize: "13px",
                                    }}
                                  >
                                    {getCommentContent(reply)}
                                  </p>

                                </div>
                              ))}

                            </div>
                          )}

                        </article>
                      );
                    })
                )}

              </div>

              {/* FORMULAIRE DE RÉPONSE */}

              <form
                onSubmit={sendComment}
                style={{
                  marginTop: "18px",
                  paddingTop: "15px",
                  borderTop: "1px solid #334155",
                }}
              >

                {replyToComment && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "8px",
                      background: "#134e4a",
                      color: "#ccfbf1",
                      fontSize: "12px",
                    }}
                  >
                    <span>
                      Réponse à {getCommentAuthor(replyToComment)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setReplyToComment(null)}
                      style={{
                        border: 0,
                        background: "transparent",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <label
                  htmlFor="ticket-comment-message"
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: 700,
                    color: "#e2e8f0",
                  }}
                >
                  Votre message
                </label>

                <textarea
                  id="ticket-comment-message"
                  value={commentText}
                  onChange={(event) =>
                    setCommentText(event.target.value)
                  }
                  placeholder="Écrivez votre commentaire ou votre réponse..."
                  rows={4}
                  required
                  disabled={sendingComment || commentsLoading}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    padding: "12px",
                    border: "1px solid #475569",
                    borderRadius: "9px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "12px",
                    flexWrap: "wrap",
                  }}
                >

                  <button
                    type="button"
                    className="tickets-modal-done"
                    onClick={closeReplyModal}
                    disabled={sendingComment}
                  >
                    Fermer
                  </button>

                  <button
                    type="submit"
                    disabled={
                      sendingComment ||
                      commentsLoading ||
                      !commentText.trim()
                    }
                    className="tickets-create-button"
                  >
                    {sendingComment ? (
                      <RefreshCw
                        size={16}
                        className="tickets-spinning"
                      />
                    ) : (
                      <Send size={16} />
                    )}

                    {sendingComment ? "Envoi..." : "Envoyer"}
                  </button>

                </div>

              </form>

            </div>
          </section>
        </div>
      )}

      {/* ===================================================
          FORMULAIRE DE TICKET
          CRÉATION POUR TOUS
          MODIFICATION POUR ADMIN SEULEMENT
      =================================================== */}

      {showTicketForm && (
        <TicketForm
          ticket={editingTicket}
          onClose={closeTicketForm}
          onSaved={handleTicketSaved}
        />
      )}

    </main>
  );
}

export default TicketsPage;
