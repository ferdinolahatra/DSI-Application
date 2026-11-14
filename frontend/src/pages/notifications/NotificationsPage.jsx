import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  Inbox,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Ticket,
  FileText,
  Megaphone,
  Wrench,
  UserRound,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CircleCheck,
  CircleX,
} from "lucide-react";

import api from "../../services/api";
import "./NotificationsPage.css";

/* =====================================================
   LECTURE DES LISTES API
===================================================== */

function getNotificationList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.notifications)) {
    return data.notifications;
  }

  return [];
}

function getDataList(data, key) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  return [];
}

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
   IDENTIFIANT D'UNE RELATION
===================================================== */

function getRelationId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "object") {
    const id = value.id ?? value.pk;

    if (id === undefined || id === null) {
      return null;
    }

    const number = Number(id);

    return Number.isFinite(number) ? number : null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

/* =====================================================
   AFFICHAGE DES PERSONNES
===================================================== */

function getPersonName(person, fallback = "Non renseigné") {
  if (
    person === null ||
    person === undefined ||
    person === ""
  ) {
    return fallback;
  }

  if (typeof person === "string") {
    return person;
  }

  if (typeof person === "number") {
    return fallback;
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
    person.name ||
    fallback
  );
}

/* =====================================================
   STATUT DE LECTURE
===================================================== */

function isNotificationRead(notification) {
  return Boolean(
    notification?.lue ??
    notification?.is_read ??
    notification?.est_lue ??
    notification?.lu ??
    false
  );
}

/* =====================================================
   TYPE DE NOTIFICATION
===================================================== */

function getTypeLabel(type) {
  const labels = {
    TICKET: "Ticket",
    NOUVEAU_TICKET: "Nouveau ticket",
    COMMENTAIRE: "Commentaire",
    INTERVENTION: "Intervention",
    STATUT: "Changement de statut",
    ANNONCE: "Annonce",
    DOCUMENT: "Document",
    SYSTEME: "Système",
    AFFECTATION: "Affectation",
  };

  if (!type) return "Notification";

  const value = normalize(type);

  return (
    labels[value] ||
    String(type).replaceAll("_", " ")
  );
}

function getTypeIcon(type) {
  const value = normalize(type);

  if (value.includes("TICKET")) return Ticket;
  if (value.includes("COMMENTAIRE")) return MessageSquare;
  if (value.includes("INTERVENTION")) return Wrench;
  if (value.includes("ANNONCE")) return Megaphone;
  if (value.includes("DOCUMENT")) return FileText;

  return Bell;
}

/* =====================================================
   TITRE ET MESSAGE
===================================================== */

function getNotificationTitle(notification) {
  return (
    notification?.titre ||
    notification?.objet ||
    notification?.title ||
    getTypeLabel(notification?.type)
  );
}

function getNotificationMessage(notification) {
  return (
    notification?.message ||
    notification?.contenu ||
    notification?.description ||
    notification?.texte ||
    notification?.detail ||
    "Vous avez reçu une nouvelle notification."
  );
}

/* =====================================================
   DATE
===================================================== */

function getNotificationDateValue(notification) {
  return (
    notification?.date_creation ||
    notification?.created_at ||
    notification?.date ||
    notification?.created ||
    null
  );
}

function getNotificationDate(notification) {
  const value = getNotificationDateValue(notification);

  if (!value) return "Date non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non disponible";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =====================================================
   IDENTIFICATION DU TICKET ASSOCIÉ
===================================================== */

function getNotificationTicketId(notification) {
  const directId =
    notification?.ticket_id ??
    notification?.ticket?.id ??
    notification?.ticket?.pk ??
    notification?.related_ticket?.id ??
    notification?.related_ticket_id;

  const relationId = getRelationId(directId);

  if (relationId !== null) {
    return relationId;
  }

  const entityType = normalize(
    notification?.entity_type ??
    notification?.entity ??
    ""
  );

  if (
    entityType.includes("TICKET") ||
    entityType === "DEMANDE"
  ) {
    return getRelationId(
      notification?.entity_id ??
      notification?.object_id ??
      notification?.related_object_id
    );
  }

  return null;
}

/* =====================================================
   NUMÉRO DU TICKET DEPUIS LA NOTIFICATION
===================================================== */

function getTicketReference(notification) {
  const text = [
    notification?.titre,
    notification?.title,
    notification?.objet,
    notification?.message,
    notification?.contenu,
    notification?.description,
  ]
    .filter(Boolean)
    .join(" ");

  const match = text.match(/DSI-\d+/i);

  return match
    ? match[0].toUpperCase()
    : null;
}

/* =====================================================
   RECHERCHE DU TICKET ASSOCIÉ
===================================================== */

function findRelatedTicket(notification, tickets) {
  const ticketId = getNotificationTicketId(notification);

  if (ticketId !== null) {
    const ticket = tickets.find(
      (item) => Number(item.id) === ticketId
    );

    if (ticket) return ticket;
  }

  const reference = getTicketReference(notification);

  if (reference) {
    const ticket = tickets.find((item) => {
      const number =
        item.numero ||
        item.numero_ticket ||
        item.reference ||
        "";

      return String(number).toUpperCase() === reference;
    });

    if (ticket) return ticket;
  }

  if (
    notification?.ticket &&
    typeof notification.ticket === "object"
  ) {
    return notification.ticket;
  }

  if (
    notification?.related_ticket &&
    typeof notification.related_ticket === "object"
  ) {
    return notification.related_ticket;
  }

  return null;
}

/* =====================================================
   RELATION INTERVENTION / TICKET
===================================================== */

function getInterventionTicketId(intervention) {
  return getRelationId(
    intervention?.ticket_id ??
    intervention?.ticket?.id ??
    intervention?.ticket?.pk ??
    intervention?.ticket ??
    intervention?.ticket_detail?.id ??
    intervention?.ticket_detail
  );
}

/* =====================================================
   DATE DE L'INTERVENTION
===================================================== */

function getInterventionDate(intervention) {
  return (
    intervention?.date_intervention ||
    intervention?.date_creation ||
    intervention?.created_at ||
    intervention?.date ||
    null
  );
}

/* =====================================================
   DERNIÈRE INTERVENTION
===================================================== */

function getLatestIntervention(ticket, interventions) {
  if (!ticket?.id) return null;

  const related = interventions.filter(
    (item) =>
      getInterventionTicketId(item) === Number(ticket.id)
  );

  if (related.length === 0) return null;

  return [...related].sort((a, b) => {
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
   TECHNICIEN QUI A PRIS LE TICKET

   Le ticket constitue la source principale :
   Django met ticket.technicien à jour lors de
   prendre_en_charge().
===================================================== */

function getTicketTechnician(ticket, intervention) {
  const technician =
    ticket?.technicien ||
    ticket?.technicien_detail ||
    intervention?.technicien ||
    intervention?.technicien_detail ||
    null;

  const technicianUsername =
    ticket?.technicien_username ||
    ticket?.technicien_assigne_username ||
    intervention?.technicien_username ||
    intervention?.technicien_nom ||
    null;

  if (technicianUsername) {
    return getPersonName(technicianUsername);
  }

  if (technician) {
    const name = getPersonName(technician, "");

    if (name) return name;
  }

  if (
    ticket?.technicien_id ||
    intervention?.technicien_id
  ) {
    return "Technicien identifié";
  }

  return "Pas encore pris en charge";
}

/* =====================================================
   SERVICE
===================================================== */

function getTicketService(ticket, notification) {
  return (
    ticket?.service ||
    ticket?.direction ||
    notification?.service ||
    notification?.direction ||
    "Non renseigné"
  );
}

/* =====================================================
   RÉSOLUTION

   Le résultat est lu dans l'intervention.
===================================================== */

function getResolution(intervention, notification) {
  const result = normalize(
    intervention?.resultat ??
    notification?.resultat ??
    ""
  );

  if (result === "RESOLU") {
    return {
      label: "Résolu",
      type: "resolved",
    };
  }

  if (result === "NON_RESOLU") {
    return {
      label: "Non résolu",
      type: "unresolved",
    };
  }

  // Compatibilité avec les anciennes interventions.
  if (result === "PARTIEL") {
    return {
      label: "Partiellement résolu",
      type: "partial",
    };
  }

  return {
    label: "Non renseigné",
    type: "pending",
  };
}

/* =====================================================
   OBSERVATION

   Diagnostic et solution issus de l'intervention.
===================================================== */

function getObservation(intervention, notification) {
  const diagnostic =
    intervention?.diagnostic ||
    intervention?.observation ||
    notification?.observation ||
    "";

  const solution =
    intervention?.solution ||
    intervention?.solution_apportee ||
    "";

  const description =
    intervention?.description ||
    "";

  return {
    diagnostic:
      diagnostic ||
      description ||
      "Aucune observation enregistrée",

    solution: solution || "",
  };
}

/* =====================================================
   ERREURS API
===================================================== */

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const value = Array.isArray(messages)
          ? messages.join(" ")
          : String(messages);

        return `${field} : ${value}`;
      })
      .join(" | ");
  }

  if (error?.response?.status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (error?.response?.status === 403) {
    return "Vous n'avez pas l'autorisation d'accéder à ces données.";
  }

  return "Une erreur est survenue. Vérifiez la connexion avec le serveur.";
}

/* =====================================================
   PAGE NOTIFICATIONS
===================================================== */

function NotificationsPage() {
  /* ---------------------------------------------------
     DONNÉES
  --------------------------------------------------- */

  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [interventions, setInterventions] = useState([]);

  /* ---------------------------------------------------
     FILTRES
  --------------------------------------------------- */

  const [filter, setFilter] = useState("TOUTES");
  const [search, setSearch] = useState("");

  /* ---------------------------------------------------
     PAGINATION
  --------------------------------------------------- */

  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 10;

  /* ---------------------------------------------------
     ÉTATS
  --------------------------------------------------- */

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState("");
  const [dataWarning, setDataWarning] = useState("");

  /* ===================================================
     CHARGEMENT DES DONNÉES
  =================================================== */

  const loadNotifications = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setDataWarning("");

      try {
        const results = await Promise.allSettled([
          api.get("notifications/"),
          api.get("tickets/"),
          api.get("interventions/"),
        ]);

        /* NOTIFICATIONS */

        if (results[0].status === "rejected") {
          throw results[0].reason;
        }

        setNotifications(
          getNotificationList(results[0].value.data)
        );

        /* TICKETS */

        if (results[1].status === "fulfilled") {
          setTickets(
            getDataList(
              results[1].value.data,
              "tickets"
            )
          );
        } else {
          setTickets([]);

          console.warn(
            "Impossible de charger les tickets :",
            results[1].reason
          );
        }

        /* INTERVENTIONS */

        if (results[2].status === "fulfilled") {
          setInterventions(
            getDataList(
              results[2].value.data,
              "interventions"
            )
          );
        } else {
          setInterventions([]);

          console.warn(
            "Impossible de charger les interventions :",
            results[2].reason
          );
        }

        if (
          results[1].status === "rejected" ||
          results[2].status === "rejected"
        ) {
          setDataWarning(
            "Certaines informations de suivi sont indisponibles. Vérifiez les autorisations des API tickets et interventions."
          );
        }

      } catch (err) {
        console.error(
          "Erreur chargement notifications :",
          err
        );

        setError(
          getApiErrorMessage(err)
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* ===================================================
     ACTUALISATION AUTOMATIQUE
  =================================================== */

  useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(() => {
      loadNotifications(true);
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  /* ===================================================
     COMPTEURS
  =================================================== */

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (item) => !isNotificationRead(item)
      ).length,
    [notifications]
  );

  const readCount =
    notifications.length - unreadCount;

  /* ===================================================
     ASSOCIATION NOTIFICATION / TICKET / INTERVENTION
  =================================================== */

  const enrichedNotifications = useMemo(() => {
    return notifications.map((notification) => {
      const ticket = findRelatedTicket(
        notification,
        tickets
      );

      const intervention = getLatestIntervention(
        ticket,
        interventions
      );

      return {
        ...notification,

        relatedTicket: ticket,

        latestIntervention: intervention,

        TypeIcon: getTypeIcon(notification.type),

        technicianName: getTicketTechnician(
          ticket,
          intervention
        ),

        serviceName: getTicketService(
          ticket,
          notification
        ),

        resolution: getResolution(
          intervention,
          notification
        ),

        observation: getObservation(
          intervention,
          notification
        ),
      };
    });
  }, [
    notifications,
    tickets,
    interventions,
  ]);

  /* ===================================================
     RECHERCHE ET FILTRES
  =================================================== */

  const filteredNotifications = useMemo(() => {
    const query = normalize(search);

    return enrichedNotifications.filter((item) => {
      const read = isNotificationRead(item);

      const matchesFilter =
        filter === "TOUTES" ||
        (filter === "NON_LUES" && !read) ||
        (filter === "LUES" && read);

      const ticket = item.relatedTicket;

      const ticketNumber =
        ticket?.numero ||
        ticket?.numero_ticket ||
        ticket?.reference ||
        "";

      const content = normalize(
        [
          getNotificationTitle(item),
          getNotificationMessage(item),
          getTypeLabel(item.type),
          ticketNumber,
          item.technicianName,
          item.serviceName,
          item.resolution.label,
          item.observation.diagnostic,
          item.observation.solution,
        ].join(" ")
      );

      return (
        matchesFilter &&
        (!query || content.includes(query))
      );
    });
  }, [
    enrichedNotifications,
    filter,
    search,
  ]);

  /* ===================================================
     PAGINATION
  =================================================== */

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredNotifications.length / pageSize
    )
  );

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedNotifications = useMemo(() => {
    const start =
      (safeCurrentPage - 1) * pageSize;

    return filteredNotifications.slice(
      start,
      start + pageSize
    );
  }, [
    filteredNotifications,
    safeCurrentPage,
  ]);

  const firstItem =
    filteredNotifications.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const lastItem = Math.min(
    safeCurrentPage * pageSize,
    filteredNotifications.length
  );

  /* ===================================================
     FILTRES
  =================================================== */

  const changeFilter = (value) => {
    setFilter(value);
    setCurrentPage(1);
  };

  const changeSearch = (event) => {
    setSearch(event.target.value);
    setCurrentPage(1);
  };

  /* ===================================================
     MARQUER UNE NOTIFICATION COMME LUE
  =================================================== */

  const markAsRead = async (notification) => {
    if (
      isNotificationRead(notification) ||
      !notification.id
    ) {
      return;
    }

    setProcessingId(notification.id);
    setError("");

    try {
      await api.patch(
        `notifications/${notification.id}/`,
        {
          lue: true,
        }
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                lue: true,
                is_read: true,
              }
            : item
        )
      );

    } catch (err) {
      setError(
        getApiErrorMessage(err)
      );

    } finally {
      setProcessingId(null);
    }
  };

  /* ===================================================
     TOUT MARQUER COMME LU
  =================================================== */

  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (item) => !isNotificationRead(item)
    );

    if (unread.length === 0) return;

    setMarkingAll(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        unread.map((item) =>
          api.patch(
            `notifications/${item.id}/`,
            {
              lue: true,
            }
          )
        )
      );

      const successfulIds = new Set(
        unread
          .filter(
            (_, index) =>
              results[index].status === "fulfilled"
          )
          .map((item) => item.id)
      );

      setNotifications((previous) =>
        previous.map((item) =>
          successfulIds.has(item.id)
            ? {
                ...item,
                lue: true,
                is_read: true,
              }
            : item
        )
      );

      if (
        results.some(
          (result) => result.status === "rejected"
        )
      ) {
        setError(
          "Certaines notifications n'ont pas pu être marquées comme lues."
        );
      }

    } finally {
      setMarkingAll(false);
    }
  };

  /* ===================================================
     RÉSOLUTION
  =================================================== */

  const ResolutionBadge = ({ resolution }) => {
    const Icon =
      resolution.type === "resolved"
        ? CircleCheck
        : resolution.type === "unresolved"
          ? CircleX
          : Clock3;

    return (
      <span
        className={`ntf-resolution ntf-resolution-${resolution.type}`}
      >
        <Icon size={15} />
        {resolution.label}
      </span>
    );
  };

  /* ===================================================
     OBSERVATION
  =================================================== */

  const Observation = ({ observation }) => (
    <div className="ntf-observation">

      <p>
        {observation.diagnostic}
      </p>

      {observation.solution && (
        <div className="ntf-solution">
          <strong>Solution :</strong>
          <span>{observation.solution}</span>
        </div>
      )}

    </div>
  );

  /* ===================================================
     AFFICHAGE PRINCIPAL
  =================================================== */

  return (
    <main className="notifications-page">

      {/* EN-TÊTE */}

      <header className="notifications-heading">

        <div className="notifications-heading-icon">
          <Bell size={25} />
        </div>

        <div className="notifications-heading-text">

          <h1>Notifications</h1>

          <p>
            Consultez les actualités et les informations liées à votre compte.
          </p>

        </div>

        <button
          type="button"
          className="notifications-refresh"
          onClick={() => loadNotifications(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "notifications-spinning"
                : ""
            }
          />

          <span>Actualiser</span>
        </button>

      </header>

      {/* STATISTIQUES */}

      <section className="notifications-summary">

        <article className="notifications-summary-card">
          <div className="notifications-summary-icon total">
            <Inbox size={21} />
          </div>

          <div>
            <span>Total</span>
            <strong>{notifications.length}</strong>
          </div>
        </article>

        <article className="notifications-summary-card">
          <div className="notifications-summary-icon unread">
            <Bell size={21} />
          </div>

          <div>
            <span>Non lues</span>
            <strong>{unreadCount}</strong>
          </div>
        </article>

        <article className="notifications-summary-card">
          <div className="notifications-summary-icon read">
            <CheckCheck size={21} />
          </div>

          <div>
            <span>Lues</span>
            <strong>{readCount}</strong>
          </div>
        </article>

      </section>

      {/* CADRE DE CONTENU */}

      <section className="notifications-content">

        {/* BARRE DU TABLEAU */}

        <div className="notifications-toolbar">

          <div>
            <h2>Tableau de suivi</h2>

            <p>
              Suivi des techniciens, des services et des résultats d'intervention.
            </p>
          </div>

          <button
            type="button"
            className="notifications-mark-all"
            onClick={markAllAsRead}
            disabled={
              unreadCount === 0 ||
              markingAll
            }
          >
            <CheckCheck size={17} />

            {markingAll
              ? "Traitement..."
              : "Tout marquer comme lu"}
          </button>

        </div>

        {/* RECHERCHE ET FILTRES */}

        <div className="notifications-controls">

          <div className="notifications-search">
            <Search size={17} />

            <input
              type="search"
              placeholder="Rechercher une notification, un ticket, un technicien..."
              value={search}
              onChange={changeSearch}
            />
          </div>

          <div className="notifications-filters">

            <button
              type="button"
              className={filter === "TOUTES" ? "active" : ""}
              onClick={() => changeFilter("TOUTES")}
            >
              Toutes
              <span>{notifications.length}</span>
            </button>

            <button
              type="button"
              className={filter === "NON_LUES" ? "active" : ""}
              onClick={() => changeFilter("NON_LUES")}
            >
              Non lues
              <span>{unreadCount}</span>
            </button>

            <button
              type="button"
              className={filter === "LUES" ? "active" : ""}
              onClick={() => changeFilter("LUES")}
            >
              Lues
              <span>{readCount}</span>
            </button>

          </div>

        </div>

        {/* ERREURS */}

        {error && (
          <div className="notifications-error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
            >
              Fermer
            </button>
          </div>
        )}

        {dataWarning && (
          <div className="notifications-warning" role="status">
            <AlertCircle size={18} />
            <span>{dataWarning}</span>
          </div>
        )}

        {/* CHARGEMENT */}

        {loading ? (
          <div className="notifications-state">
            <RefreshCw
              size={27}
              className="notifications-spinning"
            />

            <p>Chargement des notifications...</p>
          </div>

        ) : filteredNotifications.length === 0 ? (

          /* AUCUNE DONNÉE */

          <div className="notifications-state">

            <div className="notifications-empty-icon">
              <Inbox size={32} />
            </div>

            <h3>
              {search
                ? "Aucun résultat trouvé"
                : filter === "NON_LUES"
                  ? "Aucune notification non lue"
                  : filter === "LUES"
                    ? "Aucune notification lue"
                    : "Aucune notification"}
            </h3>

            <p>
              Les nouvelles notifications apparaîtront ici.
            </p>

          </div>

        ) : (

          <>

            {/* ===========================================
                TABLEAU DESKTOP / TABLETTE
            =========================================== */}

            <div className="notifications-table-wrapper">

              <table className="notifications-table">

                <colgroup>
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "25%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>Notification / Ticket</th>
                    <th>Technicien</th>
                    <th>Service</th>
                    <th>Résolution</th>
                    <th>Date</th>
                    <th>Observation</th>
                  </tr>
                </thead>

                <tbody>

                  {paginatedNotifications.map((item) => {
                    const read = isNotificationRead(item);
                    const TypeIcon = getTypeIcon(item.type);

                    const ticket = item.relatedTicket;

                    const ticketNumber =
                      ticket?.numero ||
                      ticket?.numero_ticket ||
                      ticket?.reference ||
                      (ticket?.id
                        ? `DSI-${String(ticket.id).padStart(5, "0")}`
                        : "—");

                    return (
                      <tr
                        key={item.id}
                        className={
                          read
                            ? "notification-row is-read"
                            : "notification-row is-unread"
                        }
                      >

                        {/* NOTIFICATION */}

                        <td>
                          <div className="notification-main">

                            <div className="notification-type-icon">
                              <TypeIcon size={19} />
                            </div>

                            <div className="notification-main-content">

                              <div className="notification-item-title-row">
                                <strong>
                                  {getNotificationTitle(item)}
                                </strong>

                                {!read && (
                                  <span className="notification-new-label">
                                    Nouvelle
                                  </span>
                                )}
                              </div>

                              <span className="notification-ticket-reference">
                                <Ticket size={13} />
                                {ticketNumber}
                              </span>

                              <p className="notification-message">
                                {getNotificationMessage(item)}
                              </p>

                              <div className="notification-meta">

                                <span className="notification-type-label">
                                  {getTypeLabel(item.type)}
                                </span>

                                <span className={
                                  read
                                    ? "notification-read-status read"
                                    : "notification-read-status unread"
                                }>
                                  {read ? "Lue" : "Non lue"}
                                </span>

                              </div>

                              {!read && (
                                <button
                                  type="button"
                                  className="notification-read-button"
                                  onClick={() => markAsRead(item)}
                                  disabled={processingId === item.id}
                                >
                                  <Check size={14} />

                                  {processingId === item.id
                                    ? "Traitement..."
                                    : "Marquer comme lue"}
                                </button>
                              )}

                            </div>
                          </div>
                        </td>

                        {/* TECHNICIEN */}

                        <td>
                          <div className="notification-person">

                            <span className="notification-person-icon">
                              <UserRound size={15} />
                            </span>

                            <span>
                              {item.technicianName}
                            </span>

                          </div>
                        </td>

                        {/* SERVICE */}

                        <td>
                          <span className="notification-service">
                            {item.serviceName}
                          </span>
                        </td>

                        {/* RÉSOLUTION */}

                        <td>
                          <ResolutionBadge
                            resolution={item.resolution}
                          />
                        </td>

                        {/* DATE */}

                        <td>
                          <div className="notification-date">
                            <CalendarDays size={14} />

                            <span>
                              {getNotificationDate(item)}
                            </span>
                          </div>
                        </td>

                        {/* OBSERVATION */}

                        <td>
                          <Observation
                            observation={item.observation}
                          />
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

            {/* ===========================================
                CARTES MOBILE
            =========================================== */}

            <div className="notifications-mobile-list">

              {paginatedNotifications.map((item) => {
                const read = isNotificationRead(item);
                const TypeIcon = getTypeIcon(item.type);

                const ticket = item.relatedTicket;

                const ticketNumber =
                  ticket?.numero ||
                  ticket?.numero_ticket ||
                  ticket?.reference ||
                  (ticket?.id
                    ? `DSI-${String(ticket.id).padStart(5, "0")}`
                    : "—");

                return (
                  <article
                    key={item.id}
                    className={`notification-mobile-card ${
                      read ? "is-read" : "is-unread"
                    }`}
                  >

                    <div className="notification-mobile-heading">

                      <div className="notification-type-icon">
                        <TypeIcon size={19} />
                      </div>

                      <div className="notification-mobile-title">
                        <strong>
                          {getNotificationTitle(item)}
                        </strong>

                        <span>
                          <Ticket size={13} />
                          {ticketNumber}
                        </span>
                      </div>

                      {!read && (
                        <span className="notification-new-label">
                          Nouvelle
                        </span>
                      )}

                    </div>

                    <p className="notification-mobile-message">
                      {getNotificationMessage(item)}
                    </p>

                    <div className="notification-mobile-fields">

                      <div className="notification-mobile-field">
                        <span>Technicien</span>
                        <strong>{item.technicianName}</strong>
                      </div>

                      <div className="notification-mobile-field">
                        <span>Service</span>
                        <strong>{item.serviceName}</strong>
                      </div>

                      <div className="notification-mobile-field">
                        <span>Résolution</span>
                        <ResolutionBadge
                          resolution={item.resolution}
                        />
                      </div>

                      <div className="notification-mobile-field">
                        <span>Date</span>
                        <strong>
                          {getNotificationDate(item)}
                        </strong>
                      </div>

                      <div className="notification-mobile-field observation">
                        <span>Observation</span>
                        <Observation
                          observation={item.observation}
                        />
                      </div>

                    </div>

                    <div className="notification-mobile-footer">

                      <span className="notification-type-label">
                        {getTypeLabel(item.type)}
                      </span>

                      {!read && (
                        <button
                          type="button"
                          className="notification-read-button"
                          onClick={() => markAsRead(item)}
                          disabled={processingId === item.id}
                        >
                          <Check size={14} />
                          Marquer comme lue
                        </button>
                      )}

                    </div>

                  </article>
                );
              })}

            </div>

            {/* ===========================================
                PAGINATION
            =========================================== */}

            <footer className="notifications-pagination">

              <p>
                Affichage de{" "}
                <strong>{firstItem}</strong>
                {" "}à{" "}
                <strong>{lastItem}</strong>
                {" "}sur{" "}
                <strong>{filteredNotifications.length}</strong>
                {" "}notification(s)
              </p>

              <div className="notifications-pagination-actions">

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  disabled={safeCurrentPage <= 1}
                >
                  <ChevronLeft size={16} />
                  Précédent
                </button>

                <span>
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  disabled={safeCurrentPage >= totalPages}
                >
                  Suivant
                  <ChevronRight size={16} />
                </button>

              </div>

            </footer>

          </>
        )}

      </section>

    </main>
  );
}

export default NotificationsPage;